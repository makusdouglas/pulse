import { Notification } from '../../entities';

export interface ListNotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export abstract class ListNotifications {
  abstract execute(
    gymId: string,
    filters: { page?: number; pageSize?: number },
  ): Promise<ListNotificationsResponse>;
}
