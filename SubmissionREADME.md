# ✅ TaskFlow – Interview Submission

## 🚀 Overview

**TaskFlow** is a scalable task management system built with **NestJS**, **TypeORM**, **PostgreSQL**, **Redis**, and **BullMQ**, designed for clean architecture, asynchronous processing, and production deployment via **Docker Swarm**. It supports core task management, authentication, background processing, rate limiting, health checks, and secure token handling.

---

## ✅ Features Implemented

### 📦 Core Functionality
- **Task CRUD**: Full Create, Read, Update, and Delete operations.
- **Input Validation**: DTOs using `class-validator` with NestJS pipes.
- **Filtering & Pagination**: Filter by status, priority, due date; supports pagination.
- **Error Handling**: Standardized error responses and service-level exception management.
- **Role-Based Access Control**: Admin and normal users with scoped permissions.
- **Swagger Documentation**: All APIs documented with request/response schemas.

---

### ⚙️ Background Processing (BullMQ)
- **Async Notifications**: Notifications sent via BullMQ for task status changes.
- **Batch Async Operations**:
  - `async: true` → task queued.
  - `async: false` → executed immediately.
- **Queue Abstraction**: Custom `BaseProcessor` and `BullQueueModule` for reusable processing logic.
- **Retry Strategy**: Each job retries up to 3 times with exponential backoff for resilience.
- **Notification Logging**: All notification logs are stored in DB with associated users.

---

### 🔐 Authentication & Security
- **JWT Auth with Refresh Token Flow**:
  - Secure rotation and hashing of refresh tokens.
  - Single-session login per user.
- **Rate Limiting**:
  - Fixed-window limiter using Redis and IP hashing.
- **Authorization Guards**:
  - `JwtAuthGuard` and `RolesGuard` enforce scoped access.

---

### 🩺 Health Monitoring
- **Health Check Module**:
  - ✅ Redis connectivity via BullMQ.
  - ✅ PostgreSQL connectivity via TypeORM.
- **Global Timeout Interceptor**: Limits requests to a max of 60 seconds.

---

## 🧩 Advanced Patterns

### 📘 Enum Optimization
- Enums like `TaskStatus` are stored as `SMALLINT` in DB for better indexing and performance.

### 📑 Event Sourcing (Basic)
- Implemented via PostgreSQL triggers: changes to task status are logged into a `task_events` table as JSONB snapshots.

### 🧠 Queue Design Philosophy
- Notifications and high-volume updates are processed asynchronously.
- Fast-path operations like sync `PATCH` are handled inline unless explicitly marked async.
- Job deduplication via dynamic `jobId` generation (e.g. `task-update-<id>`).

---

## 👥 User Roles and Permissions

### 👤 Normal User
- Can manage (CRUD) only their own tasks.
- Cannot perform batch operations.

### 🛡️ Admin User
- Can manage any task.
- Has access to batch task operations.

> Admins can create other users (admin or normal). Users registering via `/auth/register` are assigned the **normal** role by default.

---

## 🔐 Refresh Token Flow

- **Secure Storage**: Refresh tokens are stored as hashes.
- **Rotation**: A new token is generated and saved on every refresh.
- **Single Session**: Only one refresh token is valid at a time per user.
- **Revocation**: Token is invalidated on logout or reuse detection.

| Method | Endpoint         | Description                              |
|--------|------------------|------------------------------------------|
| POST   | `/auth/login`    | Get access and refresh tokens            |
| POST   | `/auth/refresh`  | Get new access token                     |
| POST   | `/auth/logout`   | Invalidate the refresh token             |

---

## ⏳ Batch Operation Behavior

```ts
// Summary of batch processing rules:

- Update:
  - async: true  → queued
  - async: false → sync execution (default: async)

- Create/Delete:
  - async: true  → queued
  - async: false → sync execution (default: sync)

- If async is provided per task, it overrides batch-level config.
```
---

### 🧰 Infrastructure & DevOps
- **Docker Swarm Deployment**:
  - Services: `taskflow_api`, `taskflow_worker`, `redis`.
  - Health checks, overlay networking, and service replicas configured.
- **Monorepo Architecture**:
  - Shared modules across API and Worker (`entities/`, `services/`, `utils/`).
  - Independent entry points: `main.ts` for API and `worker.main.ts` for background jobs.
- **.env.test.local**: For seamless local testing and containerization.

---


### 🧪 Testing
- Basic unit tests using `bun test` for key services and guards.
- Limited coverage due to time constraints, but critical paths are verified.

---

## ⚡ Enhancements & Improvements

| Area            | Improvement                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| Code Reuse      | Created reusable `DatabaseModule`, `BullQueueModule`, `BaseProcessor`.     |
| Modularity      | Separation between API and Worker with shared logic.                        |
| Observability   | Custom health checks for Redis & DB.                                        |
| Decorators      | Added `@GetUserRole()` and related helpers for cleaner controller logic.    |
| Docker          | Fully containerized setup with Swarm, healthchecks, and service discovery.  |
| Queue Strategy  | Structured async flow with deduplication and failure recovery.              |

---

## ⏱️ What’s Pending or Simplified

| Area                          | Notes                                                                 |
|-------------------------------|-----------------------------------------------------------------------|
| ❌ Overdue Task Cron Job       | Skipped due to time constraints. Placeholder exists (`OverdueTasksService`). |
| 🧪 Full Test Coverage          | Basic tests in place, but no integration or edge-case testing yet.   |
| ✉️ Email Notifications         | Planned with Brevo; only logged to DB due to time constraints.       |
| 🔃 Caching Layer               | Not implemented; considered lower priority for evaluation focus.     |

### 🛠️ PostgreSQL Integration

PostgreSQL is deliberately **not containerized** in this setup. Instead, the application connects to an externally hosted PostgreSQL instance using `host.docker.internal`. This approach ensures:
- Seamless integration with a centralized database server.
- Avoidance of unnecessary container volume complexity.
- No need to re-run migrations or lose data upon container restarts.

This decision aligns with production deployment practices and allows easier local development and testing.


---

## 📌 Future Improvements

If extended, I would work on:

- Distributed caching via Redis for frequently accessed endpoints.
- Complete overdue task scheduler with email notifications.
- Extend test coverage: e2e + integration tests + mocking strategies.
- Break shared logic into an internal NPM package for true service separation.

---

## 📝 Final Note

Despite submission delays, this project reflects:
- **Clean architecture**
- **Strong async processing**
- **Secure authentication flows**
- **Production-readiness with Docker**
- And a thoughtful balance of scalability, performance, and modularity.

Thanks for reviewing the submission 🙏
