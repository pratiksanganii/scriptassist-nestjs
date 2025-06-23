// src/health/indicators/bullmq.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BULL_QUEUES } from '../../../config/bull.config';

@Injectable()
export class BullMQHealthIndicator extends HealthIndicatorService {
  constructor(
    @InjectQueue(BULL_QUEUES.TASK_PROCESSING)
    private readonly taskQueue: Queue,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      // create timeout if redis doesn't respond then throw
      const timeout = this.rejectInMs();
      let status: unknown = this.taskQueue.getJobCounts();
      status = await Promise.race([status, timeout]);
      return this.getStatus(true, (status as { [index: string]: number }).waiting);
    } catch (err) {
      return this.getStatus(false, (err as { message: string })?.message ?? '');
    }
  }

  private getStatus(up: boolean, message: string | number): HealthIndicatorResult {
    return { status: { status: up ? 'up' : 'down', message } };
  }

  private async rejectInMs(ms: number = 30000) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), ms),
    );
  }
}
