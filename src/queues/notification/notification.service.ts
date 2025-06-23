import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULL_QUEUES } from '../../config/bull.config';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { JOB_CONFIG, NOTIFICATION_JOB_TYPE, NOTIFICATION_JOBS } from 'src/globals';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(BULL_QUEUES.NOTIFICATION_PROCESSING)
    private readonly notificationQueue: Queue,
  ) {}

  private async commonQueue(task: Task, jobType: NOTIFICATION_JOB_TYPE) {
    // create dynamic jobId to ensure each task notification is unique
    // in case of update task notification manage unique by including status in jobId
    const jobId =
      `${jobType}_${task.id}` + (jobType == NOTIFICATION_JOBS.UPDATE_TASK ? `_${task.status}` : '');
    await this.notificationQueue.add(
      jobType,
      { task },
      // manage unique jobIds
      { jobId, ...JOB_CONFIG },
    );
  }

  async notifyTaskCreate(task: Task) {
    return await this.commonQueue(task, NOTIFICATION_JOBS.CREATE_TASK);
  }

  async notifyTaskStatusUpate(task: Task) {
    return await this.commonQueue(task, NOTIFICATION_JOBS.UPDATE_TASK);
  }

  // we only get deleted id
  async notifyTaskDelete(task: { id: string }) {
    return await this.commonQueue(task as Task, NOTIFICATION_JOBS.DELETE_TASK);
  }
}
