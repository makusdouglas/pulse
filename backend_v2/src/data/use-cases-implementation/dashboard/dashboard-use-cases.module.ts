import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { GetDashboardStats } from '../../../domain/use-cases/dashboard/get-dashboard-stats';
import { GetDashboardStatsService } from './get-dashboard-stats.service';

@Module({
  imports: [InfraModule],
  providers: [
    { provide: GetDashboardStats, useClass: GetDashboardStatsService },
  ],
  exports: [GetDashboardStats],
})
export class DashboardUseCasesModule {}
