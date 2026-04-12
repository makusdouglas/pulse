import { MemberFeatures } from '../../entities';

export abstract class ExtractAllFeatures {
  abstract execute(gymId: string): Promise<MemberFeatures[]>;
}
