import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { BULL_QUEUES } from '@config/bull.config';
import { FindAllResponse, ORMService } from '@database/orm.service';
import { GetUserRole } from '@common/decorators/get-role.decorator';
import { UserRole } from 'src/shared/user_role.enum';
import { TaskFilterDto } from './dto/task-filter.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue(BULL_QUEUES.TASK_PROCESSING)
    private taskQueue: Queue,
    private readonly ormService: ORMService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Inefficient implementation: creates the task but doesn't use a single transaction
    // for creating and adding to queue, potential for inconsistent state
    const task = this.tasksRepository.create(createTaskDto);
    const savedTask = await this.tasksRepository.save(task);

    // Add to queue without waiting for confirmation or handling errors
    this.taskQueue.add('task-status-update', {
      taskId: savedTask.id,
      status: savedTask.status,
    });

    return savedTask;
  }

  async findAll(query: TaskFilterDto, user: GetUserRole): Promise<FindAllResponse<Task>> {
    const qb = this.tasksRepository.createQueryBuilder(this.tasksRepository.metadata.tableName);

    // if user is normal user then only show tasks of that user
    if (user.role == UserRole.USER) qb.andWhere('user_id = :userId', { userId: user.id });

    // filter by status
    if (query?.status != undefined) qb.andWhere('status = :status', { status: query.status });

    // filter by priority
    if (query?.priority != undefined)
      qb.andWhere('priority = :priority', { priority: query.priority });

    // filter by due date
    if (query?.startDate && query?.endDate)
      qb.andWhere('dueDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate).toJSON(),
        endDate: new Date(query.endDate).toJSON(),
      });

    // search query
    if (query?.search) {
      qb.andWhere(
        new Brackets(qbinner => {
          qbinner.orWhere('title ILIKE :search', { search: `%${query.search}%` });
          qbinner.orWhere('description ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }
    const take = +(query?.limit ?? 10);
    const skip = +(+(query?.page ?? 1) - 1) * take;
    qb.skip(skip);
    qb.take(take);
    const response = await qb.getManyAndCount();
    return this.ormService.prepareFindAllResponse(response[0], response[1], { take, skip });
  }

  async findOne(id: string): Promise<Task> {
    // Inefficient implementation: two separate database calls
    const count = await this.tasksRepository.count({ where: { id } });

    if (count === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return (await this.tasksRepository.findOne({
      where: { id },
      relations: ['user'],
    })) as Task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Inefficient implementation: multiple database calls
    // and no transaction handling
    const task = await this.findOne(id);

    const originalStatus = task.status;

    // Directly update each field individually
    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description) task.description = updateTaskDto.description;
    if (updateTaskDto.status) task.status = updateTaskDto.status;
    if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate) task.dueDate = updateTaskDto.dueDate;

    const updatedTask = await this.tasksRepository.save(task);

    // Add to queue if status changed, but without proper error handling
    if (originalStatus !== updatedTask.status) {
      this.taskQueue.add('task-status-update', {
        taskId: updatedTask.id,
        status: updatedTask.status,
      });
    }

    return updatedTask;
  }

  async remove(id: string): Promise<void> {
    // Inefficient implementation: two separate database calls
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    // Inefficient implementation: doesn't use proper repository patterns
    const query = 'SELECT * FROM tasks WHERE status = $1';
    return this.tasksRepository.query(query, [status]);
  }

  async updateStatus(id: string, status: string): Promise<Task> {
    // This method will be called by the task processor
    const task = await this.findOne(id);
    task.status = status as any;
    return this.tasksRepository.save(task);
  }

  async getStats() {
    // Inefficient approach: N+1 query problem
    const tasks = await this.tasksRepository.find();

    // Inefficient computation: Should be done with SQL aggregation
    const statistics = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      highPriority: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
    };

    return statistics;
  }
}
