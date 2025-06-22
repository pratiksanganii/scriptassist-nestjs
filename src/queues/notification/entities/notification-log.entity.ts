import { forwardRef } from '@nestjs/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  ObjectType,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(
    () =>
      forwardRef(
        () => require('../../../modules/users/entities/user.entity').User,
      ) as unknown as ObjectType<any>,
    user => user.notifications,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user: import('../../../modules/users/entities/user.entity').User;

  @Column()
  type: string;

  @Column()
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(
    () =>
      forwardRef(
        () => require('../../../modules/tasks/entities/task.entity').Task,
      ) as unknown as ObjectType<any>,
    task => task.notifications,
    { nullable: true, onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'task_id' })
  task: any;
}
