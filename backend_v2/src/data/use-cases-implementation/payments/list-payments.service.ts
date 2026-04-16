import { Injectable } from '@nestjs/common';
import {
  ListPayments,
  ListPaymentsResponse,
} from '../../../domain/use-cases/payments/list-payments';
import { PaymentStatus } from '../../../domain/enums';
import { PaymentRepository } from '../../protocols/payment-repository';

@Injectable()
export class ListPaymentsService implements ListPayments {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(
    gymId: string,
    filters: {
      memberId?: string;
      status?: PaymentStatus;
      page?: number;
      pageSize?: number;
    },
  ): Promise<ListPaymentsResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const { payments, total } = await this.paymentRepo.findByGym(gymId, {
      memberId: filters.memberId,
      status: filters.status,
      page,
      pageSize,
    });
    return { payments, total, page, pageSize };
  }
}
