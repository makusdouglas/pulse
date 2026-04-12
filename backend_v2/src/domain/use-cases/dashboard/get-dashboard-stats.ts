import { Tier } from '../../enums';

export interface TierCounts {
  critical: number;
  medium: number;
  low: number;
  safe: number;
}

export interface RecentScore {
  memberId: string;
  memberName: string;
  score: number;
  tier: Tier;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  atRiskCount: number;
  tierCounts: TierCounts;
  avgScore: number;
  recentScores: RecentScore[];
}

export abstract class GetDashboardStats {
  abstract execute(gymId: string): Promise<DashboardStats>;
}
