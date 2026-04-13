import { ListActionsService } from './list-actions.service';
import { ActionRepository } from '../../protocols/action-repository';
import { ActionChannel } from '../../../domain/enums';

function makeActionRepo(): jest.Mocked<ActionRepository> {
  return { findByGym: jest.fn(), create: jest.fn() } as any;
}

describe('ListActionsService', () => {
  let service: ListActionsService;
  let actionRepo: jest.Mocked<ActionRepository>;

  beforeEach(() => {
    actionRepo = makeActionRepo();
    service = new ListActionsService(actionRepo);
  });

  it('should return paginated actions', async () => {
    actionRepo.findByGym.mockResolvedValue({
      actions: [
        { id: 'a1', memberId: 'm1', memberName: 'John', actionType: 'call', channel: ActionChannel.PHONE, message: null, sentAt: new Date(), result: null },
      ],
      total: 1,
    });

    const result = await service.execute('gym-1', {});

    expect(result.actions).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should pass memberId filter', async () => {
    actionRepo.findByGym.mockResolvedValue({ actions: [], total: 0 });

    await service.execute('gym-1', { memberId: 'm1', page: 2, pageSize: 5 });

    expect(actionRepo.findByGym).toHaveBeenCalledWith('gym-1', { memberId: 'm1', page: 2, pageSize: 5 });
  });
});
