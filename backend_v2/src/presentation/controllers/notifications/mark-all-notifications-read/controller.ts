import { Controller, HttpCode, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { MarkAllNotificationsRead } from '../../../../domain/use-cases/notifications/mark-all-notifications-read';
import { LoggedUser } from '../../../decorators';
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
  async handle(@LoggedUser() gymId: string) {
    await this.markAllNotificationsRead.execute(gymId);
  }
}
