import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymEntity } from '../entities/gym.entity';
import { ClerkSeed } from './clerk.seed';
import { GymSeed } from './gym.seed';
import { AdminUserSeed } from './admin-user.seed';
import { SeedRunner } from './seed.runner';

@Module({
  imports: [TypeOrmModule.forFeature([GymEntity])],
  providers: [ClerkSeed, GymSeed, AdminUserSeed, SeedRunner],
  exports: [SeedRunner],
})
export class SeedsModule {}
