import { ActionPostgresRepository } from './action.repository';
import { ActionChannel } from '../../../domain/enums';

function makeRepo() {
  const typeormRepo = { create: jest.fn(), save: jest.fn() } as any;
  const ds = { query: jest.fn() } as any;
  return { typeormRepo, ds, service: new ActionPostgresRepository(typeormRepo, ds) };
}

describe('ActionPostgresRepository', () => {
  it('findByGym should return mapped actions and total', async () => {
    const { ds, service } = makeRepo();
    ds.query
      .mockResolvedValueOnce([
        { id: 'a1', member_id: 'm1', member_name: 'John', action_type: 'call', channel: 'phone', message: null, sent_at: new Date(), result: null },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await service.findByGym('gym-1', { page: 1, pageSize: 20 });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].memberId).toBe('m1');
    expect(result.total).toBe(1);
  });

  it('create should save entity and return mapped Action', async () => {
    const { typeormRepo, service } = makeRepo();
    const saved = {
      id: 'a1', gymId: 'gym-1', memberId: 'm1', actionType: 'call',
      channel: 'phone', message: null, sentAt: new Date(), createdAt: new Date(),
    };
    typeormRepo.create.mockReturnValue(saved);
    typeormRepo.save.mockResolvedValue(saved);

    const result = await service.create({
      gymId: 'gym-1', memberId: 'm1', actionType: 'call', channel: ActionChannel.PHONE,
    });

    expect(result.id).toBe('a1');
    expect(typeormRepo.create).toHaveBeenCalled();
    expect(typeormRepo.save).toHaveBeenCalled();
  });
});
