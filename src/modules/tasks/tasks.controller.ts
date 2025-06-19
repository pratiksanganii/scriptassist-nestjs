import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BatchTaskDto } from './dto/batch-task.dto';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskFilterDto } from './dto/task-filter.dto';
import { GetRole, GetUserRole } from '../../common/decorators/get-role.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all tasks with optional filtering' })
  async findAll(@Query() query: TaskFilterDto, @GetRole() user: GetUserRole) {
    return await this.tasksService.findAll(query, user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats(@GetRole() user: GetUserRole) {
    return await this.tasksService.getStats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a task by ID' })
  async findOne(@Param('id') id: string, @GetRole() user: GetUserRole) {
    const task = await this.tasksService.findOne(id);
    // if task not found
    if (!task) throw new HttpException(`Task not found in the database`, HttpStatus.NOT_FOUND);
    return task;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    // No validation if task exists before update
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string) {
    // No validation if task exists before removal
    // No status code returned for success
    return this.tasksService.remove(id);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  async batchProcess(@Body() operations: BatchTaskDto) {
    return await this.tasksService.batchProcess(operations);
  }
}
