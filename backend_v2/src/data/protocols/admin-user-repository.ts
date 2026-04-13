import { AdminUser } from '../../domain/entities';

export abstract class AdminUserRepository {
  abstract findByEmail(
    email: string,
  ): Promise<(AdminUser & { passwordHash: string }) | null>;
  abstract findById(id: string): Promise<AdminUser | null>;
  abstract updateLastLogin(id: string, date: Date): Promise<void>;
}
