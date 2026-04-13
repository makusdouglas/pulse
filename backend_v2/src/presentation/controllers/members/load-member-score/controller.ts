import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { GetMemberScore } from '../../../../domain/use-cases/members/get-member-score';
import { LoadMemberScoreSwagger } from './decorators';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('members')
export class LoadMemberScoreController {
  constructor(private readonly getMemberScore: GetMemberScore) {}

  @Get(':memberId/score')
  @LoadMemberScoreSwagger()
  async handle(@Req() req: Request, @Param('memberId') memberId: string) {
    const gymId = (req as any).gymUuid;
    const score = await this.getMemberScore.execute(gymId, memberId);
    if (!score) return { error: 'Member not found or no features available' };
    return {
      score: score.score,
      tier: score.tier,
      reasons: score.reasons,
      signals: score.signals,
      computed_at: new Date().toISOString().split('T')[0],
    };
  }
}
