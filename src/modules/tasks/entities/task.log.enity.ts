import { UUID } from 'crypto';
import { User } from '../../../modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_logs')
export class TaskLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'task_id', nullable: false })
  taskId: UUID;

  @Column({ type: 'smallint', nullable: false })
  actionType: number; // refer  TaskLogType

  @Column({ name: 'updated_fields', type: 'jsonb', nullable: false })
  updatedFields: Partial<Task>;

  @Column({ name: 'action_by', type: 'uuid', nullable: false })
  actionBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'action_by' })
  actionByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
