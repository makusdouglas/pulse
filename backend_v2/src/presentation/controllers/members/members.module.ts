import { Module } from '@nestjs/common';
import { MembersUseCasesModule } from '../../../data/use-cases-implementation/members/members-use-cases.module';
import { LoadMembersController } from './load-members/controller';
import { LoadMemberScoreController } from './load-member-score/controller';

@Module({
  imports: [MembersUseCasesModule],
  controllers: [LoadMembersController, LoadMemberScoreController],
})
export class MembersModule {}
