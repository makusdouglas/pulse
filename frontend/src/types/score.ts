import type { ScoreResponse, TierCounts } from "./dashboard";

export interface AtRiskResponse {
  members: ScoreResponse[];
  total: number;
  page: number;
  page_size: number;
  tier_counts: TierCounts;
}

export type Tier = "critical" | "medium" | "low" | "safe";
