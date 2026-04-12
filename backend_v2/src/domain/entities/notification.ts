import { NotificationType } from '../enums';

export interface Notification {
  id: string;
  gymId: string;
  memberId: string | null;
  type: NotificationType;
  title: string;
  description: string | null;
  isRead: boolean;
  createdAt: Date;
}
