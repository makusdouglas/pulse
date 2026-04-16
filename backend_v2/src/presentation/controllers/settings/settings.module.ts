import { Module } from '@nestjs/common';
import { SettingsUseCasesModule } from '../../../data/use-cases-implementation/settings/settings-use-cases.module';
import { LoadSettingsController } from './load-settings/controller';
import { UpdateSettingsController } from './update-settings/controller';

@Module({
  imports: [SettingsUseCasesModule],
  controllers: [LoadSettingsController, UpdateSettingsController],
})
export class SettingsModule {}
