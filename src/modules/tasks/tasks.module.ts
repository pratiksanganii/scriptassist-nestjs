import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { BULL_QUEUES } from '@config/bull.config';
import { RedisService } from '@database/redis/redis.service';
import { CommonService } from '@common/services/common.service';
import { ORMService } from '@database/orm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({ name: BULL_QUEUES.TASK_PROCESSING }),
  ],
  controllers: [TasksController],
  providers: [TasksService, RedisService, CommonService, ORMService],
  exports: [TasksService],
})
export class TasksModule {}
