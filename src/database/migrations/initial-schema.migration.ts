import { TaskDelete, TaskPriority } from '../../modules/tasks/enums/task-priority.enum';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import { UserRole, UserStatus } from '../../modules/users/user_role.enum';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1615123456789 implements MigrationInterface {
  name = 'InitialSchema1615123456789';

  private async createDomain(runner: QueryRunner, name: string, values: string[] | number[]) {
    const query = `CREATE DOMAIN ${name}_domain AS SMALLINT CHECK(VALUE IN  (${values.join(',')}))`;
    await runner.query(query);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // create all enum types
    // user role
    await this.createDomain(queryRunner, 'user_status', [UserStatus.ACTIVE, UserStatus.DELETED]);
    // user status
    await this.createDomain(queryRunner, 'user_role', [UserRole.ADMIN, UserRole.USER]);
    // task status
    await this.createDomain(queryRunner, 'task_status', [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
    ]);
    // task priority
    await this.createDomain(queryRunner, 'task_priority', [
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
    ]);

    // task delete status
    await this.createDomain(queryRunner, 'task_delete', [
      TaskDelete.DELETED,
      TaskDelete.NOT_DELETED,
    ]);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" user_role_domain NOT NULL DEFAULT ${UserRole.USER},
        "status" user_status_domain NOT NULL DEFAULT ${UserStatus.ACTIVE},
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "hashed_refresh_token" TEXT,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "status" task_status_domain NOT NULL DEFAULT ${TaskStatus.PENDING},
        "priority" task_priority_domain NOT NULL DEFAULT ${TaskPriority.MEDIUM},
        "task_delete" task_delete_domain NOT NULL DEFAULT ${TaskDelete.NOT_DELETED},
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

    await queryRunner.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        task_id UUID NOT NULL,
        type VARCHAR NOT NULL,
        message VARCHAR NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_notifications_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
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
