import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [NotificationsController],
})
export class NotificationsControllersModule {}
