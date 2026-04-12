import { ActionChannel, ActionResult } from '../enums';

export interface Action {
  id: string;
  memberId: string;
  gymId: string;
  actionType: string;
  channel: ActionChannel;
  message: string | null;
  sentAt: Date;
  result: ActionResult | null;
  createdAt: Date;
}
