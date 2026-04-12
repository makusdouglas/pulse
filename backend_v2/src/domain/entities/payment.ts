import { PaymentStatus } from '../enums';

export interface Payment {
  id: string;
  memberId: string;
  gymId: string;
  dueDate: Date;
  paidAt: Date | null;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
}
