import { ListNotificationsService } from './list-notifications.service';
import { NotificationRepository } from '../../protocols/notification-repository';

function makeNotifRepo(): jest.Mocked<NotificationRepository> {
  return { findByGym: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() } as any;
}

describe('ListNotificationsService', () => {
  let service: ListNotificationsService;
  let notifRepo: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    notifRepo = makeNotifRepo();
    service = new ListNotificationsService(notifRepo);
  });

  it('should return paginated notifications with unreadCount', async () => {
    notifRepo.findByGym.mockResolvedValue({ notifications: [], total: 5, unreadCount: 2 });

    const result = await service.execute('gym-1', {});

    expect(result.total).toBe(5);
    expect(result.unreadCount).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(notifRepo.findByGym).toHaveBeenCalledWith('gym-1', 1, 20);
  });
});
