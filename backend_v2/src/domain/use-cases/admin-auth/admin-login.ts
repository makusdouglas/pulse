import { AdminUser } from '../../entities';

export interface AdminLoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminLoginOutput {
  token: string;
  user: Omit<AdminUser, 'createdAt' | 'updatedAt'>;
}

export abstract class AdminLogin {
  abstract execute(input: AdminLoginInput): Promise<AdminLoginOutput>;
}
