import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiPropertyOptional } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { GymRepository } from '../../../data/protocols/gym-repository';

class UpdateGymSettingsRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('gym')
export class SettingsController {
  constructor(private readonly gymRepo: GymRepository) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get gym settings' })
  @ApiResponse({ status: 200, description: 'Gym settings' })
  async getSettings(@Req() req: Request) {
    const gymId = (req as any).gymUuid;
    return this.gymRepo.findById(gymId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update gym settings' })
  @ApiResponse({ status: 200, description: 'Updated gym settings' })
  async updateSettings(
    @Req() req: Request,
    @Body() body: UpdateGymSettingsRequest,
  ) {
    const gymId = (req as any).gymUuid;
    return this.gymRepo.update(gymId, body);
  }
}
