import { Injectable, NotFoundException } from '@nestjs/common';
import { GetAdminMe } from '../../../domain/use-cases/admin-auth/get-admin-me';
import { AdminUser } from '../../../domain/entities';
import { AdminUserRepository } from '../../protocols/admin-user-repository';

@Injectable()
export class GetAdminMeService implements GetAdminMe {
  constructor(private readonly adminUserRepo: AdminUserRepository) {}

  async execute(adminUserId: string): Promise<AdminUser> {
    const user = await this.adminUserRepo.findById(adminUserId);
    if (!user) {
      throw new NotFoundException('Admin user not found');
    }
    return user;
  }
}
