import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { ListMembers } from '../../../../domain/use-cases/members/list-members';
import { LoggedUser } from '../../../decorators';
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
  async handle(@LoggedUser() gymId: string, @Query() query: LoadMembersRequest) {
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
