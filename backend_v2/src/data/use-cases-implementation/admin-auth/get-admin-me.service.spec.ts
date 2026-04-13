import { NotFoundException } from '@nestjs/common';
import { GetAdminMeService } from './get-admin-me.service';
import { AdminUserRepository } from '../../protocols/admin-user-repository';
import { AdminRole } from '../../../domain/enums';

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@pulse.com',
  name: 'Super Admin',
  role: AdminRole.SUPERADMIN,
  isActive: true,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeMockUserRepo(): jest.Mocked<AdminUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  } as any;
}

describe('GetAdminMeService', () => {
  let service: GetAdminMeService;
  let userRepo: jest.Mocked<AdminUserRepository>;

  beforeEach(() => {
    userRepo = makeMockUserRepo();
    service = new GetAdminMeService(userRepo);
  });

  it('should return admin user when found', async () => {
    userRepo.findById.mockResolvedValue({ ...mockAdminUser });

    const result = await service.execute('admin-1');

    expect(result.id).toBe('admin-1');
    expect(result.email).toBe('admin@pulse.com');
    expect(result.role).toBe(AdminRole.SUPERADMIN);
    expect(userRepo.findById).toHaveBeenCalledWith('admin-1');
  });

  it('should throw NotFoundException when admin not found', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(service.execute('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
