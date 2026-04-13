import { DataSource } from 'typeorm';
import { ENV } from '../config/env';
import { GymEntity } from './entities/gym.entity';
import { MemberEntity } from './entities/member.entity';
import { CheckinEntity } from './entities/checkin.entity';
import { PaymentEntity } from './entities/payment.entity';
import { MemberFeaturesEntity } from './entities/member-features.entity';
import { ChurnScoreEntity } from './entities/churn-score.entity';
import { ActionEntity } from './entities/action.entity';
import { NotificationEntity } from './entities/notification.entity';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AdminSessionEntity } from './entities/admin-session.entity';

export default new DataSource({
  type: 'postgres',
  url: ENV.DATABASE_URL,
  entities: [
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
  ],
  migrations: ['src/infra/database/migrations/*.ts'],
  synchronize: false,
});
