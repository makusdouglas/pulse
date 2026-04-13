import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../../../../infra/auth/admin-auth.guard';
import { GetAdminMe } from '../../../../domain/use-cases/admin-auth/get-admin-me';
import { LoadCurrentAdminSwagger } from './decorators';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class LoadCurrentAdminController {
  constructor(private readonly getAdminMe: GetAdminMe) {}

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @LoadCurrentAdminSwagger()
  async handle(@Req() req: Request) {
    const adminUser = (req as any).adminUser;
    return this.getAdminMe.execute(adminUser.id);
  }
}
