import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { AdminAuthUseCasesModule } from '../../../data/use-cases-implementation/admin-auth/admin-auth-use-cases.module';
import { AuthenticateAdminController } from './authenticate-admin/controller';
import { LoadCurrentAdminController } from './load-current-admin/controller';

@Module({
  imports: [InfraModule, AdminAuthUseCasesModule],
  controllers: [AuthenticateAdminController, LoadCurrentAdminController],
})
export class AdminModule {}
