import { NotFoundException } from '@nestjs/common';
import { GetGymSettingsService } from './get-gym-settings.service';
import { GymRepository } from '../../protocols/gym-repository';

function makeGymRepo(): jest.Mocked<GymRepository> {
  return { findById: jest.fn(), findAllIds: jest.fn(), update: jest.fn() } as any;
}

const mockGym = {
  id: 'gym-1', name: 'Test Gym', slug: 'test-gym', email: 'g@t.com',
  phone: null, clerkOrgId: 'org-1', timezone: 'America/Sao_Paulo',
  createdAt: new Date(), updatedAt: new Date(),
};

describe('GetGymSettingsService', () => {
  let service: GetGymSettingsService;
  let gymRepo: jest.Mocked<GymRepository>;

  beforeEach(() => {
    gymRepo = makeGymRepo();
    service = new GetGymSettingsService(gymRepo);
  });

  it('should return gym when found', async () => {
    gymRepo.findById.mockResolvedValue(mockGym);
    const result = await service.execute('gym-1');
    expect(result).toEqual(mockGym);
  });

  it('should throw NotFoundException when gym not found', async () => {
    gymRepo.findById.mockResolvedValue(null);
    await expect(service.execute('gym-x')).rejects.toThrow(NotFoundException);
  });
});
