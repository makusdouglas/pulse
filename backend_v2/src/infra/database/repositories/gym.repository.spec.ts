import { GymPostgresRepository } from './gym.repository';

const mockEntity = {
  id: 'gym-1', name: 'Test Gym', slug: 'test-gym', email: 'g@t.com',
  phone: '11999', clerkOrgId: 'org-1', timezone: 'America/Sao_Paulo',
  createdAt: new Date(), updatedAt: new Date(),
};

function makeRepo() {
  const typeormRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    findOneOrFail: jest.fn(),
  } as any;
  return { typeormRepo, service: new GymPostgresRepository(typeormRepo) };
}

describe('GymPostgresRepository', () => {
  it('findById should return mapped Gym when found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(mockEntity);
    const result = await service.findById('gym-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('gym-1');
    expect(result!.name).toBe('Test Gym');
  });

  it('findById should return null when not found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(null);
    const result = await service.findById('gym-x');
    expect(result).toBeNull();
  });

  it('findAllIds should return array of ids', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.find.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
    const result = await service.findAllIds();
    expect(result).toEqual(['g1', 'g2']);
  });

  it('update should call repo.update then return mapped Gym', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.update.mockResolvedValue(undefined);
    typeormRepo.findOneOrFail.mockResolvedValue({ ...mockEntity, name: 'Updated' });
    const result = await service.update('gym-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(typeormRepo.update).toHaveBeenCalledWith('gym-1', expect.objectContaining({ name: 'Updated' }));
  });
});
