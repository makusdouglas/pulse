import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { UpdateGymSettings } from '../../../../domain/use-cases/settings/update-gym-settings';
import { LoggedUser } from '../../../decorators';
import { UpdateSettingsSwagger } from './decorators';
import { UpdateSettingsRequest } from './request';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('gym')
export class UpdateSettingsController {
  constructor(private readonly updateGymSettings: UpdateGymSettings) {}

  @Put('settings')
  @UpdateSettingsSwagger()
  async handle(@LoggedUser() gymId: string, @Body() body: UpdateSettingsRequest) {
    return this.updateGymSettings.execute(gymId, body);
  }
}
