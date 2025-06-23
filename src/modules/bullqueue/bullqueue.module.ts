import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import bullConfig, { BULL_QUEUES } from '../../config/bull.config';

const RegisterQueue = (name: string) =>
  BullModule.registerQueueAsync({
    name,
    imports: [ConfigModule.forFeature(bullConfig)],
    useFactory: async (configService: ConfigService) => ({
      connection: configService.get('bull.connection'), // bullmq redis connecton config
    }),
    inject: [ConfigService],
  });

// created separate module to use across modules
@Module({
  imports: [
    ConfigModule,
    RegisterQueue(BULL_QUEUES.TASK_PROCESSING),
    RegisterQueue(BULL_QUEUES.NOTIFICATION_PROCESSING),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
