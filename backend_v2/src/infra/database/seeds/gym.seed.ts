import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISeed, SeedResult } from './seed.interface';
import { GymEntity } from '../entities/gym.entity';
import { ENV } from '../../config/env';

const CLERK_BASE = 'https://api.clerk.com/v1';

interface ClerkOrg {
  id: string;
  name: string;
  slug: string | null;
}

interface ClerkListResponse {
  data: ClerkOrg[];
}

@Injectable()
export class GymSeed implements ISeed {
  readonly name = 'GymSeed';
  readonly order = 20;

  private readonly logger = new Logger(GymSeed.name);

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

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };

    const orgs = await this.fetchClerkOrgs(headers);

    if (orgs.length === 0) {
      this.logger.warn('No organizations found in Clerk. Run ClerkSeed first.');
      return {
        created: 0,
        skipped: 0,
        updated: 0,
        errors: ['No Clerk orgs found'],
      };
    }

    this.logger.log(`Found ${orgs.length} Clerk organization(s)`);

    let created = 0;
    let updated = 0;

    for (const org of orgs) {
      const slug = org.slug || this.slugify(org.name);

      const result = await this.gymRepo
        .createQueryBuilder()
        .insert()
        .into(GymEntity)
        .values({ clerkOrgId: org.id, name: org.name, slug })
        .orUpdate(['name', 'slug', 'updated_at'], ['clerk_org_id'])
        .returning(['id', '(xmax = 0) AS inserted'])
        .execute();

      const row = (result.raw as { id: string; inserted: boolean }[])[0];
      if (row?.inserted) {
        created++;
        this.logger.log(`  CREATED ${org.name} (${org.id}) -> ${row.id}`);
      } else {
        updated++;
        this.logger.log(
          `  UPDATED ${org.name} (${org.id}) -> ${row?.id ?? 'unknown'}`,
        );
      }
    }

    this.logger.log(
      `Summary — ${created} created, ${updated} updated, ${orgs.length} total`,
    );

    return { created, skipped: 0, updated, errors: [] };
  }

  private async fetchClerkOrgs(
    headers: Record<string, string>,
  ): Promise<ClerkOrg[]> {
    const orgs: ClerkOrg[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `${CLERK_BASE}/organizations?limit=${limit}&offset=${offset}`,
        { headers },
      );

      if (!res.ok) {
        this.logger.error(`Failed to fetch Clerk orgs: ${res.status}`);
        return orgs;
      }

      const body = (await res.json()) as ClerkListResponse;
      const data: ClerkOrg[] = body.data ?? [];
      orgs.push(...data);

      if (data.length < limit) break;
      offset += limit;
    }

    return orgs;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
