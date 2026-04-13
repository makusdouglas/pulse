import { Module } from '@nestjs/common';
import { InfraModule } from '../../../infra/infra.module';
import { ListActions } from '../../../domain/use-cases/actions/list-actions';
import { CreateAction } from '../../../domain/use-cases/actions/create-action';
import { ListActionsService } from './list-actions.service';
import { CreateActionService } from './create-action.service';

@Module({
  imports: [InfraModule],
  providers: [
    { provide: ListActions, useClass: ListActionsService },
    { provide: CreateAction, useClass: CreateActionService },
  ],
  exports: [ListActions, CreateAction],
})
export class ActionsUseCasesModule {}
