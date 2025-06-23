import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '../../config/bull.config';
import { BaseProcessor } from '../common/base-processor.service';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { NOTIFICATION_JOB_TYPE, NOTIFICATION_JOBS } from 'src/globals';
import { TaskStatus } from 'src/modules/tasks/enums/task-status.enum';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification-log.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Processor(BULL_QUEUES.NOTIFICATION_PROCESSING)
export class NotificationProcessor extends BaseProcessor {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {
    super();
  }

  protected async handle(job: Job<Task, Promise<unknown>, NOTIFICATION_JOB_TYPE>) {
    switch (job.name) {
      case NOTIFICATION_JOBS.CREATE_TASK:
        return await this.sendCreateTaskNotification(job.data);
      case NOTIFICATION_JOBS.UPDATE_TASK:
        return await this.sendTaskStatusUpdateNotification(job.data);
      case NOTIFICATION_JOBS.DELETE_TASK:
        return await this.sendTaskDeleteNotification(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return { success: false, error: 'Unknown job type' };
    }
  }

  //#region send create task notification
  private async sendCreateTaskNotification(data: Task) {
    const create = {
      taskId: data.id,
      userId: data.userId,
      type: NOTIFICATION_JOBS.DELETE_TASK,
      message: `Task created with title ${data.title}`,
    };
    const newTask = this.notificationRepository.create(create);
    await this.notificationRepository.save(newTask);
    return { success: true, message: 'Create task notification sent' };
  }
  //#endregion

  //#region send create task notification
  private async sendTaskStatusUpdateNotification(data: Task) {
    const create = {
      taskId: data.id,
      userId: data.userId,
      type: NOTIFICATION_JOBS.UPDATE_TASK,
      message: `Task with title ${data.title} status updated to ${TaskStatus[data.status]}`,
    };
    const newTask = this.notificationRepository.create(create);
    await this.notificationRepository.save(newTask);
    return { success: true, message: 'Update task status notification sent' };
  }
  //#endregion

  //#region send task delete notification
  private async sendTaskDeleteNotification(data: Task) {
    // at delete time we only get id on delete task so need to fetch title from db for notification message
    const task = await this.tasksRepository.findOne({
      where: { id: data.id },
      select: { id: true, userId: true, title: true },
    });
    if (!task) throw new Error('Task not found');
    const create = {
      taskId: task.id,
      userId: task.userId,
      type: NOTIFICATION_JOBS.DELETE_TASK,
      message: `Task with title ${task.title} deleted`,
    };
    const newTask = this.notificationRepository.create(create);
    await this.notificationRepository.save(newTask);
    return { success: true, message: 'Task delete notification sent' };
  }
  //#endregion
}
