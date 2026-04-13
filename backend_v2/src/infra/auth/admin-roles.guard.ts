import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../domain/enums';

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata('adminRoles', roles);

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      'adminRoles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const adminUser = (request as any).adminUser;

    if (!adminUser) {
      throw new ForbiddenException('No admin user in request');
    }

    if (adminUser.role === AdminRole.SUPERADMIN) return true;

    if (!requiredRoles.includes(adminUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
