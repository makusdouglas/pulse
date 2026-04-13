import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISeed, SeedResult } from './seed.interface';
import { GymEntity } from '../entities/gym.entity';
import { ENV } from '../../config/env';
import * as seedData from './data/organizations.json';

const CLERK_BASE = 'https://api.clerk.com/v1';

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

interface ClerkError {
  code: string;
  message: string;
}

interface ClerkUserResponse {
  id: string;
}

interface ClerkOrgResponse {
  id: string;
  name: string;
  slug: string | null;
}

interface ClerkMembership {
  public_user_data?: { user_id: string };
}

interface ClerkListResponse<T> {
  data: T[];
}

@Injectable()
export class ClerkSeed implements ISeed {
  readonly name = 'ClerkSeed';
  readonly order = 10;

  private readonly logger = new Logger(ClerkSeed.name);
  private headers: Record<string, string>;

  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepo: Repository<GymEntity>,
  ) {}

  async run(): Promise<SeedResult> {
    const secretKey = ENV.CLERK_SECRET_KEY;

    if (!secretKey || secretKey.includes('placeholder')) {
      this.logger.warn('CLERK_SECRET_KEY not set — skipping');
      return {
        created: 0,
        skipped: 0,
        updated: 0,
        errors: ['CLERK_SECRET_KEY not set'],
      };
    }

    this.headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };

    const organizations: SeedOrg[] = seedData.organizations;
    const stats = {
      orgsCreated: 0,
      orgsExisted: 0,
      usersCreated: 0,
      usersExisted: 0,
      membershipsCreated: 0,
      gymsSynced: 0,
    };

    for (const org of organizations) {
      this.logger.log(`Processing org: ${org.name}`);

      const adminUser = org.users.find((u) => u.role === 'org:admin')!;
      const creator = await this.getOrCreateUser(adminUser);
      if (creator.created) {
        stats.usersCreated++;
      } else {
        stats.usersExisted++;
      }

      const orgResult = await this.getOrCreateOrg(org, creator.id);
      if (orgResult.created) {
        stats.orgsCreated++;
      } else {
        stats.orgsExisted++;
      }

      // Sync org to local gyms table (idempotent upsert)
      await this.syncOrgToDb(orgResult.id, org.name, org.slug);
      stats.gymsSynced++;

      let orgFull = false;
      for (const user of org.users) {
        const userResult = await this.getOrCreateUser(user);

        if (userResult.created) {
          stats.usersCreated++;
        } else if (user.email !== adminUser.email) {
          stats.usersExisted++;
        }

        const alreadyMember = await this.isOrgMember(
          orgResult.id,
          userResult.id,
        );
        if (!alreadyMember) {
          if (orgFull) {
            this.logger.log(`  Skipped (org full): ${user.email}`);
            continue;
          }
          try {
            await this.clerkPost(`/organizations/${orgResult.id}/memberships`, {
              user_id: userResult.id,
              role: user.role,
            });
            stats.membershipsCreated++;
            this.logger.log(`  Added ${user.role}: ${user.email}`);
          } catch (err) {
            if (
              err instanceof Error &&
              err.message.includes('quota_exceeded')
            ) {
              orgFull = true;
              this.logger.warn(
                '  Org full (max 5 members) — skipping remaining',
              );
            } else {
              throw err;
            }
          }
        }
      }
    }

    this.logger.log(
      `Summary — Orgs: ${stats.orgsCreated} created / ${stats.orgsExisted} existed | ` +
        `Users: ${stats.usersCreated} created / ${stats.usersExisted} existed | ` +
        `Memberships: ${stats.membershipsCreated} added | ` +
        `Gyms synced: ${stats.gymsSynced}`,
    );

    return {
      created:
        stats.orgsCreated + stats.usersCreated + stats.membershipsCreated,
      skipped: stats.orgsExisted + stats.usersExisted,
      updated: stats.gymsSynced,
      errors: [],
    };
  }

  private async syncOrgToDb(
    clerkOrgId: string,
    name: string,
    slug: string,
  ): Promise<void> {
    await this.gymRepo
      .createQueryBuilder()
      .insert()
      .into(GymEntity)
      .values({ clerkOrgId, name, slug })
      .orUpdate(['name', 'slug', 'updated_at'], ['clerk_org_id'])
      .execute();

    this.logger.log(`  Synced gym: ${name} (${clerkOrgId})`);
  }

  private async clerkGet<T>(path: string): Promise<T | null> {
    const res = await fetch(`${CLERK_BASE}${path}`, { headers: this.headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  }

  private async clerkPost(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ClerkUserResponse | null> {
    const res = await fetch(`${CLERK_BASE}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as
      | ClerkUserResponse
      | { errors: ClerkError[] };

    if (!res.ok) {
      const errBody = data as { errors: ClerkError[] };
      const err = errBody.errors?.[0];
      if (
        err?.code === 'form_identifier_exists' ||
        err?.code === 'duplicate_record'
      ) {
        return null;
      }
      if (err?.code === 'organization_membership_quota_exceeded') {
        throw new Error('organization_membership_quota_exceeded');
      }
      this.logger.error(`Clerk API error ${path}: ${JSON.stringify(data)}`);
      return null;
    }
    return data as ClerkUserResponse;
  }

  private async findUserByEmail(email: string): Promise<string | null> {
    const data = await this.clerkGet<ClerkUserResponse[]>(
      `/users?email_address=${encodeURIComponent(email)}`,
    );
    if (data && data.length > 0) return data[0].id;
    return null;
  }

  private async findOrgByName(name: string): Promise<string | null> {
    const data = await this.clerkGet<ClerkListResponse<ClerkOrgResponse>>(
      `/organizations?query=${encodeURIComponent(name)}&limit=100`,
    );
    if (data?.data) {
      const match = data.data.find((o) => o.name === name);
      if (match) return match.id;
    }
    return null;
  }

  private async isOrgMember(orgId: string, userId: string): Promise<boolean> {
    const data = await this.clerkGet<ClerkListResponse<ClerkMembership>>(
      `/organizations/${orgId}/memberships?limit=100`,
    );
    if (data?.data) {
      return data.data.some((m) => m.public_user_data?.user_id === userId);
    }
    return false;
  }

  private async getOrCreateUser(
    user: SeedUser,
  ): Promise<{ id: string; created: boolean }> {
    const existingId = await this.findUserByEmail(user.email);
    if (existingId) return { id: existingId, created: false };

    const result = await this.clerkPost('/users', {
      email_address: [user.email],
      password: user.password,
      first_name: user.first_name,
      last_name: user.last_name,
      skip_password_checks: true,
    });

    if (!result) {
      const retryId = await this.findUserByEmail(user.email);
      if (retryId) return { id: retryId, created: false };
      throw new Error(`Failed to create user ${user.email}`);
    }

    return { id: result.id, created: true };
  }

  private async getOrCreateOrg(
    org: SeedOrg,
    creatorId: string,
  ): Promise<{ id: string; created: boolean }> {
    const existingId = await this.findOrgByName(org.name);
    if (existingId) return { id: existingId, created: false };

    const result = await this.clerkPost('/organizations', {
      name: org.name,
      created_by: creatorId,
    });

    if (!result) {
      const retryId = await this.findOrgByName(org.name);
      if (retryId) return { id: retryId, created: false };
      throw new Error(`Failed to create org ${org.name}`);
    }

    return { id: result.id, created: true };
  }
}
