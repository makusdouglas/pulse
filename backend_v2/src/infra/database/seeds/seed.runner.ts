import { Injectable, Logger } from '@nestjs/common';
import { ISeed, SeedResult } from './seed.interface';
import { ClerkSeed } from './clerk.seed';
import { GymSeed } from './gym.seed';
import { AdminUserSeed } from './admin-user.seed';
import { MemberSeed } from './member.seed';

@Injectable()
export class SeedRunner {
  private readonly logger = new Logger(SeedRunner.name);

  private readonly seeds: ISeed[];

  constructor(
    private readonly clerkSeed: ClerkSeed,
    private readonly gymSeed: GymSeed,
    private readonly adminUserSeed: AdminUserSeed,
    private readonly memberSeed: MemberSeed,
  ) {
    this.seeds = [
      this.clerkSeed,
      this.gymSeed,
      this.adminUserSeed,
      this.memberSeed,
    ].sort((a, b) => a.order - b.order);
  }

  async execute(only?: string[]): Promise<void> {
    const toRun = only
      ? this.seeds.filter((s) =>
          only.includes(s.name.replace('Seed', '').toLowerCase()),
        )
      : this.seeds;

    if (toRun.length === 0) {
      this.logger.warn('No seeds matched the --only filter');
      return;
    }

    this.logger.log(
      `Running ${toRun.length} seed(s): ${toRun.map((s) => s.name).join(', ')}`,
    );

    const results: Array<{ name: string; result: SeedResult }> = [];

    for (const seed of toRun) {
      this.logger.log(`\n--- ${seed.name} (order: ${seed.order}) ---`);

      try {
        const result = await seed.run();
        results.push({ name: seed.name, result });
        this.logger.log(
          `${seed.name} done — created: ${result.created}, skipped: ${result.skipped}, updated: ${result.updated}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`${seed.name} FAILED: ${message}`);
        results.push({
          name: seed.name,
          result: { created: 0, skipped: 0, updated: 0, errors: [message] },
        });
      }
    }

    this.logger.log('\n========== SEED SUMMARY ==========');
    for (const { name, result } of results) {
      const status = result.errors.length > 0 ? 'FAILED' : 'OK';
      this.logger.log(
        `  ${name}: ${status} | created: ${result.created} | skipped: ${result.skipped} | updated: ${result.updated}`,
      );
    }
    this.logger.log('==================================');
  }
}
