import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { AdminLogin } from '../../../domain/use-cases/admin-auth/admin-login';
import { GetAdminMe } from '../../../domain/use-cases/admin-auth/get-admin-me';
import { AdminLoginService } from './admin-login.service';
import { GetAdminMeService } from './get-admin-me.service';

@Module({
  imports: [InfraModule],
  providers: [
    { provide: AdminLogin, useClass: AdminLoginService },
    { provide: GetAdminMe, useClass: GetAdminMeService },
  ],
  exports: [AdminLogin, GetAdminMe],
})
export class AdminAuthUseCasesModule {}
