import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export abstract class BaseProcessor extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  constructor() {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      const result = await this.handle(job);
      this.logger.debug(`Successfully processed job ${job.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected job processing error';
      this.logger.error(`Job ${job.id} failed: ${errorMessage}`);
      if (this.isNonRetryable(error)) {
        this.logger.warn(`Non-retryable error for job ${job.id}: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      throw error;
    }
  }

  protected isNonRetryable(error: unknown): boolean {
    const message = error instanceof Error ? error.message : '';
    return message.includes('Invalid user') || message.includes('Missing email');
  }

  // Force child to implement this
  protected abstract handle(job: Job): Promise<unknown>;
}
