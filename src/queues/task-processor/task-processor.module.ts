import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskProcessorService } from './task-processor.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { BULL_QUEUES } from '@config/bull.config';

@Module({
  imports: [BullModule.registerQueue({ name: BULL_QUEUES.TASK_PROCESSING }), TasksModule],
  providers: [TaskProcessorService],
  exports: [TaskProcessorService],
})
export class TaskProcessorModule {}
