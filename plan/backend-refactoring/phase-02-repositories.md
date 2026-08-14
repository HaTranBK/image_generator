# Phase 2: Repository Layer Extraction

This phase extracts direct database query dependencies from services and places them into clean, injectable Repository classes.

---

## Proposed Changes

### Component 1: Projects Repository

#### [NEW] [projects.repository.ts](file:///d:/gradion_assessment/backend/src/projects/provider/projects.repository.ts)
- Create `ProjectsRepository` class decorated with `@Injectable()`.
- Inject `PrismaService`.
- Wrap the following operations inside `Result` (using `neverthrow` `ok` / `err`):
  - `create(data)` -> `Result<Project, Error>`
  - `findMany()` -> `Result<Project[], Error>`
  - `findUnique(id)` -> `Result<Project, Error>`
  - `update(id, data)` -> `Result<Project, Error>`
  - `savePortrait(projectId, portrait)` -> `Result<Portrait, Error>`
  - `saveIllustration(projectId, illustration)` -> `Result<Illustration, Error>`

#### [MODIFY] [projects.module.ts](file:///d:/gradion_assessment/backend/src/projects/projects.module.ts)
- Register `ProjectsRepository` in the `providers` array.
- Export `ProjectsRepository` (if needed by other modules).

---

### Component 2: Users Repository

#### [NEW] [users.repository.ts](file:///d:/gradion_assessment/backend/src/users/provider/users.repository.ts)
- Create `UsersRepository` class decorated with `@Injectable()`.
- Inject `PrismaService`.
- Wrap the following queries inside `Result`:
  - `findByEmail(email)` -> `Result<User, Error>`
  - `findById(id)` -> `Result<User, Error>`
  - `create(data)` -> `Result<User, Error>`

#### [MODIFY] [users.module.ts](file:///d:/gradion_assessment/backend/src/users/users.module.ts)
- Register `UsersRepository` as a provider and export it.

---

## Verification Plan
1. **Repository Compilation**: Ensure that both `ProjectsRepository` and `UsersRepository` compile cleanly.
2. **Prisma Type Safety**: Confirm that Prisma returns are mapped correctly to DTO shapes without raw structure leakage.
