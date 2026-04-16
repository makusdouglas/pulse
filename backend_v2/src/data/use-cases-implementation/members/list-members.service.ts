import { Injectable } from '@nestjs/common';
import {
  ListMembers,
  ListMembersFilters,
  ListMembersResponse,
} from '../../../domain/use-cases/members/list-members';
import { MemberRepository } from '../../protocols/member-repository';

@Injectable()
export class ListMembersService implements ListMembers {
  constructor(private readonly memberRepo: MemberRepository) {}

  async execute(
    gymId: string,
    filters: ListMembersFilters,
  ): Promise<ListMembersResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const { members, total } = await this.memberRepo.findByGym({
      gymId,
      page,
      pageSize,
      search: filters.search,
      status: filters.status,
    });
    return { members, total, page, pageSize };
  }
}
