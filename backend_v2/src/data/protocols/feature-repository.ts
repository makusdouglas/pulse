import { MemberFeatures } from '../../domain/entities';

export interface UpsertFeatureParams {
  memberId: string;
  gymId: string;
  daysWithoutCheckin: number;
  freqLast30d: number;
  freqPrev30d: number;
  freqTrend: number;
  avgDurationMin: number | null;
  overduePayments: number;
  monthsEnrolled: number;
}

export abstract class FeatureRepository {
  abstract upsert(params: UpsertFeatureParams): Promise<void>;
  abstract extractAll(gymId: string): Promise<MemberFeatures[]>;
  abstract extractOne(
    gymId: string,
    memberId: string,
  ): Promise<MemberFeatures | null>;
}
