import { BaseProcessor } from '../common/base-processor.service';
import { Job } from 'bullmq';
import { TASK_JOB_TYPE, TASK_JOBS } from 'src/globals';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { TasksService } from 'src/modules/tasks/tasks.service';
import { UUID } from 'crypto';
import { Processor } from '@nestjs/bullmq';
import { BULL_QUEUES } from 'src/config/bull.config';

@Processor(BULL_QUEUES.TASK_PROCESSING)
export class TaskProcessorService extends BaseProcessor {
  constructor(private readonly taskService: TasksService) {
    super(); // calls the parent constructor
  }

  protected async handle(job: Job<Partial<Task>, Promise<unknown>, TASK_JOB_TYPE>) {
    switch (job.name) {
      case TASK_JOBS.CREATE_TASK:
        await this.taskService.commonCreateTask(job.data);
        return { success: true, message: 'Task created' };
      case TASK_JOBS.UPDATE_TASK:
        await this.taskService.update(job.data.id as UUID, job.data);
        return { success: true, message: 'Task updated' };
      case TASK_JOBS.DELETE_TASK:
        await this.taskService.remove(job.data.id as UUID);
        return { success: true, message: 'Task deleted' };
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { success: false, error: 'Unknown job type' };
    }
  }
}
