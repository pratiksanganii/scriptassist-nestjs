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
import { BULL_QUEUES } from '../../config/bull.config';
import { UserRole } from '../../modules/users/user_role.enum';
import { GetUserRole } from '../../common/decorators/get-role.decorator';
import { TaskFilterDto } from './dto/task-filter.dto';
import { BatchTaskDto } from './dto/batch-task.dto';
import { FindAllResponse, ORMService, PAGE_SIZE } from '../../database/orm.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue(BULL_QUEUES.TASK_PROCESSING)
    private taskQueue: Queue,
    private readonly ormService: ORMService,
  ) {}

  async create(createTaskDto: CreateTaskDto, user: GetUserRole): Promise<Task> {
    // normal user can only create tasks for themselves
    if (user.role == UserRole.USER && createTaskDto.userId && createTaskDto.userId != user.id)
      throw new Error('Only admin can create tasks for other users');
    // use userId of the api caller if not provided explicitly
    if (!createTaskDto.userId) createTaskDto.userId = user.id;

    const response = await this.ormService.executeTransaction(async manager => {
      const task = manager.create(Task, createTaskDto);
      const saved = await manager.save(task);
      this.taskQueue.add('task-status-update', {
        taskId: saved.id,
        status: saved.status,
      });
      return saved;
    });

    return response;
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
      qb.andWhere('due_date BETWEEN :startDate AND :endDate', {
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
    const take = +(query?.limit ?? PAGE_SIZE);
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

  async getStats(user: GetUserRole) {
    const alias = this.tasksRepository.metadata.tableName;
    const taskQuery = this.tasksRepository.createQueryBuilder(alias);
    taskQuery.groupBy(`${alias}.status, ${alias}.priority`);
    taskQuery.select(`count(id) as count, status, priority`); // aggregate count of tasks by status
    // if normal user then get only tasks of that user
    if (user.role == UserRole.USER) taskQuery.andWhere(`user_id = :userId`, { userId: user.id });

    const tasks = await taskQuery.getRawMany();
    const statistics = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      highPriority: 0,
    };
    tasks.forEach(task => {
      // make strings into numbers
      task.count = +task.count;
      statistics.total += task.count;
      // update task status wise statistics
      switch (+task.status) {
        case TaskStatus.COMPLETED:
          statistics.completed += task.count;
          break;
        case TaskStatus.IN_PROGRESS:
          statistics.inProgress += task.count;
          break;
        case TaskStatus.PENDING:
          statistics.pending += task.count;
          break;
      }
      // update high priority task count
      if (task.priority == TaskPriority.HIGH) statistics.highPriority += task.count;
    });

    return statistics;
  }

  async batchProcess(operations: BatchTaskDto) {}
}
