import { NestFactory } from '@nestjs/core';
import { TaskProcessorModule } from './queues/task-processor/task-processor.module';

async function bootstrap() {
  await NestFactory.create(TaskProcessorModule);
  console.log('Worker is running and listening to task queue...');
}
bootstrap();
