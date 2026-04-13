import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ISeed, SeedResult } from './seed.interface';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { ENV } from '../../config/env';
import * as seedData from './data/admin-users.json';

@Injectable()
export class AdminUserSeed implements ISeed {
  readonly name = 'AdminUserSeed';
  readonly order = 30;

  private readonly logger = new Logger(AdminUserSeed.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly repo: Repository<AdminUserEntity>,
  ) {}

  async run(): Promise<SeedResult> {
    const password = ENV.ADMIN_SEED_PASSWORD;

    if (!password) {
      this.logger.warn(
        'Skipped — ADMIN_SEED_PASSWORD env var not set. Set it in .env to seed admin users.',
      );
      return {
        created: 0,
        skipped: seedData.admin_users.length,
        updated: 0,
        errors: [],
      };
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const passwordHash = await bcrypt.hash(password, 12);

    for (const u of seedData.admin_users) {
      try {
        const exists = await this.repo.findOne({ where: { email: u.email } });
        if (exists) {
          this.logger.log(`  SKIPPED ${u.email} (already exists)`);
          skipped++;
          continue;
        }

        await this.repo.save({
          email: u.email,
          passwordHash,
          name: u.name,
          role: u.role,
          isActive: true,
        });
        this.logger.log(`  CREATED ${u.email} (${u.role})`);
        created++;
      } catch (err) {
        const msg = `Failed to seed ${u.email}: ${(err as Error).message}`;
        this.logger.error(msg);
        errors.push(msg);
      }
    }

    return { created, skipped, updated: 0, errors };
  }
}
