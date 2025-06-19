import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullQueueModule } from '../bullqueue/bullqueue.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { RedisService } from '../../database/redis/redis.service';
import { CommonService } from '../../common/services/common.service';
import { ORMService } from '../../database/orm.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), BullQueueModule],
  controllers: [TasksController],
  providers: [TasksService, RedisService, CommonService, ORMService],
  exports: [TasksService],
})
export class TasksModule {}
