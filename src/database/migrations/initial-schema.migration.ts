import { TaskDelete, TaskPriority } from '../../modules/tasks/enums/task-priority.enum';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import { UserRole, UserStatus } from '../../modules/users/user_role.enum';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1615123456789 implements MigrationInterface {
  name = 'InitialSchema1615123456789';

  private async createENum(runner: QueryRunner, name: string, values: string[] | number[]) {
    await runner.query(`CREATE TYPE "${name}" AS ENUM(${values.join(',')})`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // create all enum types
    // user role
    await this.createENum(queryRunner, 'user_status_enum', [UserStatus.ACTIVE, UserStatus.DELETED]);
    // user status
    await this.createENum(queryRunner, 'user_role_enum', [UserRole.ADMIN, UserRole.USER]);
    // task status
    await this.createENum(queryRunner, 'task_status_enum', [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ]);
    // task priority
    await this.createENum(queryRunner, 'task_priority_enum', [
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
    ]);

    // task delete status
    await this.createENum(queryRunner, 'task_delete_enum', [
      TaskDelete.DELETED,
      TaskDelete.NOT_DELETED,
    ]);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT ${UserRole.USER},
        "status" "user_status_enum" NOT NULL DEFAULT ${UserStatus.ACTIVE},
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "status" "task_status_enum" NOT NULL DEFAULT ${TaskStatus.PENDING},
        "priority" "task_priority_enum" NOT NULL DEFAULT ${TaskPriority.MEDIUM},
        "task_delete" "task_delete_enum" NOT NULL DEFAULT ${TaskDelete.NOT_DELETED},
        "due_date" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_users"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE "task_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
