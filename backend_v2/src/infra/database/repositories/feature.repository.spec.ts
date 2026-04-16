import { FeaturePostgresRepository } from './feature.repository';

function makeRepo() {
  const ds = { query: jest.fn() } as any;
  return { ds, service: new FeaturePostgresRepository(ds) };
}

describe('FeaturePostgresRepository', () => {
  it('upsert should call ds.query with correct params', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue(undefined);
    await service.upsert({
      memberId: 'm1', gymId: 'gym-1', daysWithoutCheckin: 5,
      freqLast30d: 12, freqPrev30d: 10, freqTrend: 0.2,
      avgDurationMin: 60, overduePayments: 0, monthsEnrolled: 6,
    });
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO member_features'),
      expect.arrayContaining(['m1', 'gym-1']),
    );
  });

  it('extractAll should return mapped features for all active members', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([
      { member_id: 'm1', gym_id: 'gym-1', days_without_checkin: 5, freq_last_30d: 12, freq_prev_30d: 10, freq_trend: 0.2, avg_duration_min: 60, avg_duration_prev: 55, overdue_payments: 0, months_enrolled: 6, late_payment_ratio: 0 },
    ]);
    const result = await service.extractAll('gym-1');
    expect(result).toHaveLength(1);
    expect(result[0].memberId).toBe('m1');
    expect(result[0].daysWithoutCheckin).toBe(5);
  });

  it('extractOne should return features for a single member', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([
      { member_id: 'm1', gym_id: 'gym-1', days_without_checkin: 5, freq_last_30d: 12, freq_prev_30d: 10, freq_trend: 0.2, avg_duration_min: 60, avg_duration_prev: 55, overdue_payments: 0, months_enrolled: 6, late_payment_ratio: 0 },
    ]);
    const result = await service.extractOne('gym-1', 'm1');
    expect(result).not.toBeNull();
    expect(result!.memberId).toBe('m1');
  });

  it('extractOne should return null when member not found', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([]);
    const result = await service.extractOne('gym-1', 'mx');
    expect(result).toBeNull();
  });
});
