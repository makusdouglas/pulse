import { AdminUser } from '../../entities';

export abstract class GetAdminMe {
  abstract execute(adminUserId: string): Promise<AdminUser>;
}
