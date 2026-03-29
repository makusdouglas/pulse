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
  tier: Tier;
  reasons: string[];
  computed_at: string;
}

export type Tier = "critical" | "medium" | "low" | "safe";
export type MemberStatus = "active" | "inactive" | "cancelled";
export type Channel = "whatsapp" | "phone" | "email";

export interface DashboardStats {
  total_members: number;
  active_members: number;
  at_risk_count: number;
  tier_counts: TierCounts;
  avg_score: number;
  recent_scores: ScoreResponse[];
}
