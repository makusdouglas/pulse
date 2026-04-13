import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUserRepository } from '../../../data/protocols/admin-user-repository';
import { AdminUser } from '../../../domain/entities';
import { AdminRole } from '../../../domain/enums';
import { AdminUserEntity } from '../entities/admin-user.entity';

@Injectable()
export class AdminUserPostgresRepository implements AdminUserRepository {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly repo: Repository<AdminUserEntity>,
  ) {}

  async findByEmail(
    email: string,
  ): Promise<(AdminUser & { passwordHash: string }) | null> {
    const entity = await this.repo.findOne({ where: { email } });
    if (!entity) return null;
    return {
      ...this.toAdminUser(entity),
      passwordHash: entity.passwordHash,
    };
  }

  async findById(id: string): Promise<AdminUser | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toAdminUser(entity) : null;
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await this.repo.update(id, { lastLoginAt: date });
  }

  private toAdminUser(e: AdminUserEntity): AdminUser {
    return {
      id: e.id,
      email: e.email,
      name: e.name,
      role: e.role as AdminRole,
      isActive: e.isActive,
      lastLoginAt: e.lastLoginAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
