import { Module } from '@nestjs/common';
import { ActionsUseCasesModule } from '../../../data/use-cases-implementation/actions/actions-use-cases.module';
import { LoadActionsController } from './load-actions/controller';
import { CreateActionController } from './create-action/controller';

@Module({
  imports: [ActionsUseCasesModule],
  controllers: [LoadActionsController, CreateActionController],
})
export class ActionsModule {}
