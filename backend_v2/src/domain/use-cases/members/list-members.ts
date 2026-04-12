import { Member } from '../../entities';
import { MemberStatus } from '../../enums';

export interface ListMembersFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MemberStatus;
}

export interface ListMembersResponse {
  members: Member[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class ListMembers {
  abstract execute(
    gymId: string,
    filters: ListMembersFilters,
  ): Promise<ListMembersResponse>;
}
