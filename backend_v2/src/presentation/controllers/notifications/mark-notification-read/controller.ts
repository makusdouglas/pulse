import {
  Controller,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { MarkNotificationRead } from '../../../../domain/use-cases/notifications/mark-notification-read';
import { LoggedUser } from '../../../decorators';
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
    @LoggedUser() gymId: string,
    @Param('notificationId') notificationId: string,
  ) {
    await this.markNotificationRead.execute(gymId, notificationId);
  }
}
