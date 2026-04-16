import { Injectable } from '@nestjs/common';
import { MarkNotificationRead } from '../../../domain/use-cases/notifications/mark-notification-read';
import { NotificationRepository } from '../../protocols/notification-repository';

@Injectable()
export class MarkNotificationReadService implements MarkNotificationRead {
  constructor(private readonly notifRepo: NotificationRepository) {}

  async execute(gymId: string, notificationId: string): Promise<void> {
    await this.notifRepo.markRead(gymId, notificationId);
  }
}
