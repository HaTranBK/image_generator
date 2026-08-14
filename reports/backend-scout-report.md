# Scout Report: Backend Guidelines & Response Formatting Compliance

We have evaluated the NestJS backend codebase against the specifications outlined in [backend-guideline.md](file:///d:/gradion_assessment/docs/backend-guideline.md) and [backend-response-formatting.md](file:///d:/gradion_assessment/docs/backend-response-formatting.md).

Here is the detailed gap analysis between the required patterns and the current implementation.

---

## 1. Summary of Gaps

| Requirement Area | Specification | Current Codebase Status | Status |
| :--- | :--- | :--- | :---: |
| **Global Filters & Pipes** | Register `HttpExceptionFilter` and `DecimalSerializerInterceptor` globally. | Only `ValidationPipe` is registered globally. Both filter and interceptor are completely missing. | ❌ **Missing** |
| **Service Layer Pattern** | Services must return `Result<T, Error>` via `neverthrow`. | Services return raw values/objects or throw direct NestJS Exceptions. `neverthrow` is not used. | ❌ **Missing** |
| **Controller Layer** | Check `result.isErr()`, throw `CustomException` or return unified `BaseResponse<T>`. | Controllers return raw values directly or let raw exceptions propagate. No `CustomException` class exists. | ❌ **Missing** |
| **Repository Pattern** | Plain `@Injectable()` classes injecting `PrismaService` returning `Result<T, Error>`. | No Repository classes exist. Services call `PrismaService` directly. | ❌ **Missing** |
| **Swagger Integration** | API decorators like `@ApiBaseOkResponse` and `@ApiPropertyExpose` to build OpenAPI. | Swagger is not configured in `main.ts`, and there are no Swagger annotations on DTOs/Controllers. | ❌ **Missing** |
| **Database Migrations** | Idempotent migrations with `IF EXISTS` constraints. | Migrations exist, but standard Prisma-generated files have not been manually sanitized for idempotency. | ⚠️ **Partial** |

---

## 2. Detailed Gap Analysis

### 2.1. Response & Exception Formatting
* **Requirement**: [backend-response-formatting.md](file:///d:/gradion_assessment/docs/backend-response-formatting.md) specifies that errors must be structured as `{ code: string, message: string, errors?: [] }` via `HttpExceptionFilter`. Success responses must pass through `DecimalSerializerInterceptor` to serialize Prisma Decimals and Dates.
* **Current Status**:
  - The classes `HttpExceptionFilter`, `CustomException`, and `DecimalSerializerInterceptor` do not exist in the codebase.
  - Success responses return plain JSON objects without a unified structure.

### 2.2. Service-Controller-Repository Architecture
* **Requirement**: The guidelines specify a strict `Controller → Service (neverthrow) → Repository` separation of concerns.
* **Current Status**:
  - Services (e.g., [projects.service.ts](file:///d:/gradion_assessment/backend/src/projects/projects.service.ts)) inject and query `PrismaService` directly. There is no repository layer.
  - Exceptions are thrown directly inside Services (e.g., `throw new NotFoundException(...)`) which breaks the functional error handling pipeline.

### 2.3. OpenAPI / Swagger Type Generation
* **Requirement**: Register all DTO fields with `@ApiProperty()` / `@ApiPropertyExpose` so that the frontend can build types using `openapi-typescript`.
* **Current Status**:
  - Swagger is not enabled in `main.ts`.
  - DTO files do not contain any decorators for Swagger properties, meaning the generated `api-json` schema is empty or missing.
