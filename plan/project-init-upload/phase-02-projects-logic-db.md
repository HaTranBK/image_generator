# Phase 02 — Projects Core & Database

**Plan:** [plan.md](./plan.md)  
**Priority:** P1  
**Effort:** ~2h  
**Status:** Pending  
**Depends on:** Phase 01  

---

## Overview
Build the service logic to handle project validation, database entry creation via Prisma, and enforcing basic initialization parameters.

---

## Key Insights
- **DB Client**: Prisma is already installed. We will inject `PrismaService`.
- **Project Structure**: On creation, set state fields: `currentStep = 0`, `stepState = 'idle'`.
- **Optional Style**: If style is provided, it is stored in `style` DB column. Otherwise it remains `null` (AI will determine in Step 1).

---

## Proposed Changes

### Projects Service (Backend)

#### [NEW] [projects.service.ts](file:///d:/gradion_assessment/backend/src/projects/projects.service.ts)
Implement the core project actions:
- `createProject(userId: string, title: string, style?: string, bookBuffer?: Buffer): Promise<Project>`
  - Handles the coordinate sequence of: saving file to disk via `StorageService`, reading buffer content to text, writing the project record in the database.
- `findUserProjects(userId: string): Promise<Project[]>`
- `findOneUserProject(userId: string, projectId: string): Promise<Project>`

#### [NEW] [create-project.dto.ts](file:///d:/gradion_assessment/backend/src/projects/dto/create-project.dto.ts)
Validates fields `title` (required, non-empty) and `style` (optional string).

---

## Verification Plan

### Automated Tests
We will write `projects/projects.service.spec.ts`:
- **Test cases**:
  - Should throw validation errors if project title is missing.
  - Should invoke `StorageService` to write the `.txt` content to disk.
  - Should persist correct initial state (`currentStep = 0`, `stepState = 'idle'`) in the DB.
  - Should safely fetch project by ID if it belongs to the requesting user, otherwise throw ForbiddenException.
- **Command to run**:
  ```bash
  npm run test -- src/projects/projects.service.spec.ts
  ```
