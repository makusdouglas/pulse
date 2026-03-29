/**
 * Seed script: syncs Clerk organizations → local gyms table.
 * Idempotent — safe to run multiple times.
 *
 * Reads CLERK_SECRET_KEY from .env.backend and DATABASE_URL from .env.shared
 * (relative to project root). Env vars override file values.
 *
 * Usage:
 *   make seed-db
 */

// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// ---------------------------------------------------------------------------
// Env loading — reads .env files from project root
// ---------------------------------------------------------------------------

function loadEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return vars;
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    vars[key] = val;
  }
  return vars;
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const envBackend = loadEnvFile(path.join(projectRoot, ".env.backend"));
const envShared = loadEnvFile(path.join(projectRoot, ".env.shared"));

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || envBackend.CLERK_SECRET_KEY;
const rawDbUrl =
  process.env.DATABASE_URL ||
  envShared.DATABASE_URL ||
  "postgresql://churn:churn123@localhost:5432/churndb";
// When running outside Docker, replace container hostname with 127.0.0.1
const DATABASE_URL = rawDbUrl.replace(/@db:/, "@127.0.0.1:");

if (!CLERK_SECRET_KEY || CLERK_SECRET_KEY.includes("placeholder")) {
  console.error("❌  CLERK_SECRET_KEY not set. Export it or check .env.backend");
  process.exit(1);
}

const CLERK_BASE = "https://api.clerk.com/v1";
const clerkHeaders = {
  Authorization: `Bearer ${CLERK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ClerkOrg {
  id: string;
  name: string;
  slug: string | null;
}

async function fetchClerkOrgs(): Promise<ClerkOrg[]> {
  const orgs: ClerkOrg[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${CLERK_BASE}/organizations?limit=${limit}&offset=${offset}`,
      { headers: clerkHeaders }
    );
    if (!res.ok) {
      console.error("❌  Failed to fetch Clerk orgs:", res.status, await res.text());
      process.exit(1);
    }
    const body = await res.json();
    const data: ClerkOrg[] = body.data ?? [];
    orgs.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return orgs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔍  Fetching organizations from Clerk...");
  const orgs = await fetchClerkOrgs();

  if (orgs.length === 0) {
    console.log("⚠️  No organizations found in Clerk. Run seed-clerk.ts first.");
    return;
  }

  console.log(`   Found ${orgs.length} organization(s)\n`);

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  let created = 0;
  let updated = 0;

  try {
    for (const org of orgs) {
      const slug = org.slug || slugify(org.name);

      const result = await client.query(
        `INSERT INTO gyms (clerk_org_id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (clerk_org_id) DO UPDATE
           SET name = EXCLUDED.name,
               slug = EXCLUDED.slug,
               updated_at = now()
         RETURNING id::text, (xmax = 0) AS inserted`,
        [org.id, org.name, slug]
      );

      const row = result.rows[0];
      if (row.inserted) {
        created++;
        console.log(`  ✅  CREATED  ${org.name} (${org.id}) → ${row.id}`);
      } else {
        updated++;
        console.log(`  ♻️  UPDATED  ${org.name} (${org.id}) → ${row.id}`);
      }
    }
  } finally {
    await client.end();
  }

  console.log(`\n📋  Summary: ${created} created, ${updated} updated, ${orgs.length} total`);
}

main();
