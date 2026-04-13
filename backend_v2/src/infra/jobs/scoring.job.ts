import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GymRepository } from '../../data/protocols/gym-repository';
import { FeatureRepository } from '../../data/protocols/feature-repository';
import { ScoreRepository } from '../../data/protocols/score-repository';
import { CalculateScore } from '../../domain/use-cases/scoring/calculate-score';
import { Tier } from '../../domain/enums';

@Injectable()
export class ScoringJob {
  private readonly logger = new Logger(ScoringJob.name);

  constructor(
    private readonly gymRepo: GymRepository,
    private readonly featureRepo: FeatureRepository,
    private readonly scoreRepo: ScoreRepository,
    private readonly calculateScore: CalculateScore,
  ) {}

  @Cron('0 3 * * *', { name: 'scoring', timeZone: 'America/Sao_Paulo' })
  async handleCron(): Promise<void> {
    this.logger.log('Starting daily scoring for all gyms...');
    await this.execute();
  }

  async execute(): Promise<{
    gymsProcessed: number;
    totalScored: number;
    tierCounts: Record<string, number>;
    perGym: Record<string, number>;
  }> {
    const gymIds = await this.gymRepo.findAllIds();
    let totalScored = 0;
    const tierCounts: Record<string, number> = {
      critical: 0,
      medium: 0,
      low: 0,
      safe: 0,
    };
    const perGym: Record<string, number> = {};

    for (const gymId of gymIds) {
      try {
        const allFeatures = await this.featureRepo.extractAll(gymId);

        for (const features of allFeatures) {
          const result = this.calculateScore.execute(features);

          await this.scoreRepo.upsert({
            memberId: result.memberId,
            gymId,
            score: result.score,
            tier: result.tier,
            reasons: result.reasons,
            origin: 'rules',
          });

          tierCounts[result.tier] = (tierCounts[result.tier] ?? 0) + 1;
        }

        perGym[gymId] = allFeatures.length;
        totalScored += allFeatures.length;

        this.logger.log(`Scored ${allFeatures.length} members in gym ${gymId}`);
      } catch (error) {
        this.logger.error(
          `Scoring failed for gym ${gymId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(
      `Scoring complete: ${gymIds.length} gyms, ${totalScored} members — ${JSON.stringify(tierCounts)}`,
    );

    return { gymsProcessed: gymIds.length, totalScored, tierCounts, perGym };
  }
}
