import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { IsDateString, IsOptional } from 'class-validator';

// TODO: Implement task filtering DTO
// This DTO should be used to filter tasks by status, priority, etc.
export class TaskFilterDto {
  // TODO: Add properties for filtering tasks
  // Example: status, priority, userId, search query, date ranges, etc.
  // Add appropriate decorators for validation and Swagger documentation
  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING, required: false })
  @IsOptional()
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM, required: false })
  @IsOptional()
  priority: TaskPriority;

  @ApiProperty({ example: '1', required: false })
  @IsOptional()
  page: string;

  @ApiProperty({ example: '10', required: false })
  @IsOptional()
  limit: string;

  @ApiProperty({ example: 'Docker setup for production', required: false })
  @IsOptional()
  search: string;

  @ApiProperty({ example: '2024-03-01T05:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-04-01T05:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate: string;
}
