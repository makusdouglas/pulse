import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PaymentRepository,
  PaymentWithMember,
} from '../../../data/protocols/payment-repository';
import { PaymentStatus } from '../../../domain/enums';

@Injectable()
export class PaymentPostgresRepository implements PaymentRepository {
  constructor(private readonly ds: DataSource) {}

  async findByGym(
    gymId: string,
    filters: {
      memberId?: string;
      status?: PaymentStatus;
      page: number;
      pageSize: number;
    },
  ): Promise<{ payments: PaymentWithMember[]; total: number }> {
    const conditions = ['p.gym_id = $1'];
    const params: unknown[] = [gymId];

    if (filters.memberId) {
      params.push(filters.memberId);
      conditions.push(`p.member_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, countRow] = await Promise.all([
      this.ds.query(
        `SELECT p.id, p.member_id, m.name AS member_name, p.amount,
                p.due_date, p.paid_at, p.status
         FROM payments p JOIN members m ON m.id = p.member_id
         WHERE ${where} ORDER BY p.due_date DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, filters.pageSize, offset],
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS total FROM payments p WHERE ${where}`,
        params,
      ),
    ]);

    return {
      payments: rows.map((r: any) => ({
        id: r.id,
        memberId: r.member_id,
        memberName: r.member_name,
        amount: parseFloat(r.amount),
        dueDate: r.due_date,
        paidAt: r.paid_at,
        status: r.status as PaymentStatus,
      })),
      total: countRow[0]?.total ?? 0,
    };
  }
}
