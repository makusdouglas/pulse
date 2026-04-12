import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  FeatureRepository,
  UpsertFeatureParams,
} from '../../../data/protocols/feature-repository';
import { MemberFeatures } from '../../../domain/entities';

@Injectable()
export class FeaturePostgresRepository implements FeatureRepository {
  constructor(private readonly ds: DataSource) {}

  async upsert(params: UpsertFeatureParams): Promise<void> {
    await this.ds.query(
      `INSERT INTO member_features
         (member_id, gym_id, computed_at, days_without_checkin, freq_last_30d,
          freq_prev_30d, freq_trend, avg_duration_min, overdue_payments, months_enrolled)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (member_id, computed_at) DO UPDATE SET
         days_without_checkin = EXCLUDED.days_without_checkin,
         freq_last_30d = EXCLUDED.freq_last_30d,
         freq_prev_30d = EXCLUDED.freq_prev_30d,
         freq_trend = EXCLUDED.freq_trend,
         avg_duration_min = EXCLUDED.avg_duration_min,
         overdue_payments = EXCLUDED.overdue_payments,
         months_enrolled = EXCLUDED.months_enrolled`,
      [
        params.memberId, params.gymId, params.daysWithoutCheckin,
        params.freqLast30d, params.freqPrev30d, params.freqTrend,
        params.avgDurationMin, params.overduePayments, params.monthsEnrolled,
      ],
    );
  }

  async extractAll(gymId: string): Promise<MemberFeatures[]> {
    const rows = await this.ds.query(
      `WITH checkin_agg AS (
        SELECT c.member_id,
          MAX(c.ts::date) AS last_checkin_date,
          COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 30) AS freq_last_30d,
          COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 60 AND c.ts < CURRENT_DATE - 30) AS freq_prev_30d,
          AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 30) AS avg_duration_min,
          AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 60 AND c.ts < CURRENT_DATE - 30) AS avg_duration_prev
        FROM checkins c WHERE c.gym_id = $1 GROUP BY c.member_id
      ), payment_agg AS (
        SELECT p.member_id,
          COUNT(*) FILTER (WHERE p.status = 'overdue' AND p.due_date >= CURRENT_DATE - 90) AS overdue_payments,
          COUNT(*) FILTER (WHERE p.status = 'overdue')::float / NULLIF(COUNT(*), 0) AS late_payment_ratio
        FROM payments p WHERE p.gym_id = $1 GROUP BY p.member_id
      )
      SELECT m.id AS member_id, m.gym_id,
        COALESCE(CURRENT_DATE - ca.last_checkin_date, 9999)::int AS days_without_checkin,
        COALESCE(ca.freq_last_30d, 0)::int AS freq_last_30d,
        COALESCE(ca.freq_prev_30d, 0)::int AS freq_prev_30d,
        CASE WHEN COALESCE(ca.freq_prev_30d, 0) > 0
          THEN ((COALESCE(ca.freq_last_30d, 0) - ca.freq_prev_30d)::float / ca.freq_prev_30d)
          ELSE 0 END AS freq_trend,
        ca.avg_duration_min::float AS avg_duration_min,
        ca.avg_duration_prev::float AS avg_duration_prev,
        COALESCE(pa.overdue_payments, 0)::int AS overdue_payments,
        GREATEST(EXTRACT(YEAR FROM age(CURRENT_DATE, m.enrolled_at)) * 12
          + EXTRACT(MONTH FROM age(CURRENT_DATE, m.enrolled_at)), 0)::int AS months_enrolled,
        COALESCE(pa.late_payment_ratio, 0)::float AS late_payment_ratio
      FROM members m
      LEFT JOIN checkin_agg ca ON ca.member_id = m.id
      LEFT JOIN payment_agg pa ON pa.member_id = m.id
      WHERE m.gym_id = $1 AND m.status = 'active'`,
      [gymId],
    );

    return rows.map((r: any) => ({
      memberId: r.member_id,
      gymId: r.gym_id,
      computedAt: new Date(),
      daysWithoutCheckin: r.days_without_checkin,
      freqLast30d: r.freq_last_30d,
      freqPrev30d: r.freq_prev_30d,
      freqTrend: r.freq_trend,
      avgDurationMin: r.avg_duration_min,
      avgDurationPrev: r.avg_duration_prev,
      overduePayments: r.overdue_payments,
      monthsEnrolled: r.months_enrolled,
      latePaymentRatio: r.late_payment_ratio,
    }));
  }

  async extractOne(gymId: string, memberId: string): Promise<MemberFeatures | null> {
    const rows = await this.ds.query(
      `WITH checkin_agg AS (
        SELECT c.member_id,
          MAX(c.ts::date) AS last_checkin_date,
          COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 30) AS freq_last_30d,
          COUNT(*) FILTER (WHERE c.ts >= CURRENT_DATE - 60 AND c.ts < CURRENT_DATE - 30) AS freq_prev_30d,
          AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 30) AS avg_duration_min,
          AVG(c.duration_min) FILTER (WHERE c.ts >= CURRENT_DATE - 60 AND c.ts < CURRENT_DATE - 30) AS avg_duration_prev
        FROM checkins c WHERE c.gym_id = $1 AND c.member_id = $2 GROUP BY c.member_id
      ), payment_agg AS (
        SELECT p.member_id,
          COUNT(*) FILTER (WHERE p.status = 'overdue' AND p.due_date >= CURRENT_DATE - 90) AS overdue_payments,
          COUNT(*) FILTER (WHERE p.status = 'overdue')::float / NULLIF(COUNT(*), 0) AS late_payment_ratio
        FROM payments p WHERE p.gym_id = $1 AND p.member_id = $2 GROUP BY p.member_id
      )
      SELECT m.id AS member_id, m.gym_id,
        COALESCE(CURRENT_DATE - ca.last_checkin_date, 9999)::int AS days_without_checkin,
        COALESCE(ca.freq_last_30d, 0)::int AS freq_last_30d,
        COALESCE(ca.freq_prev_30d, 0)::int AS freq_prev_30d,
        CASE WHEN COALESCE(ca.freq_prev_30d, 0) > 0
          THEN ((COALESCE(ca.freq_last_30d, 0) - ca.freq_prev_30d)::float / ca.freq_prev_30d)
          ELSE 0 END AS freq_trend,
        ca.avg_duration_min::float AS avg_duration_min,
        ca.avg_duration_prev::float AS avg_duration_prev,
        COALESCE(pa.overdue_payments, 0)::int AS overdue_payments,
        GREATEST(EXTRACT(YEAR FROM age(CURRENT_DATE, m.enrolled_at)) * 12
          + EXTRACT(MONTH FROM age(CURRENT_DATE, m.enrolled_at)), 0)::int AS months_enrolled,
        COALESCE(pa.late_payment_ratio, 0)::float AS late_payment_ratio
      FROM members m
      LEFT JOIN checkin_agg ca ON ca.member_id = m.id
      LEFT JOIN payment_agg pa ON pa.member_id = m.id
      WHERE m.id = $2 AND m.gym_id = $1 AND m.status = 'active'`,
      [gymId, memberId],
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      memberId: r.member_id,
      gymId: r.gym_id,
      computedAt: new Date(),
      daysWithoutCheckin: r.days_without_checkin,
      freqLast30d: r.freq_last_30d,
      freqPrev30d: r.freq_prev_30d,
      freqTrend: r.freq_trend,
      avgDurationMin: r.avg_duration_min,
      avgDurationPrev: r.avg_duration_prev,
      overduePayments: r.overdue_payments,
      monthsEnrolled: r.months_enrolled,
      latePaymentRatio: r.late_payment_ratio,
    };
  }
}
