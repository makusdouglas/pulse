import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { GetGymSettings } from '../../../../domain/use-cases/settings/get-gym-settings';
import { LoadSettingsSwagger } from './decorators';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('gym')
export class LoadSettingsController {
  constructor(private readonly getGymSettings: GetGymSettings) {}

  @Get('settings')
  @LoadSettingsSwagger()
  async handle(@Req() req: Request) {
    const gymId = (req as any).gymUuid;
    return this.getGymSettings.execute(gymId);
  }
}
