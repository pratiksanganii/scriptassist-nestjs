import { Module } from '@nestjs/common';
import { TaskProcessorModule } from '../task-processor/task-processor.module';
import { NotificationModule } from '../notification/notification.module';
import { BullQueueModule } from 'src/modules/bullqueue/bullqueue.module';
import { ConfigModule } from '@nestjs/config';
import { CommonService } from 'src/common/services/common.service';
import { DatabaseModule } from 'src/modules/database.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),
    BullQueueModule,
    // Database
    DatabaseModule,
    TaskProcessorModule,
    NotificationModule,
  ],
  providers: [CommonService],
})
export class WorkerModule {}
