import { Module } from '@nestjs/common';
import { TaskProcessorService } from './task-processor.service';
import { TasksModule } from '../../modules/tasks/tasks.module';
import { TasksService } from '../../modules/tasks/tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ORMService } from '../../database/orm.service';
import { BullQueueModule } from '../../modules/bullqueue/bullqueue.module';
import { CommonService } from '../../common/services/common.service';
import { User } from '../../modules/users/entities/user.entity';
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
    TypeOrmModule.forFeature([Task]),
    TasksModule,
  ],
  providers: [TaskProcessorService, TasksService, ORMService, CommonService],
  exports: [TaskProcessorService],
})
export class TaskProcessorModule {}
