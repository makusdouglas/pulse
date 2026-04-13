import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListMembers } from '../../../../domain/use-cases/members/list-members';
import { LoadMembersSwagger } from './decorators';
import { LoadMembersRequest } from './request';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('members')
export class LoadMembersController {
  constructor(private readonly listMembers: ListMembers) {}

  @Get()
  @LoadMembersSwagger()
  async handle(@Req() req: Request, @Query() query: LoadMembersRequest) {
    const gymId = (req as any).gymUuid;
    const result = await this.listMembers.execute(gymId, {
      page: query.page,
      pageSize: query.page_size,
      search: query.search,
      status: query.status,
    });
    return {
      members: result.members,
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    };
  }
}
