import { AdminSession } from '../../domain/entities';

export abstract class AdminSessionRepository {
  abstract create(
    session: Omit<AdminSession, 'id' | 'createdAt'>,
  ): Promise<AdminSession>;
  abstract findByToken(token: string): Promise<AdminSession | null>;
  abstract deleteByAdminUserId(adminUserId: string): Promise<void>;
}
