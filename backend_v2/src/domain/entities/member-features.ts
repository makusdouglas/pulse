export interface MemberFeatures {
  memberId: string;
  gymId: string;
  computedAt: Date;
  daysWithoutCheckin: number;
  freqLast30d: number;
  freqPrev30d: number;
  freqTrend: number;
  avgDurationMin: number | null;
  avgDurationPrev: number | null; // 60-30d window, not persisted
  overduePayments: number;
  monthsEnrolled: number;
  latePaymentRatio: number; // not persisted
}
