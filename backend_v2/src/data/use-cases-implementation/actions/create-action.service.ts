import { Injectable } from '@nestjs/common';
import {
  CreateAction,
  CreateActionInput,
} from '../../../domain/use-cases/actions/create-action';
import { Action } from '../../../domain/entities';
import { ActionRepository } from '../../protocols/action-repository';

@Injectable()
export class CreateActionService implements CreateAction {
  constructor(private readonly actionRepo: ActionRepository) {}

  async execute(gymId: string, input: CreateActionInput): Promise<Action> {
    return this.actionRepo.create({
      gymId,
      memberId: input.memberId,
      actionType: input.actionType,
      channel: input.channel,
      message: input.message,
    });
  }
}
