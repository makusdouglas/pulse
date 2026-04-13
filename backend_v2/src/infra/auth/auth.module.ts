import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminRolesGuard } from './admin-roles.guard';

@Module({
  providers: [ClerkAuthGuard, AdminAuthGuard, AdminRolesGuard],
  exports: [ClerkAuthGuard, AdminAuthGuard, AdminRolesGuard],
})
export class AuthModule {}
