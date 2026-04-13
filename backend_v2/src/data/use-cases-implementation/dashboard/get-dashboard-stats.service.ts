import { Injectable } from '@nestjs/common';
import {
  GetDashboardStats,
  DashboardStats,
} from '../../../domain/use-cases/dashboard/get-dashboard-stats';
import { MemberRepository } from '../../protocols/member-repository';
import { ScoreRepository } from '../../protocols/score-repository';

@Injectable()
export class GetDashboardStatsService implements GetDashboardStats {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly scoreRepo: ScoreRepository,
  ) {}

  async execute(gymId: string): Promise<DashboardStats> {
    const [totalResult, activeResult, tierCounts, avgScore, recentScores] =
      await Promise.all([
        this.memberRepo.findByGym({ gymId, page: 1, pageSize: 1 }),
        this.memberRepo.findByGym({
          gymId,
          page: 1,
          pageSize: 1,
          status: 'active' as any,
        }),
        this.scoreRepo.getTierCounts(gymId),
        this.scoreRepo.getAvgScore(gymId),
        this.scoreRepo.getRecentScores(gymId, 10),
      ]);

    const atRiskCount = tierCounts.critical + tierCounts.medium;

    return {
      totalMembers: totalResult.total,
      activeMembers: activeResult.total,
      atRiskCount,
      tierCounts,
      avgScore,
      recentScores,
    };
  }
}
