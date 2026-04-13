import { Injectable } from '@nestjs/common';
import {
  ListAtRisk,
  ListAtRiskResponse,
} from '../../../domain/use-cases/risk/list-at-risk';
import { Tier } from '../../../domain/enums';
import { ScoreRepository } from '../../protocols/score-repository';

@Injectable()
export class ListAtRiskService implements ListAtRisk {
  constructor(private readonly scoreRepo: ScoreRepository) {}

  async execute(
    gymId: string,
    filters: { tier?: Tier; page?: number; pageSize?: number },
  ): Promise<ListAtRiskResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const [result, tierCounts] = await Promise.all([
      this.scoreRepo.findByGymWithTier(gymId, filters.tier, page, pageSize),
      this.scoreRepo.getTierCounts(gymId),
    ]);

    return {
      members: result.scores.map((s) => ({
        memberId: s.memberId,
        memberName: s.memberName,
        memberEmail: s.memberEmail,
        score: s.score,
        tier: s.tier,
        reasons: s.reasons,
        computedAt: s.computedAt,
      })),
      total: result.total,
      page,
      pageSize,
      tierCounts,
    };
  }
}
