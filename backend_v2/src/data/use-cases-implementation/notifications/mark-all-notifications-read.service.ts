import { Injectable } from '@nestjs/common';
import { MarkAllNotificationsRead } from '../../../domain/use-cases/notifications/mark-all-notifications-read';
import { NotificationRepository } from '../../protocols/notification-repository';

@Injectable()
export class MarkAllNotificationsReadService implements MarkAllNotificationsRead {
  constructor(private readonly notifRepo: NotificationRepository) {}

  async execute(gymId: string): Promise<void> {
    await this.notifRepo.markAllRead(gymId);
  }
}
