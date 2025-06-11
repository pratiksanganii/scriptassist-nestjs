import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { OverdueTasksService } from './overdue-tasks.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { Task } from '@modules/tasks/entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BULL_QUEUES } from '@config/bull.config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: BULL_QUEUES.TASK_PROCESSING,
    }),
    TasksModule,
    TypeOrmModule.forFeature([Task]), // Dependency added
  ],
  providers: [OverdueTasksService],
  exports: [OverdueTasksService],
})
export class ScheduledTasksModule {}
