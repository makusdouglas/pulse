import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { InfraModule } from '../../../infra/infra.module';
import { ScoringUseCasesModule } from '../../../data/use-cases-implementation/scoring/scoring-use-cases.module';

@Module({
  imports: [InfraModule, ScoringUseCasesModule],
  controllers: [MembersController],
})
export class MembersControllersModule {}
