import { MemberPostgresRepository } from './member.repository';

const mockEntity = {
  id: 'm1', gymId: 'gym-1', name: 'John', email: 'j@t.com', phone: null,
  enrolledAt: new Date(), cancelledAt: null, status: 'active',
  createdAt: new Date(), updatedAt: new Date(),
};

function makeRepo() {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockEntity], 1]),
  };
  const typeormRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn(),
    find: jest.fn(),
  } as any;
  return { typeormRepo, qb, service: new MemberPostgresRepository(typeormRepo) };
}

describe('MemberPostgresRepository', () => {
  it('findByGym should return paginated members', async () => {
    const { service } = makeRepo();
    const result = await service.findByGym({ gymId: 'gym-1', page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.members[0].id).toBe('m1');
    expect(result.members[0].name).toBe('John');
  });

  it('findByGym should apply search filter', async () => {
    const { service, qb } = makeRepo();
    await service.findByGym({ gymId: 'gym-1', page: 1, pageSize: 20, search: 'john' });
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('ILIKE'),
      expect.objectContaining({ search: '%john%' }),
    );
  });

  it('findById should return mapped Member when found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(mockEntity);
    const result = await service.findById('gym-1', 'm1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('m1');
  });

  it('findById should return null when not found', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findOne.mockResolvedValue(null);
    const result = await service.findById('gym-1', 'mx');
    expect(result).toBeNull();
  });
});
