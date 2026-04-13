import { Injectable } from '@nestjs/common';
import { GetMemberScore } from '../../../domain/use-cases/members/get-member-score';
import { ChurnScore } from '../../../domain/entities';
import { MemberRepository } from '../../protocols/member-repository';
import { FeatureRepository } from '../../protocols/feature-repository';
import { ScoreRepository } from '../../protocols/score-repository';
import { CalculateScore } from '../../../domain/use-cases/scoring/calculate-score';

@Injectable()
export class GetMemberScoreService implements GetMemberScore {
  constructor(
    private readonly memberRepo: MemberRepository,
    private readonly featureRepo: FeatureRepository,
    private readonly scoreRepo: ScoreRepository,
    private readonly calculateScore: CalculateScore,
  ) {}

  async execute(gymId: string, memberId: string): Promise<ChurnScore | null> {
    const member = await this.memberRepo.findById(gymId, memberId);
    if (!member) return null;

    const features = await this.featureRepo.extractOne(gymId, memberId);
    if (!features) return null;

    const score = this.calculateScore.execute(features);

    await this.scoreRepo.upsert({
      memberId,
      gymId,
      score: score.score,
      tier: score.tier,
      reasons: score.reasons,
      origin: 'rules',
    });

    return score;
  }
}
