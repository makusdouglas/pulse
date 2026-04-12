import { ScoringJob } from './scoring.job';
import { GymRepository } from '../../data/protocols/gym-repository';
import { FeatureRepository } from '../../data/protocols/feature-repository';
import { ScoreRepository } from '../../data/protocols/score-repository';
import { CalculateScore } from '../../domain/use-cases/scoring/calculate-score';
import { MemberFeatures, ChurnScore } from '../../domain/entities';
import { Tier } from '../../domain/enums';

describe('ScoringJob', () => {
  let job: ScoringJob;
  let gymRepo: jest.Mocked<GymRepository>;
  let featureRepo: jest.Mocked<FeatureRepository>;
  let scoreRepo: jest.Mocked<ScoreRepository>;
  let calculateScore: jest.Mocked<CalculateScore>;

  const mockFeatures: MemberFeatures = {
    memberId: 'm1',
    gymId: 'gym-1',
    computedAt: new Date(),
    daysWithoutCheckin: 20,
    freqLast30d: 2,
    freqPrev30d: 10,
    freqTrend: -0.8,
    avgDurationMin: 30,
    avgDurationPrev: 60,
    overduePayments: 1,
    monthsEnrolled: 12,
    latePaymentRatio: 0.1,
  };

  const mockScore: ChurnScore = {
    memberId: 'm1',
    score: 80,
    tier: Tier.CRITICAL,
    reasons: ['Sem treinar ha 20 dias'],
    signals: {
      diasSemTreino: 40,
      quedaFrequencia: 30,
      inadimplencia: 20,
      quedaDuracao: 0,
      baixaFrequencia: 10,
      historicoPagamento: 0,
      alunoNovo: 0,
    },
  };

  beforeEach(() => {
    gymRepo = { findAllIds: jest.fn(), findById: jest.fn(), update: jest.fn() } as any;
    featureRepo = { extractAll: jest.fn(), extractOne: jest.fn(), upsert: jest.fn() } as any;
    scoreRepo = {
      upsert: jest.fn(),
      findByGymWithTier: jest.fn(),
      getTierCounts: jest.fn(),
      getAvgScore: jest.fn(),
      getRecentScores: jest.fn(),
    } as any;
    calculateScore = { execute: jest.fn() } as any;

    job = new ScoringJob(gymRepo, featureRepo, scoreRepo, calculateScore);
  });

  it('should score all members across all gyms', async () => {
    gymRepo.findAllIds.mockResolvedValue(['gym-1']);
    featureRepo.extractAll.mockResolvedValue([mockFeatures]);
    calculateScore.execute.mockReturnValue(mockScore);
    scoreRepo.upsert.mockResolvedValue();

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(1);
    expect(result.totalScored).toBe(1);
    expect(result.tierCounts.critical).toBe(1);
    expect(calculateScore.execute).toHaveBeenCalledWith(mockFeatures);
    expect(scoreRepo.upsert).toHaveBeenCalledWith({
      memberId: 'm1',
      gymId: 'gym-1',
      score: 80,
      tier: Tier.CRITICAL,
      reasons: ['Sem treinar ha 20 dias'],
      origin: 'rules',
    });
  });

  it('should handle empty gym list', async () => {
    gymRepo.findAllIds.mockResolvedValue([]);

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(0);
    expect(result.totalScored).toBe(0);
  });

  it('should continue on gym-level errors', async () => {
    gymRepo.findAllIds.mockResolvedValue(['gym-1', 'gym-2']);
    featureRepo.extractAll
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([mockFeatures]);
    calculateScore.execute.mockReturnValue(mockScore);
    scoreRepo.upsert.mockResolvedValue();

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(2);
    expect(result.totalScored).toBe(1);
    expect(result.perGym['gym-2']).toBe(1);
  });

  it('should aggregate tier counts across gyms', async () => {
    gymRepo.findAllIds.mockResolvedValue(['gym-1']);

    const safeScore: ChurnScore = {
      ...mockScore,
      memberId: 'm2',
      score: 0,
      tier: Tier.SAFE,
    };

    featureRepo.extractAll.mockResolvedValue([mockFeatures, { ...mockFeatures, memberId: 'm2' }]);
    calculateScore.execute
      .mockReturnValueOnce(mockScore)
      .mockReturnValueOnce(safeScore);
    scoreRepo.upsert.mockResolvedValue();

    const result = await job.execute();

    expect(result.tierCounts.critical).toBe(1);
    expect(result.tierCounts.safe).toBe(1);
    expect(result.totalScored).toBe(2);
  });
});
