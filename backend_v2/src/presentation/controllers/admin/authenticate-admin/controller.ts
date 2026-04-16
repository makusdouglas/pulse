import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminLogin } from '../../../../domain/use-cases/admin-auth/admin-login';
import { AuthenticateAdminSwagger } from './decorators';
import { AuthenticateAdminRequest } from './request';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AuthenticateAdminController {
  constructor(private readonly adminLogin: AdminLogin) {}

  @Post('login')
  @AuthenticateAdminSwagger()
  async handle(@Body() body: AuthenticateAdminRequest, @Req() req: Request) {
    return this.adminLogin.execute({
      email: body.email,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
