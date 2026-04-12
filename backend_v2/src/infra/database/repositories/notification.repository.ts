import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRepository } from '../../../data/protocols/notification-repository';
import { Notification } from '../../../domain/entities';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationType } from '../../../domain/enums';

@Injectable()
export class NotificationPostgresRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async findByGym(
    gymId: string,
    page: number,
    pageSize: number,
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const [entities, total] = await this.repo.findAndCount({
      where: { gymId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const unreadCount = await this.repo.count({
      where: { gymId, isRead: false },
    });

    return {
      notifications: entities.map(this.toNotification),
      total,
      unreadCount,
    };
  }

  async markRead(gymId: string, notificationId: string): Promise<void> {
    await this.repo.update(
      { id: notificationId, gymId },
      { isRead: true },
    );
  }

  async markAllRead(gymId: string): Promise<void> {
    await this.repo.update({ gymId, isRead: false }, { isRead: true });
  }

  private toNotification(e: NotificationEntity): Notification {
    return {
      id: e.id,
      gymId: e.gymId,
      memberId: e.memberId,
      type: e.type as NotificationType,
      title: e.title,
      description: e.description,
      isRead: e.isRead,
      createdAt: e.createdAt,
    };
  }
}
