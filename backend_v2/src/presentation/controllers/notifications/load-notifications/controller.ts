import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListNotifications } from '../../../../domain/use-cases/notifications/list-notifications';
import { LoadNotificationsSwagger } from './decorators';
import { PaginationQuery } from '../../../../shared/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('notifications')
export class LoadNotificationsController {
  constructor(private readonly listNotifications: ListNotifications) {}

  @Get()
  @LoadNotificationsSwagger()
  async handle(@Req() req: Request, @Query() query: PaginationQuery) {
    const gymId = (req as any).gymUuid;
    const result = await this.listNotifications.execute(gymId, {
      page: query.page,
      pageSize: query.page_size,
    });
    return {
      notifications: result.notifications,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
      unread_count: result.unreadCount,
    };
  }
}
