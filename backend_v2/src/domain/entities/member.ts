import { MemberStatus } from '../enums';

export interface Member {
  id: string;
  gymId: string;
  name: string;
  email: string | null;
  phone: string | null;
  enrolledAt: Date;
  cancelledAt: Date | null;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}
