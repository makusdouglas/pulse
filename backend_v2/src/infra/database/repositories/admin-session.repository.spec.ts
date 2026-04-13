import { AdminSessionPostgresRepository } from './admin-session.repository';

const mockEntity = {
  id: 's1', adminUserId: 'a1', token: 'jwt-token', ipAddress: '127.0.0.1',
  userAgent: 'test', expiresAt: new Date(), createdAt: new Date(),
};

function makeRepo() {
  const typeormRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  } as any;
  return { typeormRepo, service: new AdminSessionPostgresRepository(typeormRepo) };
}

describe('AdminSessionPostgresRepository', () => {
  it('create should save and return mapped session', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.create.mockReturnValue(mockEntity);
    typeormRepo.save.mockResolvedValue(mockEntity);

    const result = await service.create({
      adminUserId: 'a1', token: 'jwt-token', ipAddress: '127.0.0.1',
      userAgent: 'test', expiresAt: new Date(),
    });

    expect(result.id).toBe('s1');
    expect(result.token).toBe('jwt-token');
  });

  it('findByToken should return session when found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(mockEntity);
    const result = await service.findByToken('jwt-token');
    expect(result).not.toBeNull();
    expect(result!.adminUserId).toBe('a1');
  });

  it('findByToken should return null when not found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(null);
    const result = await service.findByToken('bad-token');
    expect(result).toBeNull();
  });

  it('deleteByAdminUserId should call repo.delete', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.delete.mockResolvedValue(undefined);
    await service.deleteByAdminUserId('a1');
    expect(typeormRepo.delete).toHaveBeenCalledWith({ adminUserId: 'a1' });
  });
});
