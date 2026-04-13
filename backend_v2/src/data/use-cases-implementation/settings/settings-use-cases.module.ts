import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { GetGymSettings } from '../../../domain/use-cases/settings/get-gym-settings';
import { UpdateGymSettings } from '../../../domain/use-cases/settings/update-gym-settings';
import { GetGymSettingsService } from './get-gym-settings.service';
import { UpdateGymSettingsService } from './update-gym-settings.service';

@Module({
  imports: [InfraModule],
  providers: [
    { provide: GetGymSettings, useClass: GetGymSettingsService },
    { provide: UpdateGymSettings, useClass: UpdateGymSettingsService },
  ],
  exports: [GetGymSettings, UpdateGymSettings],
})
export class SettingsUseCasesModule {}
