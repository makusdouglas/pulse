import { ListAtRiskService } from './list-at-risk.service';
import { ScoreRepository } from '../../protocols/score-repository';
import { Tier } from '../../../domain/enums';

function makeScoreRepo(): jest.Mocked<ScoreRepository> {
  return {
    findByGymWithTier: jest.fn(),
    getTierCounts: jest.fn(),
    upsert: jest.fn(),
    getAvgScore: jest.fn(),
    getRecentScores: jest.fn(),
  } as any;
}

describe('ListAtRiskService', () => {
  let service: ListAtRiskService;
  let scoreRepo: jest.Mocked<ScoreRepository>;

  beforeEach(() => {
    scoreRepo = makeScoreRepo();
    service = new ListAtRiskService(scoreRepo);
  });

  it('should return at-risk members with tier counts', async () => {
    scoreRepo.findByGymWithTier.mockResolvedValue({
      scores: [
        { memberId: 'm1', memberName: 'John', memberEmail: 'j@t.com', score: 80, tier: Tier.CRITICAL, reasons: ['r1'], computedAt: new Date() },
      ],
      total: 1,
    });
    scoreRepo.getTierCounts.mockResolvedValue({ critical: 1, medium: 0, low: 0, safe: 0 });

    const result = await service.execute('gym-1', {});

    expect(result.members).toHaveLength(1);
    expect(result.members[0].memberId).toBe('m1');
    expect(result.tierCounts.critical).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should pass tier filter to repo', async () => {
    scoreRepo.findByGymWithTier.mockResolvedValue({ scores: [], total: 0 });
    scoreRepo.getTierCounts.mockResolvedValue({ critical: 0, medium: 0, low: 0, safe: 0 });

    await service.execute('gym-1', { tier: Tier.CRITICAL, page: 2, pageSize: 5 });

    expect(scoreRepo.findByGymWithTier).toHaveBeenCalledWith('gym-1', Tier.CRITICAL, 2, 5);
  });
});
