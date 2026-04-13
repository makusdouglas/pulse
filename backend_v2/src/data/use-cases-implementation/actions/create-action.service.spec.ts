import { CreateActionService } from './create-action.service';
import { ActionRepository } from '../../protocols/action-repository';
import { ActionChannel } from '../../../domain/enums';

function makeActionRepo(): jest.Mocked<ActionRepository> {
  return { findByGym: jest.fn(), create: jest.fn() } as any;
}

describe('CreateActionService', () => {
  let service: CreateActionService;
  let actionRepo: jest.Mocked<ActionRepository>;

  beforeEach(() => {
    actionRepo = makeActionRepo();
    service = new CreateActionService(actionRepo);
  });

  it('should create action and return it', async () => {
    const mockAction = {
      id: 'a1', memberId: 'm1', gymId: 'gym-1', actionType: 'call',
      channel: ActionChannel.PHONE, message: null, sentAt: new Date(),
      result: null, createdAt: new Date(),
    };
    actionRepo.create.mockResolvedValue(mockAction as any);

    const result = await service.execute('gym-1', {
      memberId: 'm1',
      actionType: 'call',
      channel: ActionChannel.PHONE,
    });

    expect(result).toEqual(mockAction);
    expect(actionRepo.create).toHaveBeenCalledWith({
      gymId: 'gym-1',
      memberId: 'm1',
      actionType: 'call',
      channel: ActionChannel.PHONE,
      message: undefined,
    });
  });
});
