import { Notification } from '../../domain/entities';

export abstract class NotificationRepository {
  abstract findByGym(
    gymId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }>;
  abstract markRead(gymId: string, notificationId: string): Promise<void>;
  abstract markAllRead(gymId: string): Promise<void>;
}
