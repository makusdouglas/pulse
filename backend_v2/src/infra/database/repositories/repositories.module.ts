import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  GymEntity,
  MemberEntity,
  CheckinEntity,
  PaymentEntity,
  MemberFeaturesEntity,
  ChurnScoreEntity,
  ActionEntity,
  NotificationEntity,
  AdminUserEntity,
  AdminSessionEntity,
} from '../entities';
import { GymRepository } from '../../../data/protocols/gym-repository';
import { MemberRepository } from '../../../data/protocols/member-repository';
import { ScoreRepository } from '../../../data/protocols/score-repository';
import { FeatureRepository } from '../../../data/protocols/feature-repository';
import { PaymentRepository } from '../../../data/protocols/payment-repository';
import { ActionRepository } from '../../../data/protocols/action-repository';
import { NotificationRepository } from '../../../data/protocols/notification-repository';
import { AdminUserRepository } from '../../../data/protocols/admin-user-repository';
import { AdminSessionRepository } from '../../../data/protocols/admin-session-repository';
import { GymPostgresRepository } from './gym.repository';
import { MemberPostgresRepository } from './member.repository';
import { ScorePostgresRepository } from './score.repository';
import { FeaturePostgresRepository } from './feature.repository';
import { PaymentPostgresRepository } from './payment.repository';
import { ActionPostgresRepository } from './action.repository';
import { NotificationPostgresRepository } from './notification.repository';
import { AdminUserPostgresRepository } from './admin-user.repository';
import { AdminSessionPostgresRepository } from './admin-session.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GymEntity,
      MemberEntity,
      CheckinEntity,
      PaymentEntity,
      MemberFeaturesEntity,
      ChurnScoreEntity,
      ActionEntity,
      NotificationEntity,
      AdminUserEntity,
      AdminSessionEntity,
    ]),
  ],
  providers: [
    { provide: GymRepository, useClass: GymPostgresRepository },
    { provide: MemberRepository, useClass: MemberPostgresRepository },
    { provide: ScoreRepository, useClass: ScorePostgresRepository },
    { provide: FeatureRepository, useClass: FeaturePostgresRepository },
    { provide: PaymentRepository, useClass: PaymentPostgresRepository },
    { provide: ActionRepository, useClass: ActionPostgresRepository },
    {
      provide: NotificationRepository,
      useClass: NotificationPostgresRepository,
    },
    { provide: AdminUserRepository, useClass: AdminUserPostgresRepository },
    {
      provide: AdminSessionRepository,
      useClass: AdminSessionPostgresRepository,
    },
  ],
  exports: [
    GymRepository,
    MemberRepository,
    ScoreRepository,
    FeatureRepository,
    PaymentRepository,
    ActionRepository,
    NotificationRepository,
    AdminUserRepository,
    AdminSessionRepository,
  ],
})
export class RepositoriesModule {}
