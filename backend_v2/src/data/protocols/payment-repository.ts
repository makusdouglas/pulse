import { PaymentStatus } from '../../domain/enums';

export interface PaymentWithMember {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: PaymentStatus;
}

export abstract class PaymentRepository {
  abstract findByGym(
    gymId: string,
    filters: { memberId?: string; status?: PaymentStatus; page: number; pageSize: number },
  ): Promise<{ payments: PaymentWithMember[]; total: number }>;
}
