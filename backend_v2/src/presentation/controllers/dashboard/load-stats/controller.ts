import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { GetDashboardStats } from '../../../../domain/use-cases/dashboard/get-dashboard-stats';
import { LoadStatsSwagger } from './decorators';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('dashboard')
export class LoadStatsController {
  constructor(private readonly getDashboardStats: GetDashboardStats) {}

  @Get('stats')
  @LoadStatsSwagger()
  async handle(@Req() req: Request) {
    const gymId = (req as any).gymUuid;
    const stats = await this.getDashboardStats.execute(gymId);
    return {
      total_members: stats.totalMembers,
      active_members: stats.activeMembers,
      at_risk_count: stats.atRiskCount,
      tier_counts: stats.tierCounts,
      avg_score: stats.avgScore,
      recent_scores: stats.recentScores.map((s) => ({
        member_id: s.memberId,
        member_name: s.memberName,
        score: s.score,
        tier: s.tier,
      })),
    };
  }
}
