import { ActionChannel, ActionResult } from '../../enums';

export interface ActionItem {
  id: string;
  memberId: string;
  memberName: string;
  actionType: string;
  channel: ActionChannel;
  message: string | null;
  sentAt: Date;
  result: ActionResult | null;
}

export interface ListActionsResponse {
  actions: ActionItem[];
  total: number;
  page: number;
  pageSize: number;
}

export abstract class ListActions {
  abstract execute(
    gymId: string,
    filters: { memberId?: string; page?: number; pageSize?: number },
  ): Promise<ListActionsResponse>;
}
