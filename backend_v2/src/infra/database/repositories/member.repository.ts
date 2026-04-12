import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MemberRepository,
  ListMembersParams,
  ListMembersResult,
} from '../../../data/protocols/member-repository';
import { Member } from '../../../domain/entities';
import { MemberEntity } from '../entities/member.entity';
import { MemberStatus } from '../../../domain/enums';

@Injectable()
export class MemberPostgresRepository implements MemberRepository {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly repo: Repository<MemberEntity>,
  ) {}

  async findByGym(params: ListMembersParams): Promise<ListMembersResult> {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.gym_id = :gymId', { gymId: params.gymId });

    if (params.status) {
      qb.andWhere('m.status = :status', { status: params.status });
    }
    if (params.search) {
      qb.andWhere('(m.name ILIKE :search OR m.email ILIKE :search)', {
        search: `%${params.search}%`,
      });
    }

    const [members, total] = await qb
      .orderBy('m.name', 'ASC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize)
      .getManyAndCount();

    return { members: members.map(this.toMember), total };
  }

  async findById(gymId: string, memberId: string): Promise<Member | null> {
    const entity = await this.repo.findOne({
      where: { id: memberId, gymId },
    });
    return entity ? this.toMember(entity) : null;
  }

  async findEmailMap(
    gymId: string,
    emails: string[],
  ): Promise<Map<string, string>> {
    if (emails.length === 0) return new Map();

    const members = await this.repo
      .createQueryBuilder('m')
      .select(['m.id', 'm.email'])
      .where('m.gym_id = :gymId', { gymId })
      .andWhere('LOWER(m.email) IN (:...emails)', {
        emails: emails.map((e) => e.toLowerCase()),
      })
      .getMany();

    const map = new Map<string, string>();
    for (const m of members) {
      if (m.email) map.set(m.email.toLowerCase(), m.id);
    }
    return map;
  }

  private toMember(e: MemberEntity): Member {
    return {
      id: e.id,
      gymId: e.gymId,
      name: e.name,
      email: e.email,
      phone: e.phone,
      enrolledAt: e.enrolledAt,
      cancelledAt: e.cancelledAt,
      status: e.status as MemberStatus,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
