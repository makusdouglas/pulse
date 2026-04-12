import { FeatureExtractionJob } from './feature-extraction.job';
import { GymRepository } from '../../data/protocols/gym-repository';
import { FeatureRepository } from '../../data/protocols/feature-repository';
import { MemberFeatures } from '../../domain/entities';

describe('FeatureExtractionJob', () => {
  let job: FeatureExtractionJob;
  let gymRepo: jest.Mocked<GymRepository>;
  let featureRepo: jest.Mocked<FeatureRepository>;

  beforeEach(() => {
    gymRepo = {
      findAllIds: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    } as any;

    featureRepo = {
      extractAll: jest.fn(),
      extractOne: jest.fn(),
      upsert: jest.fn(),
    } as any;

    job = new FeatureExtractionJob(gymRepo, featureRepo);
  });

  it('should extract features for all gyms', async () => {
    gymRepo.findAllIds.mockResolvedValue(['gym-1', 'gym-2']);

    const features: MemberFeatures[] = [
      {
        memberId: 'm1',
        gymId: 'gym-1',
        computedAt: new Date(),
        daysWithoutCheckin: 5,
        freqLast30d: 10,
        freqPrev30d: 8,
        freqTrend: 0.25,
        avgDurationMin: 60,
        avgDurationPrev: 55,
        overduePayments: 0,
        monthsEnrolled: 12,
        latePaymentRatio: 0,
      },
    ];

    featureRepo.extractAll.mockResolvedValue(features);
    featureRepo.upsert.mockResolvedValue();

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(2);
    expect(result.totalMembers).toBe(2);
    expect(featureRepo.extractAll).toHaveBeenCalledTimes(2);
    expect(featureRepo.upsert).toHaveBeenCalledTimes(2);
  });

  it('should handle empty gym list', async () => {
    gymRepo.findAllIds.mockResolvedValue([]);

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(0);
    expect(result.totalMembers).toBe(0);
  });

  it('should continue processing other gyms on error', async () => {
    gymRepo.findAllIds.mockResolvedValue(['gym-1', 'gym-2']);

    featureRepo.extractAll
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([]);

    const result = await job.execute();

    expect(result.gymsProcessed).toBe(2);
    expect(result.perGym['gym-2']).toBe(0);
  });
});
