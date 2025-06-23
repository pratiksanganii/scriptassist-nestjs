import { TestingModule, Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TaskStatus } from './enums/task-status.enum';
import { TaskDelete, TaskPriority } from './enums/task-priority.enum';
import { UserRole } from '../users/user_role.enum';
import { GetUserRole } from 'src/common/decorators/get-role.decorator';
import { ORMService } from 'src/database/orm.service';
import { CommonService } from 'src/common/services/common.service';
import { NotificationService } from 'src/queues/notification/notification.service';
import { User } from '../users/entities/user.entity';

const mockTask: Partial<Task> = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test task',
  description: 'Description',
  status: TaskStatus.PENDING,
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(),
  userId: 'uuid',
  taskDelete: TaskDelete.NOT_DELETED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTaskRepo = {
  createQueryBuilder: jest.fn(() => ({
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    metadata: { tableName: 'task' },
  })),
  findOneBy: jest.fn(),
  countBy: jest.fn(),
};

const mockUserRepo = {
  find: jest.fn().mockResolvedValue([]),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: 'BullQueue_task-processing', useValue: { addBulk: jest.fn() } },
        { provide: NotificationService, useValue: { notifyTaskCreate: jest.fn() } },
        {
          provide: ORMService,
          useValue: {
            executeTransaction: jest.fn(fn => fn({})),
            prepareFindAllResponse: jest.fn(),
          },
        },
        { provide: CommonService, useValue: { getEnumValues: jest.fn().mockReturnValue([]) } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('TasksService - create', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            save: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: ORMService,
          useValue: {
            executeTransaction: jest.fn(fn => fn({})),
            createWithManger: jest.fn().mockResolvedValue(mockTask),
          },
        },
        {
          provide: NotificationService,
          useValue: { notifyTaskCreate: jest.fn() },
        },
        {
          provide: CommonService,
          useValue: {
            getEnumValues: jest.fn().mockReturnValue([
              TaskStatus.PENDING,
              TaskPriority.MEDIUM,
            ]),
          },
        },
        { provide: 'BullQueue_task-processing', useValue: { addBulk: jest.fn() } },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should create a task successfully', async () => {
    const dto: CreateTaskDto = {
      title: 'Test task',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    };
    const result = await service.create(dto, {
      id: dto.userId,
      role: UserRole.ADMIN,
    } as GetUserRole);

    expect(result).toEqual(mockTask);
  });
});

describe('TasksService - findAll', () => {
  let service: TasksService;
  let mockQueryBuilder: any;

  const mockTasks = [mockTask];
  const mockCount = 1;

  const mockOrmService = {
    prepareFindAllResponse: jest.fn().mockReturnValue({
      data: mockTasks,
      count: mockCount,
      totalPages: 1,
      currentPage: 1,
    }),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockTasks, mockCount]),
      metadata: { tableName: 'task' },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            metadata: { tableName: 'task' },
          },
        },
        { provide: ORMService, useValue: mockOrmService },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: CommonService, useValue: { getEnumValues: jest.fn() } },
        { provide: NotificationService, useValue: {} },
        { provide: 'BullQueue_task-processing', useValue: {} },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should return filtered tasks list', async () => {
    const result = await service.findAll(
      {
        page: '1',
        limit: '10',
        search: 'Test',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        role: UserRole.USER,
        email: 'admin@example.com',
        name: 'Admin User',
      },
    );

    expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    expect(mockOrmService.prepareFindAllResponse).toHaveBeenCalled();
    expect(result).toEqual({
      data: mockTasks,
      count: mockCount,
      totalPages: 1,
      currentPage: 1,
    });
  });
});
