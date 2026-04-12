import { Controller, Get, Param, Put, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { NotificationRepository } from '../../../data/protocols/notification-repository';
import { PaginationQuery } from '../../../shared/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifRepo: NotificationRepository) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async list(@Req() req: Request, @Query() query: PaginationQuery) {
    const gymId = (req as any).gymUuid;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;

    const { notifications, total, unreadCount } =
      await this.notifRepo.findByGym(gymId, page, pageSize);

    return {
      notifications,
      total,
      page,
      page_size: pageSize,
      unread_count: unreadCount,
    };
  }

  @Put('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 204 })
  async markAllRead(@Req() req: Request) {
    const gymId = (req as any).gymUuid;
    await this.notifRepo.markAllRead(gymId);
  }

  @Put(':notificationId/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 204 })
  async markRead(
    @Req() req: Request,
    @Param('notificationId') notificationId: string,
  ) {
    const gymId = (req as any).gymUuid;
    await this.notifRepo.markRead(gymId, notificationId);
  }
}
