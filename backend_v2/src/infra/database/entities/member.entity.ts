import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GymEntity } from './gym.entity';

@Entity('members')
export class MemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => GymEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: GymEntity;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'enrolled_at', type: 'date', default: () => 'CURRENT_DATE' })
  enrolledAt: Date;

  @Column({ name: 'cancelled_at', type: 'date', nullable: true })
  cancelledAt: Date | null;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
