import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ScoreRepository,
  UpsertScoreParams,
  ScoreWithMember,
  TierCountsResult,
} from '../../../data/protocols/score-repository';
import { Tier } from '../../../domain/enums';

@Injectable()
export class ScorePostgresRepository implements ScoreRepository {
  constructor(private readonly ds: DataSource) {}

  async upsert(params: UpsertScoreParams): Promise<void> {
    await this.ds.query(
      `INSERT INTO churn_scores (member_id, gym_id, computed_at, score, tier, reasons, origin)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5::jsonb, $6)
       ON CONFLICT (member_id, computed_at) DO UPDATE SET
         score = EXCLUDED.score, tier = EXCLUDED.tier,
         reasons = EXCLUDED.reasons, origin = EXCLUDED.origin`,
      [
        params.memberId,
        params.gymId,
        params.score,
        params.tier,
        JSON.stringify(params.reasons),
        params.origin,
      ],
    );
  }

  async findByGymWithTier(
    gymId: string,
    tier: Tier | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ scores: ScoreWithMember[]; total: number }> {
    const conditions = ['cs.gym_id = $1', 'cs.computed_at = CURRENT_DATE'];
    const params: unknown[] = [gymId];

    if (tier) {
      params.push(tier);
      conditions.push(`cs.tier = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * pageSize;

    const [rows, countRow] = await Promise.all([
      this.ds.query(
        `SELECT cs.member_id, m.name AS member_name, m.email AS member_email,
                cs.score, cs.tier, cs.reasons, cs.computed_at
         FROM churn_scores cs JOIN members m ON m.id = cs.member_id
         WHERE ${where} ORDER BY cs.score DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset],
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS total FROM churn_scores cs WHERE ${where}`,
        params,
      ),
    ]);

    return {
      scores: rows.map((r: any) => ({
        memberId: r.member_id,
        memberName: r.member_name,
        memberEmail: r.member_email,
        score: r.score,
        tier: r.tier as Tier,
        reasons: r.reasons,
        computedAt: r.computed_at,
      })),
      total: countRow[0]?.total ?? 0,
    };
  }

  async getTierCounts(gymId: string): Promise<TierCountsResult> {
    const rows = await this.ds.query(
      `SELECT tier, COUNT(*)::int AS count
       FROM churn_scores WHERE gym_id = $1 AND computed_at = CURRENT_DATE
       GROUP BY tier`,
      [gymId],
    );
    const counts: TierCountsResult = {
      critical: 0,
      medium: 0,
      low: 0,
      safe: 0,
    };
    for (const r of rows) {
      if (r.tier in counts) counts[r.tier as keyof TierCountsResult] = r.count;
    }
    return counts;
  }

  async getAvgScore(gymId: string): Promise<number> {
    const row = await this.ds.query(
      `SELECT COALESCE(AVG(score), 0)::float AS avg
       FROM churn_scores WHERE gym_id = $1 AND computed_at = CURRENT_DATE`,
      [gymId],
    );
    return Math.round(row[0]?.avg ?? 0);
  }

  async getRecentScores(
    gymId: string,
    limit: number,
  ): Promise<ScoreWithMember[]> {
    const rows = await this.ds.query(
      `SELECT cs.member_id, m.name AS member_name, m.email AS member_email,
              cs.score, cs.tier, cs.reasons, cs.computed_at
       FROM churn_scores cs JOIN members m ON m.id = cs.member_id
       WHERE cs.gym_id = $1 AND cs.computed_at = CURRENT_DATE
       ORDER BY cs.score DESC LIMIT $2`,
      [gymId, limit],
    );
    return rows.map((r: any) => ({
      memberId: r.member_id,
      memberName: r.member_name,
      memberEmail: r.member_email,
      score: r.score,
      tier: r.tier as Tier,
      reasons: r.reasons,
      computedAt: r.computed_at,
    }));
  }
}
