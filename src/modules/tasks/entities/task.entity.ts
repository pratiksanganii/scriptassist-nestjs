import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskDelete, TaskPriority } from '../enums/task-priority.enum';
import { Notification } from '../../../queues/notification/entities/notification-log.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'smallint', nullable: false, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'smallint', nullable: false, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({
    type: 'smallint',
    name: 'task_delete',
    default: TaskDelete.NOT_DELETED,
    nullable: false,
  })
  taskDelete: TaskDelete;

  @Column({ name: 'due_date', nullable: true })
  dueDate: Date;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.tasks)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  // last updated or removed by which admin or user himself, in case if user is registered by himself
  @Column({ name: 'last_action_by', nullable: false })
  lastActionBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'last_action_by' })
  lastActionUser: User;
}
