import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';
import { UUID } from 'crypto';

export interface CreateBatchTask {
  operation: 'create' | 'update' | 'delete';
  async?: boolean; // individual tasks can be forcefully add/remove from queue
  data?: {
    id?: UUID; // for update only
    title?: string;
    description?: string;
    status?: number;
    priority?: number;
    dueDate?: Date;
    userId?: UUID; // for create only
  };
}

export class BatchTaskDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  async: boolean; // if want to add all tasks to queue

  @ApiProperty({
    required: true,
    example: [
      {
        operation: 'create',
        data: {
          title: 'Task 1',
          description: 'Description 1',
          status: 0,
          priority: 0,
          dueDate: '2023-01-01T00:00:00.000Z',
          userId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      { operation: 'delete', data: { id: '123e4567-e89b-12d3-a456-426614174000' } },
      { operation: 'update', data: { id: '123e4567-e89b-12d3-a456-426614174000', status: 0 } },
    ],
  })
  @IsArray()
  tasks: CreateBatchTask[];
}
