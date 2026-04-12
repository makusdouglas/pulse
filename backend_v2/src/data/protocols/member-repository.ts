import { Member } from '../../domain/entities';
import { MemberStatus } from '../../domain/enums';

export interface ListMembersParams {
  gymId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: MemberStatus;
}

export interface ListMembersResult {
  members: Member[];
  total: number;
}

export abstract class MemberRepository {
  abstract findByGym(params: ListMembersParams): Promise<ListMembersResult>;
  abstract findById(gymId: string, memberId: string): Promise<Member | null>;
  abstract findEmailMap(gymId: string, emails: string[]): Promise<Map<string, string>>;
}
