import { NotificationPostgresRepository } from './notification.repository';

const mockEntity = {
  id: 'n1', gymId: 'gym-1', memberId: 'm1', type: 'churn_risk',
  title: 'Alert', description: 'Desc', isRead: false, createdAt: new Date(),
};

function makeRepo() {
  const typeormRepo = {
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  } as any;
  return { typeormRepo, service: new NotificationPostgresRepository(typeormRepo) };
}

describe('NotificationPostgresRepository', () => {
  it('findByGym should return notifications with unreadCount', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.findAndCount.mockResolvedValue([[mockEntity], 1]);
    typeormRepo.count.mockResolvedValue(1);

    const result = await service.findByGym('gym-1', 1, 20);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].id).toBe('n1');
    expect(result.total).toBe(1);
    expect(result.unreadCount).toBe(1);
  });

  it('markRead should update specific notification', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.update.mockResolvedValue(undefined);

    await service.markRead('gym-1', 'n1');

    expect(typeormRepo.update).toHaveBeenCalledWith(
      { id: 'n1', gymId: 'gym-1' },
      { isRead: true },
    );
  });

  it('markAllRead should update all unread notifications', async () => {
    const { typeormRepo, service } = makeRepo();
    typeormRepo.update.mockResolvedValue(undefined);

    await service.markAllRead('gym-1');

    expect(typeormRepo.update).toHaveBeenCalledWith(
      { gymId: 'gym-1', isRead: false },
      { isRead: true },
    );
  });
});
