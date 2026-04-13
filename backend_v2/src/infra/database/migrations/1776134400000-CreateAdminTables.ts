import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminTables1776134400000 implements MigrationInterface {
  name = 'CreateAdminTables1776134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'support',
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_admin_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_admin_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_user_id" uuid NOT NULL,
        "token" character varying(500) NOT NULL,
        "ip_address" character varying(50),
        "user_agent" character varying(500),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_admin_sessions_token" UNIQUE ("token"),
        CONSTRAINT "PK_admin_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_sessions"
        ADD CONSTRAINT "FK_admin_sessions_admin_user"
        FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_token" ON "admin_sessions" ("token")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_admin_sessions_expires" ON "admin_sessions" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_admin_sessions_expires"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_sessions_token"`);
    await queryRunner.query(
      `ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "FK_admin_sessions_admin_user"`,
    );
    await queryRunner.query(`DROP TABLE "admin_sessions"`);
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}
