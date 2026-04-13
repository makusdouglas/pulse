import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AdminAuthGuard } from './admin-auth.guard';

jest.mock('../config/env', () => ({
  ENV: { ADMIN_JWT_SECRET: 'test-secret' },
}));

const ADMIN_JWT_SECRET = 'test-secret';

function makeContext(authHeader?: string): ExecutionContext {
  const request: any = {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;

  beforeEach(() => {
    guard = new AdminAuthGuard();
  });

  it('should allow valid token and attach adminUser to request', () => {
    const token = jwt.sign(
      { sub: 'admin-1', email: 'admin@pulse.com', role: 'superadmin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '1h' },
    );

    const ctx = makeContext(`Bearer ${token}`);
    const result = guard.canActivate(ctx);

    expect(result).toBe(true);

    const request = ctx.switchToHttp().getRequest() as any;
    expect(request.adminUser).toEqual({
      id: 'admin-1',
      email: 'admin@pulse.com',
      role: 'superadmin',
    });
  });

  it('should throw UnauthorizedException when no authorization header', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header is not Bearer', () => {
    const ctx = makeContext('Basic abc123');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid token', () => {
    const ctx = makeContext('Bearer invalid-token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for expired token', () => {
    const token = jwt.sign(
      { sub: 'admin-1', email: 'admin@pulse.com', role: 'superadmin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '-1s' },
    );

    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for token signed with wrong secret', () => {
    const token = jwt.sign(
      { sub: 'admin-1', email: 'admin@pulse.com', role: 'superadmin' },
      'wrong-secret',
      { expiresIn: '1h' },
    );

    const ctx = makeContext(`Bearer ${token}`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
