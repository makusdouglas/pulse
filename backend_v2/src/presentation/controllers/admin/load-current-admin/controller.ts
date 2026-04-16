import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../../../infra/auth/admin-auth.guard';
import { GetAdminMe } from '../../../../domain/use-cases/admin-auth/get-admin-me';
import { LoggedAdmin } from '../../../decorators';
import type { AdminUserPayload } from '../../../decorators';
import { LoadCurrentAdminSwagger } from './decorators';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class LoadCurrentAdminController {
  constructor(private readonly getAdminMe: GetAdminMe) {}

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @LoadCurrentAdminSwagger()
  async handle(@LoggedAdmin() admin: AdminUserPayload) {
    return this.getAdminMe.execute(admin.id);
  }
}
