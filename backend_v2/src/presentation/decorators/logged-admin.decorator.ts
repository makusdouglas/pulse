import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AdminUserPayload {
  id: string;
  email: string;
  role: string;
}

export const LoggedAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminUser;
  },
);
