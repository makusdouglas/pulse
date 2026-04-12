import { Tier } from '../../enums';

export interface AtRiskMember {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  score: number;
  tier: Tier;
  reasons: string[];
  computedAt: Date;
}

export interface TierCounts {
  critical: number;
  medium: number;
  low: number;
  safe: number;
}

export interface ListAtRiskResponse {
  members: AtRiskMember[];
  total: number;
  page: number;
  pageSize: number;
  tierCounts: TierCounts;
}

export abstract class ListAtRisk {
  abstract execute(
    gymId: string,
    filters: { tier?: Tier; page?: number; pageSize?: number },
  ): Promise<ListAtRiskResponse>;
}
