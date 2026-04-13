import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { MemberRepository } from '../../../data/protocols/member-repository';
import { ScoreRepository } from '../../../data/protocols/score-repository';
import { FeatureRepository } from '../../../data/protocols/feature-repository';
import { CalculateScore } from '../../../domain/use-cases/scoring/calculate-score';
import { ListMembersRequest } from './dto/list-members.request';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('members')
export class MembersController {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly scoreRepo: ScoreRepository,
    private readonly featureRepo: FeatureRepository,
    private readonly calculateScore: CalculateScore,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List members' })
  @ApiResponse({ status: 200, description: 'Paginated list of members' })
  async list(@Req() req: Request, @Query() query: ListMembersRequest) {
    const gymId = (req as any).gymUuid;
    const { members, total } = await this.memberRepo.findByGym({
      gymId,
      page: query.page ?? 1,
      pageSize: query.page_size ?? 20,
      search: query.search,
      status: query.status,
    });
    return {
      members,
      total,
      page: query.page ?? 1,
      page_size: query.page_size ?? 20,
    };
  }

  @Get(':memberId/score')
  @ApiOperation({ summary: 'Get member score (on-demand)' })
  @ApiResponse({ status: 200, description: 'Member score with signals' })
  async getScore(@Req() req: Request, @Param('memberId') memberId: string) {
    const gymId = (req as any).gymUuid;
    const member = await this.memberRepo.findById(gymId, memberId);
    if (!member) return { error: 'Member not found' };

    const features = await this.featureRepo.extractOne(gymId, memberId);
    if (!features) return { error: 'No features available for this member' };

    const score = this.calculateScore.execute(features);

    await this.scoreRepo.upsert({
      memberId,
      gymId,
      score: score.score,
      tier: score.tier,
      reasons: score.reasons,
      origin: 'rules',
    });

    return {
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        status: member.status,
      },
      score: score.score,
      tier: score.tier,
      reasons: score.reasons,
      signals: score.signals,
      computed_at: new Date().toISOString().split('T')[0],
    };
  }
}
