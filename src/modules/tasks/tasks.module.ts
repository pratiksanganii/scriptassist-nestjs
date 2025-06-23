import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullQueueModule } from '../bullqueue/bullqueue.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { RedisService } from '../../database/redis/redis.service';
import { CommonService } from '../../common/services/common.service';
import { ORMService } from '../../database/orm.service';
import { NotificationService } from '../../queues/notification/notification.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), BullQueueModule],
  controllers: [TasksController],
  providers: [TasksService, RedisService, CommonService, ORMService, NotificationService],
})
export class TasksModule {}
