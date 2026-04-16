import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { GetGymSettings } from '../../../../domain/use-cases/settings/get-gym-settings';
import { LoggedUser } from '../../../decorators';
import { LoadSettingsSwagger } from './decorators';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('gym')
export class LoadSettingsController {
  constructor(private readonly getGymSettings: GetGymSettings) {}

  @Get('settings')
  @LoadSettingsSwagger()
  async handle(@LoggedUser() gymId: string) {
    return this.getGymSettings.execute(gymId);
  }
}
