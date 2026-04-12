import { Action } from '../../domain/entities';
import { ActionChannel } from '../../domain/enums';

export interface ActionWithMember {
  id: string;
  memberId: string;
  memberName: string;
  actionType: string;
  channel: ActionChannel;
  message: string | null;
  sentAt: Date;
  result: string | null;
}

export interface CreateActionParams {
  gymId: string;
  memberId: string;
  actionType: string;
  channel: ActionChannel;
  message?: string;
}

export abstract class ActionRepository {
  abstract findByGym(
    gymId: string,
    filters: { memberId?: string; page: number; pageSize: number },
  ): Promise<{ actions: ActionWithMember[]; total: number }>;
  abstract create(params: CreateActionParams): Promise<Action>;
}
