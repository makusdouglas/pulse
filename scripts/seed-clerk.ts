/**
 * Seed script: creates organizations + users in Clerk from seeds-organizations.json.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_test_... npx tsx scripts/seed-clerk.ts
 *
 * Or load from .env.backend:
 *   export $(grep CLERK_SECRET_KEY .env.backend) && npx tsx scripts/seed-clerk.ts
 */

// @ts-nocheck

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY || CLERK_SECRET_KEY.includes("placeholder")) {
  console.error("❌  CLERK_SECRET_KEY not set. Export it or check .env.backend");
  process.exit(1);
}

const BASE = "https://api.clerk.com/v1";

const headers = {
  Authorization: `Bearer ${CLERK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

interface SeedUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface SeedOrg {
  name: string;
  slug: string;
  users: SeedUser[];
}

interface SeedData {
  organizations: SeedOrg[];
}

async function clerkGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

class ClerkApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function clerkPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = data.errors?.[0];
    if (err?.code === "form_identifier_exists" || err?.code === "duplicate_record") {
      return null;
    }
    if (err?.code === "organization_membership_quota_exceeded") {
      throw new ClerkApiError(err.code, "Membership quota exceeded (max 5)");
    }
    console.error(`❌  ${path}:`, JSON.stringify(data, null, 2));
    return null;
  }
  return data;
}

async function findUserByEmail(email: string): Promise<string | null> {
  const data = await clerkGet(`/users?email_address=${encodeURIComponent(email)}`);
  if (data && data.length > 0) return data[0].id;
  return null;
}

async function findOrgByName(name: string): Promise<string | null> {
  const data = await clerkGet(`/organizations?query=${encodeURIComponent(name)}&limit=100`);
  if (data?.data) {
    const match = data.data.find((o: any) => o.name === name);
    if (match) return match.id;
  }
  return null;
}

async function isOrgMember(orgId: string, userId: string): Promise<boolean> {
  const data = await clerkGet(`/organizations/${orgId}/memberships?limit=100`);
  if (data?.data) {
    return data.data.some((m: any) => m.public_user_data?.user_id === userId);
  }
  return false;
}

async function getOrCreateUser(user: SeedUser): Promise<{ id: string; created: boolean }> {
  const existingId = await findUserByEmail(user.email);
  if (existingId) return { id: existingId, created: false };

  const result = await clerkPost("/users", {
    email_address: [user.email],
    password: user.password,
    first_name: user.first_name,
    last_name: user.last_name,
    skip_password_checks: true,
  });

  if (!result) {
    // Double-check — might have been created between check and create
    const retryId = await findUserByEmail(user.email);
    if (retryId) return { id: retryId, created: false };
    throw new Error(`Failed to create user ${user.email}`);
  }

  return { id: result.id, created: true };
}

async function getOrCreateOrg(org: SeedOrg, creatorId: string): Promise<{ id: string; created: boolean }> {
  const existingId = await findOrgByName(org.name);
  if (existingId) return { id: existingId, created: false };

  const result = await clerkPost("/organizations", {
    name: org.name,
    created_by: creatorId,
  });

  if (!result) {
    const retryId = await findOrgByName(org.name);
    if (retryId) return { id: retryId, created: false };
    throw new Error(`Failed to create org ${org.name}`);
  }

  return { id: result.id, created: true };
}

async function main() {
  const seedPath = new URL("./seeds-organizations.json", import.meta.url);
  const fs = await import("node:fs");
  const seedData: SeedData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  let stats = { orgsCreated: 0, orgsExisted: 0, usersCreated: 0, usersExisted: 0, membershipsCreated: 0 };

  for (const org of seedData.organizations) {
    console.log(`\n🏢  ${org.name}`);

    // Ensure creator (first admin) exists
    const adminUser = org.users.find((u) => u.role === "org:admin")!;
    const creator = await getOrCreateUser(adminUser);
    console.log(`   ${creator.created ? "✅  Created" : "♻️  Exists"} creator: ${adminUser.email}`);
    creator.created ? stats.usersCreated++ : stats.usersExisted++;

    // Ensure org exists
    const orgResult = await getOrCreateOrg(org, creator.id);
    console.log(`   ${orgResult.created ? "✅  Created" : "♻️  Exists"} org: ${org.name} (${orgResult.id})`);
    orgResult.created ? stats.orgsCreated++ : stats.orgsExisted++;

    // Ensure all users exist and are members
    let orgFull = false;
    for (const user of org.users) {
      const userResult = await getOrCreateUser(user);
      const label = user.role === "org:admin" ? "Admin" : "Member";

      if (userResult.created) {
        stats.usersCreated++;
      } else if (user.email !== adminUser.email) {
        stats.usersExisted++;
      }

      // Check membership
      const alreadyMember = await isOrgMember(orgResult.id, userResult.id);
      if (!alreadyMember) {
        if (orgFull) {
          console.log(`   ⏭️  Skipped (org full): ${user.email}`);
          continue;
        }
        try {
          await clerkPost(`/organizations/${orgResult.id}/memberships`, {
            user_id: userResult.id,
            role: user.role,
          });
          stats.membershipsCreated++;
          console.log(`   ✅  Added ${label}: ${user.email}`);
        } catch (err) {
          if (err instanceof ClerkApiError && err.code === "organization_membership_quota_exceeded") {
            orgFull = true;
            console.log(`   ⚠️  Org full (max 5 members) — skipping remaining users`);
          } else {
            throw err;
          }
        }
      } else if (user.email !== adminUser.email) {
        console.log(`   ♻️  Already member: ${user.email}`);
      }
    }
  }

  console.log(`\n📋  Summary:`);
  console.log(`    Orgs:        ${stats.orgsCreated} created, ${stats.orgsExisted} already existed`);
  console.log(`    Users:       ${stats.usersCreated} created, ${stats.usersExisted} already existed`);
  console.log(`    Memberships: ${stats.membershipsCreated} added`);
  console.log(`    Password:    Pulse@2024 (all users)`);
  console.log(`\n🚀  Login at http://localhost:3000/sign-in`);
}

main();
