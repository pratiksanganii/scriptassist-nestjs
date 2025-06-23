import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';
import { Task } from '../../../modules/tasks/entities/task.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.notifications, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  type: string;

  @Column()
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Task, task => task.notifications, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
