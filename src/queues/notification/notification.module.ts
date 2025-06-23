import { Module } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { BullQueueModule } from 'src/modules/bullqueue/bullqueue.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification-log.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';

@Module({
  imports: [BullQueueModule, TypeOrmModule.forFeature([Task, Notification])],
  providers: [NotificationProcessor],
})
export class NotificationModule {}
