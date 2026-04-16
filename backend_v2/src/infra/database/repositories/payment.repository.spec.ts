import { PaymentPostgresRepository } from './payment.repository';
import { PaymentStatus } from '../../../domain/enums';

function makeRepo() {
  const ds = { query: jest.fn() } as any;
  return { ds, service: new PaymentPostgresRepository(ds) };
}

describe('PaymentPostgresRepository', () => {
  it('findByGym should return mapped payments and total', async () => {
    const { ds, service } = makeRepo();
    ds.query
      .mockResolvedValueOnce([
        { id: 'p1', member_id: 'm1', member_name: 'John', amount: '99.90', due_date: new Date(), paid_at: null, status: 'pending' },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await service.findByGym('gym-1', { page: 1, pageSize: 20 });

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].memberId).toBe('m1');
    expect(result.payments[0].amount).toBe(99.9);
    expect(result.total).toBe(1);
  });

  it('findByGym should apply memberId and status filters', async () => {
    const { ds, service } = makeRepo();
    ds.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0 }]);

    await service.findByGym('gym-1', { memberId: 'm1', status: PaymentStatus.OVERDUE, page: 1, pageSize: 10 });

    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('p.member_id'),
      expect.arrayContaining(['gym-1', 'm1', PaymentStatus.OVERDUE]),
    );
  });
});
