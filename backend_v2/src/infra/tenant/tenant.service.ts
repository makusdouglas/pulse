import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private readonly dataSource: DataSource) {}

  async resolveGymId(clerkOrgId: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const existing = await queryRunner.query(
        'SELECT id::text AS id FROM gyms WHERE clerk_org_id = $1',
        [clerkOrgId],
      );

      if (existing.length > 0) {
        return existing[0].id;
      }

      const inserted = await queryRunner.query(
        `INSERT INTO gyms (clerk_org_id, name, slug)
         VALUES ($1, $2, $3)
         ON CONFLICT (clerk_org_id) DO NOTHING
         RETURNING id::text AS id`,
        [clerkOrgId, 'My Gym', clerkOrgId],
      );

      if (inserted.length > 0) {
        this.logger.log(
          `Auto-provisioned gym for clerk_org_id=${clerkOrgId}`,
        );
        return inserted[0].id;
      }

      const fallback = await queryRunner.query(
        'SELECT id::text AS id FROM gyms WHERE clerk_org_id = $1',
        [clerkOrgId],
      );

      if (fallback.length > 0) {
        return fallback[0].id;
      }

      throw new InternalServerErrorException(
        'Failed to resolve gym for this organization',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
