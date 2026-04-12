import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { MemberRepository } from '../../../data/protocols/member-repository';
import { ScoreRepository } from '../../../data/protocols/score-repository';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly scoreRepo: ScoreRepository,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats(@Req() req: Request) {
    const gymId = (req as any).gymUuid;

    const [totalResult, activeResult, tierCounts, avgScore, recentScores] =
      await Promise.all([
        this.memberRepo.findByGym({ gymId, page: 1, pageSize: 1 }),
        this.memberRepo.findByGym({ gymId, page: 1, pageSize: 1, status: 'active' as any }),
        this.scoreRepo.getTierCounts(gymId),
        this.scoreRepo.getAvgScore(gymId),
        this.scoreRepo.getRecentScores(gymId, 10),
      ]);

    const atRiskCount = tierCounts.critical + tierCounts.medium;

    return {
      total_members: totalResult.total,
      active_members: activeResult.total,
      at_risk_count: atRiskCount,
      tier_counts: tierCounts,
      avg_score: avgScore,
      recent_scores: recentScores.map((s) => ({
        member_id: s.memberId,
        member_name: s.memberName,
        score: s.score,
        tier: s.tier,
      })),
    };
  }
}
