import { Gym } from '../../entities';

export abstract class GetGymSettings {
  abstract execute(gymId: string): Promise<Gym>;
}
