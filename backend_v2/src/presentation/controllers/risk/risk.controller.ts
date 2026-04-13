import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { ScoreRepository } from '../../../data/protocols/score-repository';
import { Tier } from '../../../domain/enums';
import { PaginationQuery } from '../../../shared/pagination.dto';

class ListAtRiskRequest extends PaginationQuery {
  @ApiPropertyOptional({ enum: Tier })
  @IsOptional()
  @IsEnum(Tier)
  tier?: Tier;
}

@ApiTags('At-Risk')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('at-risk')
export class RiskController {
  constructor(private readonly scoreRepo: ScoreRepository) {}

  @Get()
  @ApiOperation({ summary: 'List at-risk members' })
  @ApiResponse({ status: 200, description: 'Paginated at-risk members' })
  async list(@Req() req: Request, @Query() query: ListAtRiskRequest) {
    const gymId = (req as any).gymUuid;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;

    const [result, tierCounts] = await Promise.all([
      this.scoreRepo.findByGymWithTier(gymId, query.tier, page, pageSize),
      this.scoreRepo.getTierCounts(gymId),
    ]);

    return {
      members: result.scores.map((s) => ({
        member_id: s.memberId,
        member_name: s.memberName,
        member_email: s.memberEmail,
        score: s.score,
        tier: s.tier,
        reasons: s.reasons,
        computed_at: s.computedAt,
      })),
      total: result.total,
      page,
      page_size: pageSize,
      tier_counts: tierCounts,
    };
  }
}
