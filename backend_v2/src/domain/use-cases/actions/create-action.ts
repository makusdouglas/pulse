import { ActionChannel } from '../../enums';
import { Action } from '../../entities';

export interface CreateActionInput {
  memberId: string;
  actionType: string;
  channel: ActionChannel;
  message?: string;
}

export abstract class CreateAction {
  abstract execute(gymId: string, input: CreateActionInput): Promise<Action>;
}
