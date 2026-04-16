import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MembersModule } from './members/members.module';
import { RiskModule } from './risk/risk.module';
import { PaymentsModule } from './payments/payments.module';
import { ActionsModule } from './actions/actions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ImportModule } from './import/import.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    HealthModule,
    DashboardModule,
    MembersModule,
    RiskModule,
    PaymentsModule,
    ActionsModule,
    NotificationsModule,
    SettingsModule,
    ImportModule,
    AdminModule,
  ],
})
export class ControllersModule {}
