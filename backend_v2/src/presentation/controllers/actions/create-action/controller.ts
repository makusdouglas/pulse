import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { CreateAction } from '../../../../domain/use-cases/actions/create-action';
import { CreateActionSwagger } from './decorators';
import { CreateActionRequest } from './request';

@ApiTags('Actions')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('actions')
export class CreateActionController {
  constructor(private readonly createAction: CreateAction) {}

  @Post()
  @CreateActionSwagger()
  async handle(@Req() req: Request, @Body() body: CreateActionRequest) {
    const gymId = (req as any).gymUuid;
    const action = await this.createAction.execute(gymId, {
      memberId: body.member_id,
      actionType: body.action_type,
      channel: body.channel,
      message: body.message,
    });
    return action;
  }
}
