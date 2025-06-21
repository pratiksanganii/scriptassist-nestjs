// src/modules/notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BULL_QUEUES } from '../../config/bull.config';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(BULL_QUEUES.NOTIFICATION_PROCESSING)
    private readonly notificationQueue: Queue,
  ) {}

  async notifyTaskStatusChange(userEmail: string, taskTitle: string, newStatus: string) {
    await this.notificationQueue.add('task-status-email', {
      email: userEmail,
      taskTitle,
      newStatus,
    });
  }
}
