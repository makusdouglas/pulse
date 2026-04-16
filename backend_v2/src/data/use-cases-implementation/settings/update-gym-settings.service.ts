import { Injectable } from '@nestjs/common';
import {
  UpdateGymSettings,
  UpdateGymSettingsInput,
} from '../../../domain/use-cases/settings/update-gym-settings';
import { Gym } from '../../../domain/entities';
import { GymRepository } from '../../protocols/gym-repository';

@Injectable()
export class UpdateGymSettingsService implements UpdateGymSettings {
  constructor(private readonly gymRepo: GymRepository) {}

  async execute(gymId: string, input: UpdateGymSettingsInput): Promise<Gym> {
    return this.gymRepo.update(gymId, input);
  }
}
