import { Tier } from '../../domain/enums';

export interface UpsertScoreParams {
  memberId: string;
  gymId: string;
  score: number;
  tier: Tier;
  reasons: string[];
  origin: string;
}

export interface ScoreWithMember {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  score: number;
  tier: Tier;
  reasons: string[];
  computedAt: Date;
}

export interface TierCountsResult {
  critical: number;
  medium: number;
  low: number;
  safe: number;
}

export abstract class ScoreRepository {
  abstract upsert(params: UpsertScoreParams): Promise<void>;
  abstract findByGymWithTier(
    gymId: string,
    tier: Tier | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ scores: ScoreWithMember[]; total: number }>;
  abstract getTierCounts(gymId: string): Promise<TierCountsResult>;
  abstract getAvgScore(gymId: string): Promise<number>;
  abstract getRecentScores(gymId: string, limit: number): Promise<ScoreWithMember[]>;
}
