import { ChurnScore } from '../../entities';

export abstract class ScoreAllMembers {
  abstract execute(gymId: string): Promise<ChurnScore[]>;
}
