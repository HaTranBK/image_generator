# Backend Refactoring & Standards Compliance Plan

This plan details the roadmap to refactor the NestJS backend to comply with the specifications in [backend-guideline.md](file:///d:/gradion_assessment/docs/backend-guideline.md) and [backend-response-formatting.md](file:///d:/gradion_assessment/docs/backend-response-formatting.md).

---

## User Review Required

> [!WARNING]
> Introducing the standard success response envelope `{ code: number, message: string, payload: any }` on the backend will change the data structure returned to the frontend.
> **Our solution**: Instead of a global Axios response interceptor override, we will explicitly update the frontend API query functions in [projects.api.ts](file:///d:/gradion_assessment/frontend/src/lib/projects.api.ts) and [auth.api.ts](file:///d:/gradion_assessment/frontend/src/lib/auth.api.ts) to correctly handle and extract the `.payload` property, aligning the type contracts directly.

---

## Roadmap Overview

The work is split into three logical phases to ensure continuous compilation and zero application downtime:

### 1. [Phase 1: Core Infrastructure & Frontend Safety Types](file:///d:/gradion_assessment/plan/book-illustration-pipeline/backend-refactoring/phase-01-infrastructure.md)
- Create `CustomException`, `HttpExceptionFilter`, and `DecimalSerializerInterceptor` in the backend.
- Register filters and interceptors globally.
- Add the `BaseResponse<T>` interface in the frontend's [types.ts](file:///d:/gradion_assessment/frontend/src/lib/types.ts).

### 2. [Phase 2: Repository Layer Extraction](file:///d:/gradion_assessment/plan/book-illustration-pipeline/backend-refactoring/phase-02-repositories.md)
- Extract all Prisma database queries out of `ProjectsService` and `UsersService`.
- Implement `@Injectable()` repositories `ProjectsRepository` and `UsersRepository`.
- Introduce `neverthrow` error handling wrapper to all repository query methods.

### 3. [Phase 3: Services, Controllers & Frontend API Refactoring](file:///d:/gradion_assessment/plan/book-illustration-pipeline/backend-refactoring/phase-03-refactor-swagger.md)
- Convert services to return `Promise<Result<T, Error>>` using the repositories.
- Refactor controllers to catch `Result.isErr()` and translate errors to `CustomException` or return success envelopes.
- Add Swagger UI configurations and DTO property decorators.
- Update frontend methods in [projects.api.ts](file:///d:/gradion_assessment/frontend/src/lib/projects.api.ts) and [auth.api.ts](file:///d:/gradion_assessment/frontend/src/lib/auth.api.ts) to return `res.data.payload`.

---

## Verification Plan
1. **Compilation**: Run `npm run build` on both frontend and backend projects to guarantee type safety.
2. **API Verification**: Check Swagger documentation generated at `http://localhost:3001/api-json`.
3. **Response Verification**: Confirm that all successful requests return `{ code: 200, message: "Success", payload: ... }` on the network tab, and the frontend queries correctly retrieve and display the data.
