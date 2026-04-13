import { Module } from '@nestjs/common';
import { NotificationsUseCasesModule } from '../../../data/use-cases-implementation/notifications/notifications-use-cases.module';
import { LoadNotificationsController } from './load-notifications/controller';
import { MarkAllNotificationsReadController } from './mark-all-notifications-read/controller';
import { MarkNotificationReadController } from './mark-notification-read/controller';

@Module({
  imports: [NotificationsUseCasesModule],
  controllers: [
    LoadNotificationsController,
    MarkAllNotificationsReadController,
    MarkNotificationReadController,
  ],
})
export class NotificationsModule {}
