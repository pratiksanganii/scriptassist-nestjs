import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, FindManyOptions, FindOptions, In, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { BulkJobOptions, Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';
import { TaskDelete, TaskPriority } from './enums/task-priority.enum';
import { BULL_QUEUES } from '../../config/bull.config';
import { UserRole, UserStatus } from '../../modules/users/user_role.enum';
import { GetUserRole } from '../../common/decorators/get-role.decorator';
import { TaskFilterDto } from './dto/task-filter.dto';
import { BatchTaskDto, CreateBatchTask } from './dto/batch-task.dto';
import { FindAllResponse, ORMService, PAGE_SIZE } from '../../database/orm.service';
import { NotificationService } from 'src/queues/notification/notification.service';
import { JOB_CONFIG, MissingParameters, TASK_JOBS } from 'src/globals';
import { UUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { CommonService } from 'src/common/services/common.service';

type UpdateTask = {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  // as of now keeping editable (need to confirm)
  title?: string;
  description?: string;
};

interface BulkCreateTask extends UpdateTask {
  userId: UUID;
  title: string;
  description: string;
}

interface BulkUpdateTask {
  id: UUID;
  data: UpdateTask;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectQueue(BULL_QUEUES.TASK_PROCESSING)
    private taskQueue: Queue,
    private notificationService: NotificationService,
    private readonly ormService: ORMService,
    private readonly commonService: CommonService,
  ) {}

  async create(createTaskDto: CreateTaskDto, user: GetUserRole): Promise<Task> {
    // normal user can only create tasks for themselves
    if (user.role == UserRole.USER && createTaskDto.userId && createTaskDto.userId != user.id)
      throw new Error('Only admin can create tasks for other users');
    // use userId of the api caller if not provided explicitly
    if (!createTaskDto.userId) createTaskDto.userId = user.id;
    return await this.commonCreateTask(createTaskDto);
  }

  async commonCreateTask(newTask: Partial<Task>): Promise<Task> {
    const response = await this.ormService.executeTransaction(async manager => {
      const saved = await this.ormService.createWithManger<Task>(Task, newTask, manager);
      await this.notificationService.notifyTaskCreate(saved);
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

  async findOne(id: string, manager?: EntityManager): Promise<Task> {
    // always use with transaction using manager
    const where = { id, taskDelete: TaskDelete.NOT_DELETED };
    const found = manager
      ? await manager.findOneBy(Task, where)
      : await this.tasksRepository.findOneBy(where);
    if (!found) throw new HttpException(`Task not found`, HttpStatus.NOT_FOUND);
    return found;
  }

  //#region count task by id
  private async countTask(id: string, manager?: EntityManager): Promise<number> {
    const where = { id, taskDelete: TaskDelete.NOT_DELETED };
    const found = manager
      ? await manager.countBy(Task, where)
      : await this.tasksRepository.countBy(where);
    return found;
  }
  //#endregion

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // perform operation in transaction
    const response = await this.ormService.executeTransaction(async manager => {
      const task = await this.findOne(id, manager);
      const oldStatus = task.status;
      this.validateAddCommonData(task, updateTaskDto);
      // save updates in database with transaction
      const updatedTask = await manager.save(task);

      // notify task update
      if (oldStatus !== updatedTask.status)
        await this.notificationService.notifyTaskStatusUpate(updatedTask);

      return updatedTask;
    });
    return response;
  }

  async remove(id: string): Promise<void> {
    await this.ormService.executeTransaction(async manager => {
      // check if task exist and not deleted already
      const count = await this.countTask(id, manager);
      if (!count) throw new HttpException(`Task not found`, HttpStatus.NOT_FOUND);
      // update task status
      await manager.update(Task, { id }, { taskDelete: TaskDelete.DELETED });
      await this.notificationService.notifyTaskDelete({ id });
      return true;
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    // use the update job function by passing status only
    return await this.update(id, { status });
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

  /**
   * Batch Operation Behavior:
   *
   * - Updates:
   *   - Performed **asynchronously** by default, unless `async: false` is specified.
   *
   * - Creates and Deletions:
   *   - Performed **synchronously** by default, unless `async: true` is specified.
   *
   * - Queue Handling:
   *   - If `async: true` is set at the **batch level**, all tasks are added to the queue.
   *   - If `async` is specified at the **individual task level**, it overrides the batch-level setting:
   *     - `async: true` → task will be queued.
   *     - `async: false` → task will be executed immediately (synchronously).
   */
  async batchProcess(operations: BatchTaskDto) {
    const checkIsNull = ![false, true].includes(operations.async);
    const batchData: { syncTask: CreateBatchTask[]; asyncTask: CreateBatchTask[] } = {
      syncTask: [],
      asyncTask: [],
    };

    const { syncTask, asyncTask } = operations.tasks.reduce((acc, task: CreateBatchTask) => {
      let key: 'asyncTask' | 'syncTask';
      // task asnyc provided for individual task
      if (task.async) key = 'asyncTask';
      else if (task.async == false) key = 'syncTask';
      // if task async not provided for individual task
      else {
        if (checkIsNull) {
          // if async not provided at both batch level and individual task level
          // then by default create and delete will perform synchronously
          if (task.operation == 'create' || task.operation == 'delete') key = 'syncTask';
          // update will perform asynchronously
          else key = 'asyncTask';
        } else if (operations.async) key = 'asyncTask';
        else key = 'syncTask';
      }
      // after decided which key to use
      acc[key].push(task);

      return acc;
    }, batchData);
    // process requiredsynchronous tasks
    await this.processSyncTasks(syncTask);
    // add required asynchronous tasks to queue
    await this.addAsyncTaskToQueue(asyncTask);

    return { data: 'success' };
  }

  private async processSyncTasks(tasks: CreateBatchTask[]) {
    // check all provided userIds exist for create operations
    const userIds: UUID[] = [];
    // check all provided taskIds exist for update,delete operations
    const taskIds: UUID[] = [];
    // required to create new task 'userId', 'title', 'description'
    // optional and updatable keys 'status', 'priority', 'dueDate'
    // as of now kept 'title', 'description' also updatable

    const bulkCreate: BulkCreateTask[] = [];
    const deleteTasks: UUID[] = [];
    const updateTasks: BulkUpdateTask[] = [];
    tasks.forEach(task => {
      // check and prepare create operations
      if (task.operation == 'create') {
        bulkCreate.push(this.getValidateBulkCreateTask(task?.data as Partial<Task>));
        // already verified userId above hence safe
        if (task?.data?.userId) userIds.push(task?.data?.userId);
      } else if (task.operation == 'update' || task.operation == 'delete') {
        // for delete and update primary id required
        MissingParameters(task?.data as Record<string, unknown>, ['id']);
        if (task?.data?.id) taskIds.push(task?.data?.id);
        // bulk delete
        if (task.operation == 'delete') deleteTasks.push(task?.data?.id as UUID);
        // check for update task
        else updateTasks.push(this.getValidateBulkUpdateTask(task?.data as Partial<Task>));
      }
    });
    // check all associated users exist
    await this.checkAllPrimaryIdsExists(userIds, 'user');
    // check all associated tasks exist
    await this.checkAllPrimaryIdsExists(taskIds, 'task');

    // perform bulk create and add notification to queue
    await this.bulkCreateAndQueueNotification(bulkCreate);

    // perform bulk update and add notification to queue
    await this.bulkUpdateAndQueueNotification(updateTasks);

    // perform bulk delete and add notification to queue
    await this.bulkDeleteAndQueueNotification(deleteTasks);
  }

  //#region add async task to queue
  private async addAsyncTaskToQueue(tasks: CreateBatchTask[]) {
    // prepare jobs for each task operation
    const bulk: { name: string; data: Partial<Task> | unknown; opts?: BulkJobOptions }[] =
      tasks.map(task => {
        return {
          name:
            task.operation == 'create'
              ? TASK_JOBS.CREATE_TASK
              : task.operation == 'delete'
                ? TASK_JOBS.DELETE_TASK
                : TASK_JOBS.UPDATE_TASK,
          data: task.data,
          opts: { jobId: `${task.operation} ${task?.data?.id}`, ...JOB_CONFIG },
        };
      });
    await this.taskQueue.addBulk(bulk);
  }
  //#endregion

  //#region check all primary ids exists
  private async checkAllPrimaryIdsExists(id: UUID[], type: 'user' | 'task') {
    // get repository
    const repo = type == 'user' ? this.usersRepository : this.tasksRepository;
    const opt: FindManyOptions<User> | FindManyOptions<Task> = {
      where: {
        id: In(id),
        [type == 'user' ? 'status' : 'taskDelete']:
          type == 'user' ? UserStatus.ACTIVE : TaskDelete.NOT_DELETED, // conditionally check delete
      },
      select: { id: true },
    };
    // get all provided ids excluding deleted
    const found = await repo.find(
      opt as (FindManyOptions<Task> & FindManyOptions<User>) | undefined,
    );
    const found_map: Record<UUID, boolean> = found.reduce(
      (acc, item) => {
        acc[item.id as UUID] = true;
        return acc;
      },
      {} as Record<UUID, boolean>,
    );
    const notFound = id.findIndex(id => !found_map[id]);
    // if any id not found throw error as foreign key constraint violation
    if (notFound != -1)
      throw new HttpException(`Associated ${type} not found`, HttpStatus.BAD_REQUEST);
  }
  //#endregion

  //#region validate status or priority
  private checkStatusOrProiorityIfExist(type: 'status' | 'priority', task: Partial<Task>) {
    if (task?.[type]) {
      const allowed: number[] | unknown = this.commonService.getEnumValues(
        type == 'status' ? TaskStatus : TaskPriority,
      );
      if ((allowed as number[]).includes(task?.[type] as number))
        throw new HttpException(`Invalid ${type}`, HttpStatus.BAD_REQUEST);
    }
  }
  //#endregion

  //#region validate individual task for bulk create
  private getValidateBulkCreateTask(taskData: Partial<Task>) {
    MissingParameters(taskData, ['userId', 'title', 'description']);
    const create: BulkCreateTask = {
      userId: taskData.userId as UUID,
      title: taskData.title as string,
      description: taskData.description as string,
    };
    this.validateAddCommonData(create, taskData);
    return create;
  }
  //#endregion

  //#region common add or get optional data
  private validateAddCommonData(create: BulkCreateTask | UpdateTask, taskData: Partial<Task>) {
    // validate status if provided
    this.checkStatusOrProiorityIfExist('status', taskData);
    if ('status' in taskData) create.status = taskData.status;
    // validate priority if provided
    this.checkStatusOrProiorityIfExist('priority', taskData);
    if ('priority' in taskData) create.priority = taskData.priority;
    // validate due date if provided
    this.checkDueDateIsValid(taskData.dueDate as Date);
    if (taskData.dueDate) create.dueDate = taskData.dueDate;
    // validate description
    this.checkTitleOrDescription('title', taskData.title as string);
    if (taskData?.title) create.title = taskData.title;
    // validate description
    this.checkTitleOrDescription('description', taskData.description as string);
    if (taskData?.description) create.description = taskData.description;
  }
  //#endregion

  //#region check due date is valid
  private checkDueDateIsValid(dueDate: Date) {
    if (dueDate && new Date(dueDate).getTime() < new Date().getTime())
      throw new HttpException('Invalid due date', HttpStatus.BAD_REQUEST);
  }
  //#endregion

  //#region validate title or description
  private async checkTitleOrDescription(type: 'title' | 'description', data: string) {
    if (data)
      if (typeof data != 'string')
        throw new HttpException(`Invalid ${type}`, HttpStatus.BAD_REQUEST);
      else if (data?.length < 5)
        throw new HttpException(`Provide at least 5 characters ${type}`, HttpStatus.BAD_REQUEST);
  }
  //#endregion

  //#region validate individual task for bulk update
  private getValidateBulkUpdateTask(taskData: Partial<Task>) {
    const update: BulkUpdateTask = { id: taskData.id as UUID, data: {} };
    this.validateAddCommonData(update.data, taskData);
    // check at least one field updated
    const keys = Object.keys(update.data).length;
    if (keys == 0) throw new HttpException('No field updated', HttpStatus.BAD_REQUEST);
    return update;
  }
  //#endregion

  //#region bulk create tasks and add notification to queue
  private async bulkCreateAndQueueNotification(tasks: BulkCreateTask[]) {
    await this.ormService.executeTransaction(async manager => {
      const created = await manager.insert(Task, tasks);
      // add each created task to queue for notification sending
      for (const row of created.raw ?? [])
        await this.notificationService.notifyTaskCreate(row as Task);
    });
  }
  //#endregion

  //#region bulk delete tasks and add notification to queue
  private async bulkDeleteAndQueueNotification(taskIds: UUID[]) {
    await this.ormService.executeTransaction(async manager => {
      await manager.update(Task, { id: In(taskIds) }, { taskDelete: TaskDelete.DELETED });
      // add each deleted task to queue for notification sending
      for (const id of taskIds) await this.notificationService.notifyTaskDelete({ id: id as UUID });
    });
  }
  //#endregion

  //#region bulk update tasks and add notification to queue
  private async bulkUpdateAndQueueNotification(tasks: BulkUpdateTask[]) {
    await this.ormService.executeTransaction(async manager => {
      // performing all update in single transaction
      for (const curr of tasks) {
        const { raw } = await manager.update(Task, { id: curr.id }, curr.data);
        // if status is updated add each updated task to queue for notification sending
        if ('status' in curr.data) await this.notificationService.notifyTaskStatusUpate(raw[0]);
      }
    });
  }
  //#endregion
}
