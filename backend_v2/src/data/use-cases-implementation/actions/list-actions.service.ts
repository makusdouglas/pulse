import { Injectable } from '@nestjs/common';
import {
  ListActions,
  ListActionsResponse,
} from '../../../domain/use-cases/actions/list-actions';
import { ActionRepository } from '../../protocols/action-repository';
import { ActionResult } from '../../../domain/enums';

@Injectable()
export class ListActionsService implements ListActions {
  constructor(private readonly actionRepo: ActionRepository) {}

  async execute(
    gymId: string,
    filters: { memberId?: string; page?: number; pageSize?: number },
  ): Promise<ListActionsResponse> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const { actions, total } = await this.actionRepo.findByGym(gymId, {
      memberId: filters.memberId,
      page,
      pageSize,
    });
    return {
      actions: actions.map((a) => ({
        ...a,
        result: a.result as ActionResult | null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
