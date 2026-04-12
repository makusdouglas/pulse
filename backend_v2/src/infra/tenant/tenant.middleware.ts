import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const clerkOrgId = (req as any).clerkOrgId as string | undefined;

    if (!clerkOrgId) {
      throw new UnauthorizedException('Tenant context not available');
    }

    const gymUuid = await this.tenantService.resolveGymId(clerkOrgId);

    (req as any).gymUuid = gymUuid;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('SET LOCAL app.current_gym_id = $1', [gymUuid]);
    await queryRunner.release();

    next();
  }
}
