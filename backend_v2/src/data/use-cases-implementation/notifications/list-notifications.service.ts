import { Injectable } from '@nestjs/common';
import {
  ListNotifications,
  ListNotificationsResponse,
} from '../../../domain/use-cases/notifications/list-notifications';
import { NotificationRepository } from '../../protocols/notification-repository';

@Injectable()
export class ListNotificationsService implements ListNotifications {
  constructor(private readonly notifRepo: NotificationRepository) {}

  async execute(
    gymId: string,
    filters: { page?: number; pageSize?: number },
  ): Promise<ListNotificationsResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const { notifications, total, unreadCount } =
      await this.notifRepo.findByGym(gymId, page, pageSize);
    return { notifications, total, page, pageSize, unreadCount };
  }
}
