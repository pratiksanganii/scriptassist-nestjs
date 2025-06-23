import {
  TaskDelete,
  TaskLogType,
  TaskPriority,
} from '../../modules/tasks/enums/task-priority.enum';
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
        "last_action_by" uuid,
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_last_action_users" FOREIGN KEY ("last_action_by") REFERENCES "users"("id") ON DELETE CASCADE
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
    await this.addTaskLogsFunctionality(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_users"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE "task_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }

  private async addTaskLogsFunctionality(queryRunner: QueryRunner) {
    // task log track domain
    await this.createDomain(queryRunner, 'task_log_type', [
      TaskLogType.CREATE,
      TaskLogType.UPDATE,
      TaskLogType.DELETE,
    ]);

    await queryRunner.query(`
    CREATE TABLE task_logs (
      id SERIAL PRIMARY KEY,
      task_id UUID NOT NULL,
      action_type task_log_type_domain NOT NULL,
      updated_fields JSONB NOT NULL,
      action_by UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      CONSTRAINT fk_action_by_user FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE RESTRICT
      );
    `);

    // in this trigger, we log the changes made to the task
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION log_task_update()
      RETURNS trigger AS $$
      DECLARE
        changed_fields jsonb;
      BEGIN
        -- Skip logging if INSERT and last_action_by is not set
        IF TG_OP = 'INSERT' AND NEW.last_action_by IS NULL THEN
          RETURN NEW;
        END IF;

        -- Get all differences between NEW and OLD as a jsonb object
        changed_fields := (
          SELECT jsonb_object_agg(key, value)
            FROM jsonb_each(to_jsonb(NEW))
            WHERE to_jsonb(NEW) -> key IS DISTINCT FROM COALESCE(to_jsonb(OLD), '{}'::jsonb) -> key
            AND key NOT IN ('last_action_by','updated_at', 'created_at') -- skip non-business fields if needed
        );

      -- If there are any changed fields, log them
      IF jsonb_typeof(changed_fields) = 'object' AND (SELECT COUNT(*) FROM jsonb_object_keys(changed_fields)) > 0 THEN
        INSERT INTO task_logs (
          task_id,
          updated_fields,
          action_type,
          action_by
        ) VALUES (
          NEW.id,
          changed_fields,
          (CASE WHEN TG_OP='INSERT' THEN ${TaskLogType.CREATE} WHEN NEW.task_delete = ${TaskDelete.DELETED}::task_delete_domain THEN ${TaskLogType.DELETE} ELSE ${TaskLogType.UPDATE} END)::task_log_type_domain,
          NEW.last_action_by -- assuming this is already set
        );  
      END IF;

      RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // for each update and inserts(for logging admin create tasks for other user), call the trigger
    await queryRunner.query(`
      CREATE TRIGGER log_task_update_trigger
      AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION log_task_update();
    `);
  }
}
