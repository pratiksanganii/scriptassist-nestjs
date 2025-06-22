import { Module } from '@nestjs/common';
import { TaskProcessorModule } from '../task-processor/task-processor.module';
import { NotificationModule } from '../notification/notification.module';
import { BullQueueModule } from 'src/modules/bullqueue/bullqueue.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Task } from 'src/modules/tasks/entities/task.entity';
import { CommonService } from 'src/common/services/common.service';
import { Notification } from '../notification/entities/notification-log.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({ isGlobal: true }),
    BullQueueModule,
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [Task, User, Notification],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TaskProcessorModule,
    NotificationModule,
  ],
  providers: [CommonService],
})
export class WorkerModule {}
