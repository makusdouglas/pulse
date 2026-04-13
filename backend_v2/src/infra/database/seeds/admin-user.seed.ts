import { Injectable, Logger } from '@nestjs/common';
import { ISeed, SeedResult } from './seed.interface';
import * as seedData from './data/admin-users.json';

@Injectable()
export class AdminUserSeed implements ISeed {
  readonly name = 'AdminUserSeed';
  readonly order = 30;

  private readonly logger = new Logger(AdminUserSeed.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async run(): Promise<SeedResult> {
    const count = seedData.admin_users.length;

    this.logger.warn(
      `Skipped — AdminUserEntity not yet created. ${count} admin user(s) pending.`,
    );

    return { created: 0, skipped: count, updated: 0, errors: [] };
  }
}
