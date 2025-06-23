export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum TaskDelete {
  DELETED = 1,
  NOT_DELETED = 2,
}

export enum TaskLogType {
  CREATE = 1, // needed in case if task was created by admin
  UPDATE = 2,
  DELETE = 3,
}
