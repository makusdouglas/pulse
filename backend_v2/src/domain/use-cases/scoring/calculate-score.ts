import { MemberFeatures } from '../../entities';
import { ChurnScore } from '../../entities';

export abstract class CalculateScore {
  abstract execute(features: MemberFeatures): ChurnScore;
}
