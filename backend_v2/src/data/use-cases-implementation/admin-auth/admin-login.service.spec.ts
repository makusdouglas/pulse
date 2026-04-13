import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AdminLoginService } from './admin-login.service';
import { AdminUserRepository } from '../../protocols/admin-user-repository';
import { AdminSessionRepository } from '../../protocols/admin-session-repository';
import { AdminRole } from '../../../domain/enums';

jest.mock('../../../infra/config/env', () => ({
  ENV: { ADMIN_JWT_SECRET: 'test-secret' },
}));

const ADMIN_JWT_SECRET = 'test-secret';

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@pulse.com',
  name: 'Super Admin',
  role: AdminRole.SUPERADMIN,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordHash: '',
};

function makeMockUserRepo(): jest.Mocked<AdminUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  } as any;
}

function makeMockSessionRepo(): jest.Mocked<AdminSessionRepository> {
  return {
    create: jest.fn().mockResolvedValue({
      id: 'session-1',
      adminUserId: 'admin-1',
      token: 'jwt-token',
      ipAddress: null,
      userAgent: null,
      expiresAt: new Date(),
      createdAt: new Date(),
    }),
    findByToken: jest.fn(),
    deleteByAdminUserId: jest.fn(),
  } as any;
}

describe('AdminLoginService', () => {
  let service: AdminLoginService;
  let userRepo: jest.Mocked<AdminUserRepository>;
  let sessionRepo: jest.Mocked<AdminSessionRepository>;

  beforeEach(async () => {
    userRepo = makeMockUserRepo();
    sessionRepo = makeMockSessionRepo();
    service = new AdminLoginService(userRepo, sessionRepo);

    const hash = await bcrypt.hash('correct-password', 4);
    mockAdminUser.passwordHash = hash;
  });

  it('should return token and user on valid credentials', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...mockAdminUser });

    const result = await service.execute({
      email: 'admin@pulse.com',
      password: 'correct-password',
    });

    expect(result.token).toBeDefined();
    expect(result.user.id).toBe('admin-1');
    expect(result.user.email).toBe('admin@pulse.com');
    expect(result.user.role).toBe(AdminRole.SUPERADMIN);

    const payload = jwt.verify(result.token, ADMIN_JWT_SECRET) as any;
    expect(payload.sub).toBe('admin-1');
    expect(payload.email).toBe('admin@pulse.com');
    expect(payload.role).toBe('superadmin');
  });

  it('should create a session record', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...mockAdminUser });

    await service.execute({
      email: 'admin@pulse.com',
      password: 'correct-password',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: 'admin-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    );
  });

  it('should update lastLoginAt', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...mockAdminUser });

    await service.execute({
      email: 'admin@pulse.com',
      password: 'correct-password',
    });

    expect(userRepo.updateLastLogin).toHaveBeenCalledWith(
      'admin-1',
      expect.any(Date),
    );
  });

  it('should throw UnauthorizedException for unknown email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'unknown@pulse.com', password: 'any' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for wrong password', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...mockAdminUser });

    await expect(
      service.execute({
        email: 'admin@pulse.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for disabled account', async () => {
    userRepo.findByEmail.mockResolvedValue({
      ...mockAdminUser,
      isActive: false,
    });

    await expect(
      service.execute({
        email: 'admin@pulse.com',
        password: 'correct-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(sessionRepo.create).not.toHaveBeenCalled();
  });

  it('should not create session on failed login', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    await expect(
      service.execute({ email: 'x@x.com', password: 'x' }),
    ).rejects.toThrow();

    expect(sessionRepo.create).not.toHaveBeenCalled();
    expect(userRepo.updateLastLogin).not.toHaveBeenCalled();
  });
});
