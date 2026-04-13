import { MarkNotificationReadService } from './mark-notification-read.service';
import { NotificationRepository } from '../../protocols/notification-repository';

function makeNotifRepo(): jest.Mocked<NotificationRepository> {
  return { findByGym: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() } as any;
}

describe('MarkNotificationReadService', () => {
  it('should call notifRepo.markRead with gymId and notificationId', async () => {
    const notifRepo = makeNotifRepo();
    const service = new MarkNotificationReadService(notifRepo);

    await service.execute('gym-1', 'notif-1');

    expect(notifRepo.markRead).toHaveBeenCalledWith('gym-1', 'notif-1');
  });
});
