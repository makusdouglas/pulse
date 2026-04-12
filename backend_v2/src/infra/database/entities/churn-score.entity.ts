import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MemberEntity } from './member.entity';
import { GymEntity } from './gym.entity';

@Entity('churn_scores')
@Unique(['memberId', 'computedAt'])
export class ChurnScoreEntity {
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

  @Column({ type: 'int' })
  score: number;

  @Column({ length: 10 })
  tier: string;

  @Column({ type: 'jsonb', default: '[]' })
  reasons: string[];

  @Column({ length: 10, default: 'rules' })
  origin: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
