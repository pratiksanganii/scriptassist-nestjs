import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullQueueModule } from '../../modules/bullqueue/bullqueue.module';
import { OverdueTasksService } from './overdue-tasks.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullQueueModule,
    TasksModule,
    TypeOrmModule.forFeature([Task]), // Dependency added
  ],
  providers: [OverdueTasksService],
  exports: [OverdueTasksService],
})
export class ScheduledTasksModule {}
