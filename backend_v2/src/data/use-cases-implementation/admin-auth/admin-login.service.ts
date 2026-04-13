import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  AdminLogin,
  AdminLoginInput,
  AdminLoginOutput,
} from '../../../domain/use-cases/admin-auth/admin-login';
import { AdminUserRepository } from '../../protocols/admin-user-repository';
import { AdminSessionRepository } from '../../protocols/admin-session-repository';
import { ENV } from '../../../infra/config/env';

const TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class AdminLoginService implements AdminLogin {
  constructor(
    private readonly adminUserRepo: AdminUserRepository,
    private readonly adminSessionRepo: AdminSessionRepository,
  ) {}

  async execute(input: AdminLoginInput): Promise<AdminLoginOutput> {
    const user = await this.adminUserRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, ENV.ADMIN_JWT_SECRET, {
      expiresIn: `${TOKEN_EXPIRY_HOURS}h`,
    });

    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.adminSessionRepo.create({
      adminUserId: user.id,
      token,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    });

    await this.adminUserRepo.updateLastLogin(user.id, new Date());

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: new Date(),
      },
    };
  }
}
