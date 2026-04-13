import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSessionRepository } from '../../../data/protocols/admin-session-repository';
import { AdminSession } from '../../../domain/entities';
import { AdminSessionEntity } from '../entities/admin-session.entity';

@Injectable()
export class AdminSessionPostgresRepository implements AdminSessionRepository {
  constructor(
    @InjectRepository(AdminSessionEntity)
    private readonly repo: Repository<AdminSessionEntity>,
  ) {}

  async create(
    session: Omit<AdminSession, 'id' | 'createdAt'>,
  ): Promise<AdminSession> {
    const entity = this.repo.create(session);
    const saved = await this.repo.save(entity);
    return this.toAdminSession(saved);
  }

  async findByToken(token: string): Promise<AdminSession | null> {
    const entity = await this.repo.findOne({ where: { token } });
    return entity ? this.toAdminSession(entity) : null;
  }

  async deleteByAdminUserId(adminUserId: string): Promise<void> {
    await this.repo.delete({ adminUserId });
  }

  private toAdminSession(e: AdminSessionEntity): AdminSession {
    return {
      id: e.id,
      adminUserId: e.adminUserId,
      token: e.token,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      expiresAt: e.expiresAt,
      createdAt: e.createdAt,
    };
  }
}
