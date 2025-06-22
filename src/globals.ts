import { HttpException, HttpStatus } from '@nestjs/common';
import { BulkJobOptions } from 'bullmq';

//#region notification queue constants
export const NOTIFICATION_JOBS = {
  CREATE_TASK: 'notify-create-task',
  UPDATE_TASK: 'notify-update-task',
  DELETE_TASK: 'notify-delete-task',
};
export type NOTIFICATION_JOB_TYPE = (typeof NOTIFICATION_JOBS)[keyof typeof NOTIFICATION_JOBS];

//#endregion

// default Job config for all queues
export const JOB_CONFIG: BulkJobOptions = {
  removeOnComplete: process.env.NODE_ENV === 'production' ? true : 100, // get last 100 jobs for debugging in development
  removeOnFail: false, // keep failed jobs
  attempts: 3, // retry 3 times (1 + 2)
  backoff: { type: 'exponential', delay: 3000 }, //
};

//#region task queue constants
export const TASK_JOBS = {
  CREATE_TASK: 'create-task',
  UPDATE_TASK: 'update-task',
  DELETE_TASK: 'delete-task',
};
export type TASK_JOB_TYPE = (typeof TASK_JOBS)[keyof typeof TASK_JOBS];
//#endregion

export const MissingParameters = (object: Record<string, unknown>, required: string[]) => {
  const find = required.find(param => [null, undefined].includes(object[param] as any));
  if (find) throw new HttpException(`Provide valid ${find} parameter`, HttpStatus.BAD_REQUEST);
};
