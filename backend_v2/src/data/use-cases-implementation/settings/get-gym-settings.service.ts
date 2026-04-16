import { Injectable, NotFoundException } from '@nestjs/common';
import { GetGymSettings } from '../../../domain/use-cases/settings/get-gym-settings';
import { Gym } from '../../../domain/entities';
import { GymRepository } from '../../protocols/gym-repository';

@Injectable()
export class GetGymSettingsService implements GetGymSettings {
  constructor(private readonly gymRepo: GymRepository) {}

  async execute(gymId: string): Promise<Gym> {
    const gym = await this.gymRepo.findById(gymId);
    if (!gym) throw new NotFoundException('Gym not found');
    return gym;
  }
}
