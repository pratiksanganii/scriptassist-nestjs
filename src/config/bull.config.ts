import { registerAs } from '@nestjs/config';

export const BULL_QUEUES = { TASK_PROCESSING: 'task-processing' };

export default registerAs('bull', () => ({
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
}));
