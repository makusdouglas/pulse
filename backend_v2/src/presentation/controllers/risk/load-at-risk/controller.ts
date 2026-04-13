import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListAtRisk } from '../../../../domain/use-cases/risk/list-at-risk';
import { LoadAtRiskSwagger } from './decorators';
import { LoadAtRiskRequest } from './request';

@ApiTags('At-Risk')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('at-risk')
export class LoadAtRiskController {
  constructor(private readonly listAtRisk: ListAtRisk) {}

  @Get()
  @LoadAtRiskSwagger()
  async handle(@Req() req: Request, @Query() query: LoadAtRiskRequest) {
    const gymId = (req as any).gymUuid;
    const result = await this.listAtRisk.execute(gymId, {
      tier: query.tier,
      page: query.page,
      pageSize: query.page_size,
    });
    return {
      members: result.members.map((m) => ({
        member_id: m.memberId,
        member_name: m.memberName,
        member_email: m.memberEmail,
        score: m.score,
        tier: m.tier,
        reasons: m.reasons,
        computed_at: m.computedAt,
      })),
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
      tier_counts: result.tierCounts,
    };
  }
}
