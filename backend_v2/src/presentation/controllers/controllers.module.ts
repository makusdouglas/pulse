import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MembersControllersModule } from './members/members-controllers.module';
import { DashboardControllersModule } from './dashboard/dashboard-controllers.module';
import { RiskControllersModule } from './risk/risk-controllers.module';
import { PaymentsControllersModule } from './payments/payments-controllers.module';
import { ActionsControllersModule } from './actions/actions-controllers.module';
import { NotificationsControllersModule } from './notifications/notifications-controllers.module';
import { SettingsControllersModule } from './settings/settings-controllers.module';
import { ImportControllersModule } from './import/import-controllers.module';
import { AdminControllersModule } from './admin/admin-controllers.module';

@Module({
  imports: [
    MembersControllersModule,
    DashboardControllersModule,
    RiskControllersModule,
    PaymentsControllersModule,
    ActionsControllersModule,
    NotificationsControllersModule,
    SettingsControllersModule,
    ImportControllersModule,
    AdminControllersModule,
  ],
  controllers: [HealthController],
})
export class ControllersModule {}
