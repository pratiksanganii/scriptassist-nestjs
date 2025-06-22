import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './queues/common/worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);
  console.log('Worker is running and listening to task queue...');
}
bootstrap();
