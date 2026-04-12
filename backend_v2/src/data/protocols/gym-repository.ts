import { Gym } from '../../domain/entities';

export abstract class GymRepository {
  abstract findById(gymId: string): Promise<Gym | null>;
  abstract findAllIds(): Promise<string[]>;
  abstract update(gymId: string, data: Partial<Gym>): Promise<Gym>;
}
