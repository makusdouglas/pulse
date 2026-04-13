import { Controller, HttpCode, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { MarkAllNotificationsRead } from '../../../../domain/use-cases/notifications/mark-all-notifications-read';
import { MarkAllNotificationsReadSwagger } from './decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('notifications')
export class MarkAllNotificationsReadController {
  constructor(
    private readonly markAllNotificationsRead: MarkAllNotificationsRead,
  ) {}

  @Put('read-all')
  @HttpCode(204)
  @MarkAllNotificationsReadSwagger()
  async handle(@Req() req: Request) {
    const gymId = (req as any).gymUuid;
    await this.markAllNotificationsRead.execute(gymId);
  }
}
