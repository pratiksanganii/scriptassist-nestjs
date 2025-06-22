import { Module } from '@nestjs/common';
import { TaskProcessorService } from './task-processor.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { TasksService } from '../../modules/tasks/tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { ORMService } from '../../database/orm.service';
import { CommonService } from 'src/common/services/common.service';
import { BullQueueModule } from 'src/modules/bullqueue/bullqueue.module';
import { NotificationService } from '../notification/notification.service';
import { User } from 'src/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), TasksModule, BullQueueModule],
  providers: [TaskProcessorService, TasksService, ORMService, CommonService, NotificationService],
  exports: [TaskProcessorService],
})
export class TaskProcessorModule {}
