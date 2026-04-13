import { Module } from '@nestjs/common';
import { RiskUseCasesModule } from '../../../data/use-cases-implementation/risk/risk-use-cases.module';
import { LoadAtRiskController } from './load-at-risk/controller';

@Module({
  imports: [RiskUseCasesModule],
  controllers: [LoadAtRiskController],
})
export class RiskModule {}
