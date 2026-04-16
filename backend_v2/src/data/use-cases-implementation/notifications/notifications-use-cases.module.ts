import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { ListNotifications } from '../../../domain/use-cases/notifications/list-notifications';
import { MarkAllNotificationsRead } from '../../../domain/use-cases/notifications/mark-all-notifications-read';
import { MarkNotificationRead } from '../../../domain/use-cases/notifications/mark-notification-read';
import { ListNotificationsService } from './list-notifications.service';
import { MarkAllNotificationsReadService } from './mark-all-notifications-read.service';
import { MarkNotificationReadService } from './mark-notification-read.service';

@Module({
  imports: [InfraModule],
  providers: [
    { provide: ListNotifications, useClass: ListNotificationsService },
    {
      provide: MarkAllNotificationsRead,
      useClass: MarkAllNotificationsReadService,
    },
    { provide: MarkNotificationRead, useClass: MarkNotificationReadService },
  ],
  exports: [ListNotifications, MarkAllNotificationsRead, MarkNotificationRead],
})
export class NotificationsUseCasesModule {}
