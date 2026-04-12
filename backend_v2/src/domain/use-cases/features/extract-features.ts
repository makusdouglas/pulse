import { MemberFeatures } from '../../entities';

export abstract class ExtractFeatures {
  abstract execute(
    gymId: string,
    memberId: string,
  ): Promise<MemberFeatures | null>;
}
