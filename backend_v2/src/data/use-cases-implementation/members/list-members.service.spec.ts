import { ListMembersService } from './list-members.service';
import { MemberRepository } from '../../protocols/member-repository';
import { MemberStatus } from '../../../domain/enums';

function makeMemberRepo(): jest.Mocked<MemberRepository> {
  return { findByGym: jest.fn(), findById: jest.fn(), findEmailMap: jest.fn() } as any;
}

describe('ListMembersService', () => {
  let service: ListMembersService;
  let memberRepo: jest.Mocked<MemberRepository>;

  beforeEach(() => {
    memberRepo = makeMemberRepo();
    service = new ListMembersService(memberRepo);
  });

  it('should return paginated members with defaults', async () => {
    memberRepo.findByGym.mockResolvedValue({ members: [], total: 0 });

    const result = await service.execute('gym-1', {});

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(memberRepo.findByGym).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: 'gym-1', page: 1, pageSize: 20 }),
    );
  });

  it('should pass search and status filters', async () => {
    memberRepo.findByGym.mockResolvedValue({ members: [], total: 5 });

    await service.execute('gym-1', {
      page: 2,
      pageSize: 10,
      search: 'john',
      status: MemberStatus.ACTIVE,
    });

    expect(memberRepo.findByGym).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: 'gym-1',
        page: 2,
        pageSize: 10,
        search: 'john',
        status: MemberStatus.ACTIVE,
      }),
    );
  });
});
