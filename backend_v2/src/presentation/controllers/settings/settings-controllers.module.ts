import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { InfraModule } from '../../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [SettingsController],
})
export class SettingsControllersModule {}
