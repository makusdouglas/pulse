import { Module } from '@nestjs/common';
import { DashboardUseCasesModule } from '../../../data/use-cases-implementation/dashboard/dashboard-use-cases.module';
import { LoadStatsController } from './load-stats/controller';

@Module({
  imports: [DashboardUseCasesModule],
  controllers: [LoadStatsController],
})
export class DashboardModule {}
