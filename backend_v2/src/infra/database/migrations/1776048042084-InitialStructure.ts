import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialStructure1776048042084 implements MigrationInterface {
    name = 'InitialStructure1776048042084'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "gyms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(100) NOT NULL, "email" character varying(255), "phone" character varying(30), "clerk_org_id" character varying(255), "timezone" character varying(50) NOT NULL DEFAULT 'America/Sao_Paulo', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f048c4d4b9d5e1cc25cd1db8ba1" UNIQUE ("slug"), CONSTRAINT "UQ_c03870aef7d0bf89d4a9a99144f" UNIQUE ("clerk_org_id"), CONSTRAINT "PK_fe765086496cf3c8475652cddcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gym_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "email" character varying(255), "phone" character varying(30), "enrolled_at" date NOT NULL DEFAULT ('now'::text)::date, "cancelled_at" date, "status" character varying(20) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "checkins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "gym_id" uuid NOT NULL, "ts" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "duration_min" integer, CONSTRAINT "PK_99c62633386398b154840f0708c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "gym_id" uuid NOT NULL, "due_date" date NOT NULL, "paid_at" date, "amount" numeric(10,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "member_features" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "gym_id" uuid NOT NULL, "computed_at" date NOT NULL DEFAULT ('now'::text)::date, "days_without_checkin" integer NOT NULL DEFAULT '0', "freq_last_30d" integer NOT NULL DEFAULT '0', "freq_prev_30d" integer NOT NULL DEFAULT '0', "freq_trend" numeric(5,2) NOT NULL DEFAULT '0', "avg_duration_min" numeric(5,1), "overdue_payments" integer NOT NULL DEFAULT '0', "months_enrolled" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_63eb5f4b0588cc6b252b1115f86" UNIQUE ("member_id", "computed_at"), CONSTRAINT "PK_fb2c3da0a067bed7623f4981c07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "churn_scores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "gym_id" uuid NOT NULL, "computed_at" date NOT NULL DEFAULT ('now'::text)::date, "score" integer NOT NULL, "tier" character varying(10) NOT NULL, "reasons" jsonb NOT NULL DEFAULT '[]', "origin" character varying(10) NOT NULL DEFAULT 'rules', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_871496cff7bedb308177a7159cc" UNIQUE ("member_id", "computed_at"), CONSTRAINT "PK_68ea8cd9e346c1339017a3b390f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "actions_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "member_id" uuid NOT NULL, "gym_id" uuid NOT NULL, "action_type" character varying(50) NOT NULL, "channel" character varying(30) NOT NULL DEFAULT 'whatsapp', "message" text, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "result" character varying(30), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_857f6922250b5e4b8e490132fea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gym_id" uuid NOT NULL, "member_id" uuid, "type" character varying(30) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_46794ac7b7b0387ea427e970df9" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "checkins" ADD CONSTRAINT "FK_84280f67a92de5800378ab7c599" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "checkins" ADD CONSTRAINT "FK_3007f22c11196c6ee7c02540c94" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_dfdbf70a291f7d0431cd606428f" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_d07fb3afe59ba136b721ce6ac98" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "member_features" ADD CONSTRAINT "FK_48778177cda7a97af2dd7b18e50" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "member_features" ADD CONSTRAINT "FK_6b09c9598b6ee3a236826282fa2" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "churn_scores" ADD CONSTRAINT "FK_17863a7c53dc693151fbb3a0617" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "churn_scores" ADD CONSTRAINT "FK_59dba5c5400b998392bff95339e" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "actions_log" ADD CONSTRAINT "FK_aafea0ad62aa074fe042346cb47" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "actions_log" ADD CONSTRAINT "FK_31dd4bbdad1132e93f7d3e557a6" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_f6f467b48b5157ae2cee89e6903" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_38ed7ae62fa481f85f21cec2624" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_38ed7ae62fa481f85f21cec2624"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_f6f467b48b5157ae2cee89e6903"`);
        await queryRunner.query(`ALTER TABLE "actions_log" DROP CONSTRAINT "FK_31dd4bbdad1132e93f7d3e557a6"`);
        await queryRunner.query(`ALTER TABLE "actions_log" DROP CONSTRAINT "FK_aafea0ad62aa074fe042346cb47"`);
        await queryRunner.query(`ALTER TABLE "churn_scores" DROP CONSTRAINT "FK_59dba5c5400b998392bff95339e"`);
        await queryRunner.query(`ALTER TABLE "churn_scores" DROP CONSTRAINT "FK_17863a7c53dc693151fbb3a0617"`);
        await queryRunner.query(`ALTER TABLE "member_features" DROP CONSTRAINT "FK_6b09c9598b6ee3a236826282fa2"`);
        await queryRunner.query(`ALTER TABLE "member_features" DROP CONSTRAINT "FK_48778177cda7a97af2dd7b18e50"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_d07fb3afe59ba136b721ce6ac98"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_dfdbf70a291f7d0431cd606428f"`);
        await queryRunner.query(`ALTER TABLE "checkins" DROP CONSTRAINT "FK_3007f22c11196c6ee7c02540c94"`);
        await queryRunner.query(`ALTER TABLE "checkins" DROP CONSTRAINT "FK_84280f67a92de5800378ab7c599"`);
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_46794ac7b7b0387ea427e970df9"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "actions_log"`);
        await queryRunner.query(`DROP TABLE "churn_scores"`);
        await queryRunner.query(`DROP TABLE "member_features"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "checkins"`);
        await queryRunner.query(`DROP TABLE "members"`);
        await queryRunner.query(`DROP TABLE "gyms"`);
    }

}
