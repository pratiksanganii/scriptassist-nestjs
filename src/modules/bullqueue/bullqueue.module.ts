import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import bullConfig, { BULL_QUEUES } from '../../config/bull.config';

// created separate module to use across modules
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: BULL_QUEUES.TASK_PROCESSING,
      imports: [ConfigModule.forFeature(bullConfig)],
      useFactory: async (configService: ConfigService) => ({
        connection: configService.get('bull.connection'), // bullmq redis connecton config
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
