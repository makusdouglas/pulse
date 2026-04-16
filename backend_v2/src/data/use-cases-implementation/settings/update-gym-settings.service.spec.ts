import { UpdateGymSettingsService } from './update-gym-settings.service';
import { GymRepository } from '../../protocols/gym-repository';

function makeGymRepo(): jest.Mocked<GymRepository> {
  return { findById: jest.fn(), findAllIds: jest.fn(), update: jest.fn() } as any;
}

describe('UpdateGymSettingsService', () => {
  it('should call gymRepo.update and return result', async () => {
    const gymRepo = makeGymRepo();
    const service = new UpdateGymSettingsService(gymRepo);
    const updatedGym = {
      id: 'gym-1', name: 'Updated', slug: 'test', email: null,
      phone: null, clerkOrgId: null, timezone: 'UTC',
      createdAt: new Date(), updatedAt: new Date(),
    };
    gymRepo.update.mockResolvedValue(updatedGym);

    const result = await service.execute('gym-1', { name: 'Updated', timezone: 'UTC' });

    expect(result).toEqual(updatedGym);
    expect(gymRepo.update).toHaveBeenCalledWith('gym-1', { name: 'Updated', timezone: 'UTC' });
  });
});
