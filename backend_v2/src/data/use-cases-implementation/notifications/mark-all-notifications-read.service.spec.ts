import { MarkAllNotificationsReadService } from './mark-all-notifications-read.service';
import { NotificationRepository } from '../../protocols/notification-repository';

function makeNotifRepo(): jest.Mocked<NotificationRepository> {
  return { findByGym: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() } as any;
}

describe('MarkAllNotificationsReadService', () => {
  it('should call notifRepo.markAllRead with gymId', async () => {
    const notifRepo = makeNotifRepo();
    const service = new MarkAllNotificationsReadService(notifRepo);

    await service.execute('gym-1');

    expect(notifRepo.markAllRead).toHaveBeenCalledWith('gym-1');
  });
});
