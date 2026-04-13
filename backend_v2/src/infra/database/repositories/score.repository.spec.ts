import { ScorePostgresRepository } from './score.repository';

function makeRepo() {
  const ds = { query: jest.fn() } as any;
  return { ds, service: new ScorePostgresRepository(ds) };
}

describe('ScorePostgresRepository', () => {
  it('upsert should call ds.query with correct params', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue(undefined);
    await service.upsert({ memberId: 'm1', gymId: 'gym-1', score: 70, tier: 'critical', reasons: ['r1'], origin: 'rules' });
    expect(ds.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO churn_scores'), expect.arrayContaining(['m1', 'gym-1', 70]));
  });

  it('getTierCounts should aggregate by tier', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([
      { tier: 'critical', count: 5 },
      { tier: 'medium', count: 10 },
    ]);
    const result = await service.getTierCounts('gym-1');
    expect(result.critical).toBe(5);
    expect(result.medium).toBe(10);
    expect(result.low).toBe(0);
    expect(result.safe).toBe(0);
  });

  it('getAvgScore should return rounded average', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([{ avg: 35.7 }]);
    const result = await service.getAvgScore('gym-1');
    expect(result).toBe(36);
  });

  it('getRecentScores should map rows to ScoreWithMember', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValue([
      { member_id: 'm1', member_name: 'John', member_email: 'j@t.com', score: 80, tier: 'critical', reasons: ['r'], computed_at: new Date() },
    ]);
    const result = await service.getRecentScores('gym-1', 10);
    expect(result).toHaveLength(1);
    expect(result[0].memberId).toBe('m1');
    expect(result[0].memberName).toBe('John');
  });

  it('findByGymWithTier should return scores and total', async () => {
    const { ds, service } = makeRepo();
    ds.query
      .mockResolvedValueOnce([{ member_id: 'm1', member_name: 'John', member_email: null, score: 80, tier: 'critical', reasons: [], computed_at: new Date() }])
      .mockResolvedValueOnce([{ total: 1 }]);
    const result = await service.findByGymWithTier('gym-1', undefined, 1, 20);
    expect(result.scores).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
