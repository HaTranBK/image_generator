# Phase 3: Services, Controllers & Frontend API Refactoring

This phase refactors backend services to use repositories, updates controllers to emit standardized responses, registers DTO schemas in Swagger, and updates frontend API clients to parse the new payload format.

---

## Proposed Changes

### Component 1: Services Refactoring
Update backend services to handle the new repository `Result` pattern.

#### [MODIFY] [projects.service.ts](file:///d:/gradion_assessment/backend/src/projects/projects.service.ts)
- Replace `PrismaService` injection with `ProjectsRepository`.
- Convert all methods (e.g., `create`, `findOne`, `findAll`, `update`) to return `Promise<Result<T, Error>>`.

#### [MODIFY] [users.service.ts](file:///d:/gradion_assessment/backend/src/users/users.service.ts)
- Replace `PrismaService` injection with `UsersRepository`.
- Convert methods to return `Result`.

#### [MODIFY] [auth.service.ts](file:///d:/gradion_assessment/backend/src/auth/auth.service.ts)
- Update registration/login to handle results.

---

### Component 2: Controllers & Swagger Integration

#### [MODIFY] [projects.controller.ts](file:///d:/gradion_assessment/backend/src/projects/projects.controller.ts)
- Inspect `result.isErr()`. If error is present, throw `CustomException` (e.g., `PROJECT_NOT_FOUND` with 404 status).
- If successful, return `{ code: 200, message: "Success", payload: result.value }`.
- Add Swagger annotations to all controller methods.

#### [MODIFY] [main.ts](file:///d:/gradion_assessment/backend/src/main.ts)
- Setup OpenAPI DocumentBuilder using `SwaggerModule.createDocument`.

#### [MODIFY] [projects/dto/project.dto.ts](file:///d:/gradion_assessment/backend/src/projects/dto/project.dto.ts) (and other DTO files)
- Decorate fields with `@ApiProperty()` or `@ApiPropertyOptional()`.

---

### Component 3: Frontend API Call Alignment

Update the frontend API methods to explicitly handle the new response wrapper.

#### [MODIFY] [projects.api.ts](file:///d:/gradion_assessment/frontend/src/lib/projects.api.ts)
- Import `BaseResponse` from `./types`.
- Update all calls to retrieve `.payload` from `res.data`.
- Example for `getProjects()`:
  ```typescript
  export async function getProjects(): Promise<Project[]> {
    const res = await apiClient.get<BaseResponse<Project[]>>('/projects');
    return res.data.payload;
  }
  ```
- Example for `createProject(...)`:
  ```typescript
  export async function createProject(...): Promise<Project> {
    // ...
    const res = await apiClient.post<BaseResponse<Project>>('/projects', data);
    return res.data.payload;
  }
  ```

#### [MODIFY] [auth.api.ts](file:///d:/gradion_assessment/frontend/src/lib/auth.api.ts)
- Update `login` and `getMe` methods to retrieve `.payload` from `res.data` similarly.

---

## Verification Plan
1. **Frontend Compilation**: Ensure that compiling the frontend using `npm run build` succeeds after API endpoint changes.
2. **Swagger Verification**: Navigate to `http://localhost:3001/api-docs` and ensure the API documentation renders all routes, schemas, and schemas properly.
3. **End-to-End Integration**: Perform full book upload and pipeline flow on the React UI. Confirm that the data propagates and displays correctly at every step.
