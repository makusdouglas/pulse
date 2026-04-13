import { Body, Controller, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { UpdateGymSettings } from '../../../../domain/use-cases/settings/update-gym-settings';
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
  async handle(@Req() req: Request, @Body() body: UpdateSettingsRequest) {
    const gymId = (req as any).gymUuid;
    return this.updateGymSettings.execute(gymId, body);
  }
}
