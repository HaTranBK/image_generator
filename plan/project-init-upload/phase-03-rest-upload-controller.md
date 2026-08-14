# Phase 03 — API Upload & Controller

**Plan:** [plan.md](./plan.md)  
**Priority:** P1  
**Effort:** ~2h  
**Status:** Pending  
**Depends on:** Phase 01, Phase 02  

---

## Overview
Implement the HTTP endpoints to expose the file uploading and project management endpoints to the frontend, integrated with authentication.

---

## Key Insights
- **File Upload Handler**: Use NestJS `@UseInterceptors(FileInterceptor('file'))`.
- **Validation Pipe**: Validate incoming multipart data using class-validator.
- **Authentication**: Use `@CurrentUser()` to assign user ownership.

---

## Proposed Changes

### Projects Module (Backend)

#### [NEW] [projects.controller.ts](file:///d:/gradion_assessment/backend/src/projects/projects.controller.ts)
- `POST /projects`: Accepts `multipart/form-data`. Uses `FileInterceptor('file')` to retrieve the `.txt` book file. Passes `title`, `style`, and the file buffer to `ProjectsService`.
- `GET /projects`: Fetches all projects for the logged-in user.
- `GET /projects/:id`: Fetches the detailed project data.

#### [NEW] [projects.module.ts](file:///d:/gradion_assessment/backend/src/projects/projects.module.ts)
Registers `ProjectsController`, `ProjectsService`, imports `StorageModule`, and exports `ProjectsService` for use by the pipeline.

#### [MODIFY] [app.module.ts](file:///d:/gradion_assessment/backend/src/app.module.ts)
Import and register `ProjectsModule`.

---

## Verification Plan

### Automated Tests
We will write integration tests in `projects/projects.controller.spec.ts`:
- **Test cases**:
  - Should refuse requests without a valid JWT token.
  - Should accept `.txt` file uploads alongside `title` and `style` fields.
  - Should fail if no file is provided.
- **Command to run**:
  ```bash
  npm run test -- src/projects/projects.controller.spec.ts
  ```

### Manual Verification
1. Authenticate to get a valid session.
2. Send a POST request to `/projects` with header `Content-Type: multipart/form-data`, passing:
   - `file`: `my_book.txt`
   - `title`: "My Awesome Story"
   - `style`: "Anime art style" (optional)
3. Verify response status is `201 Created`.
4. Verify the file exists locally under `uploads/projects/{projectId}/book.txt`.
