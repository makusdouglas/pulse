import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ActionRepository,
  ActionWithMember,
  CreateActionParams,
} from '../../../data/protocols/action-repository';
import { Action } from '../../../domain/entities';
import { ActionEntity } from '../entities/action.entity';
import { ActionChannel } from '../../../domain/enums';

@Injectable()
export class ActionPostgresRepository implements ActionRepository {
  constructor(
    @InjectRepository(ActionEntity)
    private readonly repo: Repository<ActionEntity>,
    private readonly ds: DataSource,
  ) {}

  async findByGym(
    gymId: string,
    filters: { memberId?: string; page: number; pageSize: number },
  ): Promise<{ actions: ActionWithMember[]; total: number }> {
    const conditions = ['a.gym_id = $1'];
    const params: unknown[] = [gymId];

    if (filters.memberId) {
      params.push(filters.memberId);
      conditions.push(`a.member_id = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, countRow] = await Promise.all([
      this.ds.query(
        `SELECT a.id, a.member_id, m.name AS member_name, a.action_type,
                a.channel, a.message, a.sent_at, a.result
         FROM actions_log a JOIN members m ON m.id = a.member_id
         WHERE ${where} ORDER BY a.sent_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, filters.pageSize, offset],
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS total FROM actions_log a WHERE ${where}`,
        params,
      ),
    ]);

    return {
      actions: rows.map((r: any) => ({
        id: r.id,
        memberId: r.member_id,
        memberName: r.member_name,
        actionType: r.action_type,
        channel: r.channel as ActionChannel,
        message: r.message,
        sentAt: r.sent_at,
        result: r.result,
      })),
      total: countRow[0]?.total ?? 0,
    };
  }

  async create(params: CreateActionParams): Promise<Action> {
    const entity = this.repo.create({
      gymId: params.gymId,
      memberId: params.memberId,
      actionType: params.actionType,
      channel: params.channel,
      message: params.message ?? null,
    });
    const saved = await this.repo.save(entity);
    return {
      id: saved.id,
      memberId: saved.memberId,
      gymId: saved.gymId,
      actionType: saved.actionType,
      channel: saved.channel as ActionChannel,
      message: saved.message,
      sentAt: saved.sentAt,
      result: null,
      createdAt: saved.createdAt,
    };
  }
}
