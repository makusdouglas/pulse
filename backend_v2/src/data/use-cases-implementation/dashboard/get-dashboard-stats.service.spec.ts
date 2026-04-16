import { GetDashboardStatsService } from './get-dashboard-stats.service';
import { MemberRepository } from '../../protocols/member-repository';
import { ScoreRepository } from '../../protocols/score-repository';
import { Tier } from '../../../domain/enums';

function makeMemberRepo(): jest.Mocked<MemberRepository> {
  return { findByGym: jest.fn(), findById: jest.fn(), findEmailMap: jest.fn() } as any;
}

function makeScoreRepo(): jest.Mocked<ScoreRepository> {
  return {
    getTierCounts: jest.fn(),
    getAvgScore: jest.fn(),
    getRecentScores: jest.fn(),
    upsert: jest.fn(),
    findByGymWithTier: jest.fn(),
  } as any;
}

describe('GetDashboardStatsService', () => {
  let service: GetDashboardStatsService;
  let memberRepo: jest.Mocked<MemberRepository>;
  let scoreRepo: jest.Mocked<ScoreRepository>;

  beforeEach(() => {
    memberRepo = makeMemberRepo();
    scoreRepo = makeScoreRepo();
    service = new GetDashboardStatsService(memberRepo, scoreRepo);
  });

  it('should aggregate dashboard stats correctly', async () => {
    memberRepo.findByGym
      .mockResolvedValueOnce({ members: [], total: 100 })
      .mockResolvedValueOnce({ members: [], total: 80 });
    scoreRepo.getTierCounts.mockResolvedValue({ critical: 5, medium: 10, low: 20, safe: 45 });
    scoreRepo.getAvgScore.mockResolvedValue(35.5);
    scoreRepo.getRecentScores.mockResolvedValue([
      { memberId: 'm1', memberName: 'John', memberEmail: 'john@test.com', score: 75, tier: Tier.CRITICAL, reasons: ['low_frequency'], computedAt: new Date() },
    ]);

    const result = await service.execute('gym-1');

    expect(result.totalMembers).toBe(100);
    expect(result.activeMembers).toBe(80);
    expect(result.atRiskCount).toBe(15);
    expect(result.tierCounts).toEqual({ critical: 5, medium: 10, low: 20, safe: 45 });
    expect(result.avgScore).toBe(35.5);
    expect(result.recentScores).toHaveLength(1);
  });

  it('should call memberRepo.findByGym twice (total + active)', async () => {
    memberRepo.findByGym.mockResolvedValue({ members: [], total: 0 });
    scoreRepo.getTierCounts.mockResolvedValue({ critical: 0, medium: 0, low: 0, safe: 0 });
    scoreRepo.getAvgScore.mockResolvedValue(0);
    scoreRepo.getRecentScores.mockResolvedValue([]);

    await service.execute('gym-1');

    expect(memberRepo.findByGym).toHaveBeenCalledTimes(2);
    expect(scoreRepo.getTierCounts).toHaveBeenCalledWith('gym-1');
    expect(scoreRepo.getAvgScore).toHaveBeenCalledWith('gym-1');
    expect(scoreRepo.getRecentScores).toHaveBeenCalledWith('gym-1', 10);
  });
});
