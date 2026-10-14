import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity.js';
import { ReminderStatus } from '../enums/reminder-status.enum.js';

@Entity('reminder_history')
@Unique(['subscriptionId', 'targetBillingDate'])
export class ReminderHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @ManyToOne(() => Subscription, (sub) => sub.reminders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Relation<Subscription>;

  @Column({ type: 'date' })
  targetBillingDate: Date;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
  })
  status: ReminderStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  sentAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;
}
