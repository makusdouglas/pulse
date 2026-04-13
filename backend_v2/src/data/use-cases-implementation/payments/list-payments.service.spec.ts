import { ListPaymentsService } from './list-payments.service';
import { PaymentRepository } from '../../protocols/payment-repository';
import { PaymentStatus } from '../../../domain/enums';

function makePaymentRepo(): jest.Mocked<PaymentRepository> {
  return { findByGym: jest.fn() } as any;
}

describe('ListPaymentsService', () => {
  let service: ListPaymentsService;
  let paymentRepo: jest.Mocked<PaymentRepository>;

  beforeEach(() => {
    paymentRepo = makePaymentRepo();
    service = new ListPaymentsService(paymentRepo);
  });

  it('should return paginated payments with defaults', async () => {
    paymentRepo.findByGym.mockResolvedValue({ payments: [], total: 0 });

    const result = await service.execute('gym-1', {});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should pass memberId and status filters', async () => {
    paymentRepo.findByGym.mockResolvedValue({ payments: [], total: 3 });

    await service.execute('gym-1', { memberId: 'm1', status: PaymentStatus.OVERDUE, page: 2, pageSize: 10 });

    expect(paymentRepo.findByGym).toHaveBeenCalledWith('gym-1', {
      memberId: 'm1',
      status: PaymentStatus.OVERDUE,
      page: 2,
      pageSize: 10,
    });
  });
});
