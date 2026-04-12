import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [DashboardController],
})
export class DashboardControllersModule {}
