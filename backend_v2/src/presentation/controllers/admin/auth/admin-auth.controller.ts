import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminAuthGuard } from '../../../../infra/auth/admin-auth.guard';
import { AdminLogin } from '../../../../domain/use-cases/admin-auth/admin-login';
import { GetAdminMe } from '../../../../domain/use-cases/admin-auth/get-admin-me';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminLogin: AdminLogin,
    private readonly getAdminMe: GetAdminMe,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminLogin.execute({
      email: dto.email,
      password: dto.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: 'Get current admin user' })
  @ApiResponse({ status: 200, description: 'Current admin user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Req() req: Request) {
    const adminUser = (req as any).adminUser;
    return this.getAdminMe.execute(adminUser.id);
  }
}
