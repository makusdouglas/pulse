import {
  Controller,
  HttpCode,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { MarkNotificationRead } from '../../../../domain/use-cases/notifications/mark-notification-read';
import { MarkNotificationReadSwagger } from './decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('notifications')
export class MarkNotificationReadController {
  constructor(private readonly markNotificationRead: MarkNotificationRead) {}

  @Put(':notificationId/read')
  @HttpCode(204)
  @MarkNotificationReadSwagger()
  async handle(
    @Req() req: Request,
    @Param('notificationId') notificationId: string,
  ) {
    const gymId = (req as any).gymUuid;
    await this.markNotificationRead.execute(gymId, notificationId);
  }
}
