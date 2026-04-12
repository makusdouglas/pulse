import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, TenantModule],
  exports: [ConfigModule, DatabaseModule, AuthModule, TenantModule],
})
export class InfraModule {}
