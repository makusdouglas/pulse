import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MemberEntity } from './member.entity';
import { GymEntity } from './gym.entity';

@Entity('actions_log')
export class ActionEntity {
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

  @Column({ name: 'action_type', length: 50 })
  actionType: string;

  @Column({ length: 30, default: 'whatsapp' })
  channel: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'now()' })
  sentAt: Date;

  @Column({ length: 30, nullable: true })
  result: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
