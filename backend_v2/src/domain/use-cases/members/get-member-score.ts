import { ChurnScore } from '../../entities';

export abstract class GetMemberScore {
  abstract execute(gymId: string, memberId: string): Promise<ChurnScore | null>;
}
