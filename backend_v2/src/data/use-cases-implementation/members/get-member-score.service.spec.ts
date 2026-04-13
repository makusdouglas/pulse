import { GetMemberScoreService } from './get-member-score.service';
import { MemberRepository } from '../../protocols/member-repository';
import { FeatureRepository } from '../../protocols/feature-repository';
import { ScoreRepository } from '../../protocols/score-repository';
import { CalculateScore } from '../../../domain/use-cases/scoring/calculate-score';
import { Tier } from '../../../domain/enums';

function makeMemberRepo(): jest.Mocked<MemberRepository> {
  return { findByGym: jest.fn(), findById: jest.fn(), findEmailMap: jest.fn() } as any;
}
function makeFeatureRepo(): jest.Mocked<FeatureRepository> {
  return { extractOne: jest.fn(), extractAll: jest.fn(), upsert: jest.fn() } as any;
}
function makeScoreRepo(): jest.Mocked<ScoreRepository> {
  return { upsert: jest.fn(), getTierCounts: jest.fn(), getAvgScore: jest.fn(), getRecentScores: jest.fn(), findByGymWithTier: jest.fn() } as any;
}
function makeCalculateScore(): jest.Mocked<CalculateScore> {
  return { execute: jest.fn() } as any;
}

const mockMember = { id: 'm1', gymId: 'gym-1', name: 'John', email: 'j@test.com', phone: null, enrolledAt: new Date(), cancelledAt: null, status: 'active', createdAt: new Date(), updatedAt: new Date() };
const mockFeatures = { memberId: 'm1', gymId: 'gym-1', computedAt: new Date(), daysWithoutCheckin: 20, freqLast30d: 3, freqPrev30d: 10, freqTrend: -0.7, avgDurationMin: 60, avgDurationPrev: 55, overduePayments: 0, monthsEnrolled: 12, latePaymentRatio: 0 };
const mockScore = { memberId: 'm1', score: 70, tier: Tier.CRITICAL, reasons: ['Sem treinar'], signals: { diasSemTreino: 40, quedaFrequencia: 30, inadimplencia: 0, quedaDuracao: 0, baixaFrequencia: 0, historicoPagamento: 0, alunoNovo: 0 } };

describe('GetMemberScoreService', () => {
  let service: GetMemberScoreService;
  let memberRepo: jest.Mocked<MemberRepository>;
  let featureRepo: jest.Mocked<FeatureRepository>;
  let scoreRepo: jest.Mocked<ScoreRepository>;
  let calculateScore: jest.Mocked<CalculateScore>;

  beforeEach(() => {
    memberRepo = makeMemberRepo();
    featureRepo = makeFeatureRepo();
    scoreRepo = makeScoreRepo();
    calculateScore = makeCalculateScore();
    service = new GetMemberScoreService(memberRepo, featureRepo, scoreRepo, calculateScore);
  });

  it('should return score when member and features exist', async () => {
    memberRepo.findById.mockResolvedValue(mockMember as any);
    featureRepo.extractOne.mockResolvedValue(mockFeatures as any);
    calculateScore.execute.mockReturnValue(mockScore as any);

    const result = await service.execute('gym-1', 'm1');

    expect(result).not.toBeNull();
    expect(result!.score).toBe(70);
    expect(scoreRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: 'm1', gymId: 'gym-1', score: 70, origin: 'rules' }),
    );
  });

  it('should return null when member not found', async () => {
    memberRepo.findById.mockResolvedValue(null);
    const result = await service.execute('gym-1', 'm1');
    expect(result).toBeNull();
    expect(featureRepo.extractOne).not.toHaveBeenCalled();
  });

  it('should return null when features not available', async () => {
    memberRepo.findById.mockResolvedValue(mockMember as any);
    featureRepo.extractOne.mockResolvedValue(null);
    const result = await service.execute('gym-1', 'm1');
    expect(result).toBeNull();
    expect(calculateScore.execute).not.toHaveBeenCalled();
  });

  it('should call calculateScore with extracted features', async () => {
    memberRepo.findById.mockResolvedValue(mockMember as any);
    featureRepo.extractOne.mockResolvedValue(mockFeatures as any);
    calculateScore.execute.mockReturnValue(mockScore as any);

    await service.execute('gym-1', 'm1');
    expect(calculateScore.execute).toHaveBeenCalledWith(mockFeatures);
  });
});
