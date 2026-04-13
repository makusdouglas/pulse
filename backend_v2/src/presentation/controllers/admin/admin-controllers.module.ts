import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { AdminAuthUseCasesModule } from '../../../data/use-cases-implementation/admin-auth/admin-auth-use-cases.module';
import { AdminAuthController } from './auth/admin-auth.controller';

@Module({
  imports: [InfraModule, AdminAuthUseCasesModule],
  controllers: [AdminAuthController],
})
export class AdminControllersModule {}
