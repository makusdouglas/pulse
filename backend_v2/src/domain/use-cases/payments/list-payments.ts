import { PaymentStatus } from '../../enums';

export interface PaymentItem {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
}

export interface ListPaymentsResponse {
  payments: PaymentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class ListPayments {
  abstract execute(
    gymId: string,
    filters: {
      memberId?: string;
      status?: PaymentStatus;
      page?: number;
      pageSize?: number;
    },
  ): Promise<ListPaymentsResponse>;
}
