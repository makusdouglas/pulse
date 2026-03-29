import type { ScoreResponse, TierCounts, Tier } from "./dashboard";

export type { Tier };

export interface AtRiskResponse {
  members: ScoreResponse[];
  total: number;
  page: number;
  page_size: number;
  tier_counts: TierCounts;
}
