import { Module } from '@nestjs/common';
import { CalculateScore } from '../../../domain/use-cases/scoring/calculate-score';
import { CalculateScoreService } from './calculate-score.service';

@Module({
  providers: [{ provide: CalculateScore, useClass: CalculateScoreService }],
  exports: [CalculateScore],
})
export class ScoringUseCasesModule {}
