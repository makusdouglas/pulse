import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { ListAtRisk } from '../../../domain/use-cases/risk/list-at-risk';
import { ListAtRiskService } from './list-at-risk.service';

@Module({
  imports: [InfraModule],
  providers: [{ provide: ListAtRisk, useClass: ListAtRiskService }],
  exports: [ListAtRisk],
})
export class RiskUseCasesModule {}
