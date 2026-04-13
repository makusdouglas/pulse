import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { ScoringUseCasesModule } from '../scoring/scoring-use-cases.module';
import { ListMembers } from '../../../domain/use-cases/members/list-members';
import { GetMemberScore } from '../../../domain/use-cases/members/get-member-score';
import { ListMembersService } from './list-members.service';
import { GetMemberScoreService } from './get-member-score.service';

@Module({
  imports: [InfraModule, ScoringUseCasesModule],
  providers: [
    { provide: ListMembers, useClass: ListMembersService },
    { provide: GetMemberScore, useClass: GetMemberScoreService },
  ],
  exports: [ListMembers, GetMemberScore],
})
export class MembersUseCasesModule {}
