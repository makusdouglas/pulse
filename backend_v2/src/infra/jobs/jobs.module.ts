import { Module } from '@nestjs/common';
import { InfraModule } from '../infra.module';
import { ScoringUseCasesModule } from '../../data/use-cases-implementation/scoring/scoring-use-cases.module';
import { FeatureExtractionJob } from './feature-extraction.job';
import { ScoringJob } from './scoring.job';

@Module({
  imports: [InfraModule, ScoringUseCasesModule],
  providers: [FeatureExtractionJob, ScoringJob],
  exports: [FeatureExtractionJob, ScoringJob],
})
export class JobsModule {}
