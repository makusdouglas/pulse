import { AdminUserPostgresRepository } from './admin-user.repository';

const mockEntity = {
  id: 'a1', email: 'admin@pulse.com', passwordHash: '$2a$hash', name: 'Admin',
  role: 'superadmin', isActive: true, lastLoginAt: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeRepo() {
  const typeormRepo = { findOne: jest.fn(), update: jest.fn() } as any;
  return { typeormRepo, service: new AdminUserPostgresRepository(typeormRepo) };
}

describe('AdminUserPostgresRepository', () => {
  it('findByEmail should return user with passwordHash', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(mockEntity);
    const result = await service.findByEmail('admin@pulse.com');
    expect(result).not.toBeNull();
    expect(result!.passwordHash).toBe('$2a$hash');
    expect(result!.email).toBe('admin@pulse.com');
  });

  it('findByEmail should return null when not found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(null);
    const result = await service.findByEmail('x@x.com');
    expect(result).toBeNull();
  });

  it('findById should return mapped user without passwordHash', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(mockEntity);
    const result = await service.findById('a1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('a1');
    expect((result as any).passwordHash).toBeUndefined();
  });

  it('findById should return null when not found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(null);
    const result = await service.findById('ax');
    expect(result).toBeNull();
  });

  it('updateLastLogin should call repo.update', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.update.mockResolvedValue(undefined);
    const date = new Date();
    await service.updateLastLogin('a1', date);
    expect(typeormRepo.update).toHaveBeenCalledWith('a1', { lastLoginAt: date });
  });
});
