import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduledTasksModule } from './queues/scheduled-tasks/scheduled-tasks.module';
import { CacheService } from './common/services/cache.service';
import { ORMService } from './database/orm.service';
import { DatabaseModule } from './modules/database.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database
    DatabaseModule,

    HealthModule,

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    UsersModule,
    TasksModule,
    AuthModule,
    ScheduledTasksModule,
  ],
  providers: [
    // Inefficient: Global cache service with no configuration options
    // This creates a single in-memory cache instance shared across all modules
    CacheService,
    ORMService,
  ],
  exports: [
    // Exporting the cache service makes it available to other modules
    // but creates tight coupling
    CacheService,
    ORMService,
  ],
})
export class AppModule {}
