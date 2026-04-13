import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymEntity } from '../entities/gym.entity';
import { MemberEntity } from '../entities/member.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { ClerkSeed } from './clerk.seed';
import { GymSeed } from './gym.seed';
import { AdminUserSeed } from './admin-user.seed';
import { MemberSeed } from './member.seed';
import { SeedRunner } from './seed.runner';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GymEntity,
      MemberEntity,
      CheckinEntity,
      PaymentEntity,
    ]),
  ],
  providers: [ClerkSeed, GymSeed, AdminUserSeed, MemberSeed, SeedRunner],
  exports: [SeedRunner],
})
export class SeedsModule {}
