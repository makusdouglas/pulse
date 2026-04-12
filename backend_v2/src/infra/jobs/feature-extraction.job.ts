import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GymRepository } from '../../data/protocols/gym-repository';
import { FeatureRepository } from '../../data/protocols/feature-repository';

@Injectable()
export class FeatureExtractionJob {
  private readonly logger = new Logger(FeatureExtractionJob.name);

  constructor(
    private readonly gymRepo: GymRepository,
    private readonly featureRepo: FeatureRepository,
  ) {}

  @Cron('30 2 * * *', { name: 'feature-extraction', timeZone: 'America/Sao_Paulo' })
  async handleCron(): Promise<void> {
    this.logger.log('Starting daily feature extraction for all gyms...');
    await this.execute();
  }

  async execute(): Promise<{
    gymsProcessed: number;
    totalMembers: number;
    perGym: Record<string, number>;
  }> {
    const gymIds = await this.gymRepo.findAllIds();
    let totalMembers = 0;
    const perGym: Record<string, number> = {};

    for (const gymId of gymIds) {
      try {
        const features = await this.featureRepo.extractAll(gymId);

        for (const f of features) {
          await this.featureRepo.upsert({
            memberId: f.memberId,
            gymId: f.gymId,
            daysWithoutCheckin: f.daysWithoutCheckin,
            freqLast30d: f.freqLast30d,
            freqPrev30d: f.freqPrev30d,
            freqTrend: f.freqTrend,
            avgDurationMin: f.avgDurationMin,
            overduePayments: f.overduePayments,
            monthsEnrolled: f.monthsEnrolled,
          });
        }

        perGym[gymId] = features.length;
        totalMembers += features.length;

        this.logger.log(
          `Extracted features for ${features.length} members in gym ${gymId}`,
        );
      } catch (error) {
        this.logger.error(
          `Feature extraction failed for gym ${gymId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(
      `Feature extraction complete: ${gymIds.length} gyms, ${totalMembers} members`,
    );

    return { gymsProcessed: gymIds.length, totalMembers, perGym };
  }
}
