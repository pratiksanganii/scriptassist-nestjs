import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullMQHealthIndicator } from './indicators/bullmq.health';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database.module';
import { BullQueueModule } from '../bullqueue/bullqueue.module';

@Module({
  imports: [TerminusModule, DatabaseModule, BullQueueModule, ConfigModule],
  controllers: [HealthController],
  providers: [BullMQHealthIndicator],
})
export class HealthModule {}
