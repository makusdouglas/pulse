export interface TierCounts {
  critical: number;
  medium: number;
  low: number;
  safe: number;
}

export interface ScoreResponse {
  member_id: string;
  member_name: string;
  score: number;
  tier: "critical" | "medium" | "low" | "safe";
  reasons: string[];
  computed_at: string;
}

export interface DashboardStats {
  total_members: number;
  active_members: number;
  at_risk_count: number;
  tier_counts: TierCounts;
  avg_score: number;
  recent_scores: ScoreResponse[];
}
