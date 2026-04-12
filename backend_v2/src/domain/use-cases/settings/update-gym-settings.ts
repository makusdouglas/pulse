import { Gym } from '../../entities';

export interface UpdateGymSettingsInput {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
}

export abstract class UpdateGymSettings {
  abstract execute(
    gymId: string,
    input: UpdateGymSettingsInput,
  ): Promise<Gym>;
}
