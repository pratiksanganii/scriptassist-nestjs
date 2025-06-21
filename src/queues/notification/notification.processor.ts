import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '../../config/bull.config';
import { BaseProcessor } from '../common/base-processor.service';

@Processor(BULL_QUEUES.NOTIFICATION_PROCESSING)
export class NotificationProcessor extends BaseProcessor {
  protected async handle(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'task-status-update':
        return await this.handleStatusUpdate(job.data);
      case 'overdue-tasks-notification':
        return await this.handleOverdueTasks(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { success: false, error: 'Unknown job type' };
    }
  }

  private async handleStatusUpdate(data: { taskId: string; userId: string; status: string }) {
    // Email logic
    return { success: true };
  }

  private async handleOverdueTasks(data: { userId: string }) {
    // Reminder logic
    return { success: true };
  }
}
