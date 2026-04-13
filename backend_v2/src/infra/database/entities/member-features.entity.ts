import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MemberEntity } from './member.entity';
import { GymEntity } from './gym.entity';

@Entity('member_features')
@Unique(['memberId', 'computedAt'])
export class MemberFeaturesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => MemberEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: MemberEntity;

  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => GymEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: GymEntity;

  @Column({ name: 'computed_at', type: 'date', default: () => 'CURRENT_DATE' })
  computedAt: Date;

  @Column({ name: 'days_without_checkin', type: 'int', default: 0 })
  daysWithoutCheckin: number;

  @Column({ name: 'freq_last_30d', type: 'int', default: 0 })
  freqLast30d: number;

  @Column({ name: 'freq_prev_30d', type: 'int', default: 0 })
  freqPrev30d: number;

  @Column({
    name: 'freq_trend',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  freqTrend: number;

  @Column({
    name: 'avg_duration_min',
    type: 'numeric',
    precision: 5,
    scale: 1,
    nullable: true,
  })
  avgDurationMin: number | null;

  @Column({ name: 'overdue_payments', type: 'int', default: 0 })
  overduePayments: number;

  @Column({ name: 'months_enrolled', type: 'int', default: 0 })
  monthsEnrolled: number;
}
