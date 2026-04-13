import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListActions } from '../../../../domain/use-cases/actions/list-actions';
import { LoadActionsSwagger } from './decorators';
import { LoadActionsRequest } from './request';

@ApiTags('Actions')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('actions')
export class LoadActionsController {
  constructor(private readonly listActions: ListActions) {}

  @Get()
  @LoadActionsSwagger()
  async handle(@Req() req: Request, @Query() query: LoadActionsRequest) {
    const gymId = (req as any).gymUuid;
    const result = await this.listActions.execute(gymId, {
      memberId: query.member_id,
      page: query.page,
      pageSize: query.page_size,
    });
    return {
      actions: result.actions,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    };
  }
}
