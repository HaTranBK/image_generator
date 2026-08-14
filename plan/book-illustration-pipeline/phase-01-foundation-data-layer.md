# Phase 01 — Foundation & Data Layer

**Plan:** [`plan.md`](./plan.md)
**Priority:** P1 — Critical (everything else depends on this)
**Effort:** ~3h
**Status:** Pending

---

## Overview

Set up the core data model, storage strategy, and project scaffold that all other phases build on. Includes: user/project entities, persistent state schema (including all Gemini interaction IDs), local file storage structure, and auth middleware.

---

## Key Insights

- **Two state fields** are required: `currentStep` (int 0–5) and `stepState` (enum). One enum cannot express "step 3 done, step 4 running".
- **`stuckAt` timestamp** must be DB-persisted (not in-memory) to survive server restarts.
- **5 interaction IDs** must be persisted: `bookInteractionId`, `styleInteractionId`, `charactersInteractionId`, `chaptersInteractionId` (all text-chain IDs).

<!-- Updated: Validation Session 1 - "4 interaction IDs" → "5 interaction IDs"; chaptersInteractionId added to schema -->
- **File URI TTL**: Gemini File API URIs expire in 48h → always save `bookText` locally so re-upload is possible.
- **Images stored locally**: `/uploads/projects/{projectId}/portraits/`, `/uploads/projects/{projectId}/illustrations/`.
- **Identity is email + name only** — no password, no OAuth. Session via JWT or signed cookie.

---

## Data Schema

### User
```typescript
interface User {
  id: string          // uuid
  email: string       // unique
  name: string
  createdAt: Date
}
```

### Project
```typescript
interface Project {
  id: string
  userId: string
  title: string

  // Book storage
  bookText: string          // full text
  bookFilePath: string      // local .txt path: uploads/projects/{id}/book.txt

  // Gemini context (persist all 4 IDs)
  bookFileUri: string | null        // Gemini File API URI (48h TTL)
  bookInteractionId: string | null
  styleInteractionId: string | null
  charactersInteractionId: string | null
  chaptersInteractionId: string | null   // persisted but NOT used as previousInteractionId for image chain
  // Image interaction IDs: NOT persisted (fresh chain per step run)

  // Step results
  style: string | null
  characters: Character[]   // max 2, server-enforced
  chapters: Chapter[]       // max 1, server-enforced
  portraits: Portrait[]
  illustrations: Illustration[]

  // State machine
  currentStep: 0 | 1 | 2 | 3 | 4 | 5  // 0=not started, 5=all done
  stepState: 'idle' | 'running' | 'failed'
  stuckAt: Date | null      // set on running, check for stuck detection
  errorMessage: string | null

  // Meta
  createdAt: Date
  updatedAt: Date
}
```

### Character / Portrait
```typescript
interface Character {
  id: string
  name: string
  prompt: string
}

interface Portrait {
  characterId: string
  localPath: string          // relative path under /uploads/
  geminiFileUri: string      // uploaded to Gemini File API for step 5 input
}
```

### Chapter / Illustration
```typescript
interface Chapter {
  id: string
  name: string
  prompt: string
}

interface Illustration {
  chapterId: string
  localPath: string
}
```

---

## Storage Decision

**PostgreSQL via Prisma ORM.**

Rationale:
- Proper transactions → safe concurrent writes (no race on `stepState` updates)
- Native JSON column for `characters[]`, `chapters[]`, `portraits[]`, `illustrations[]` arrays
- Prisma migrations make schema evolution trivial
- `docker-compose.yml` spins up Postgres locally — single command, no manual install

> Document in `DECISIONS.md`: PostgreSQL adds an external service dependency vs SQLite. Tradeoff accepted because Prisma+Postgres is the canonical NestJS stack, concurrent write safety is a hard requirement, and `docker-compose` keeps local setup to one command.

---

## File Structure

```
backend/
├── src/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── users.repository.ts
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.service.ts
│   │   └── projects.repository.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts      # email+name → JWT
│   │   └── auth.guard.ts
│   ├── common/
│   │   ├── types.ts             # shared interfaces
│   │   └── constants.ts         # STUCK_THRESHOLD_MS, MAX_CHARS, MAX_CHAPTERS
│   └── storage/
│       └── storage.service.ts   # local file read/write helpers

uploads/                         # gitignored, runtime only
└── projects/
    └── {projectId}/
        ├── book.txt
        ├── portraits/
        │   └── {characterId}.png
        └── illustrations/
            └── {chapterId}.png
```

---

## Implementation Steps (Test-First Workflow)

### Step A: Setup & Scaffolding
1. **Spin up PostgreSQL via Docker**
   ```bash
   # docker-compose.yml at project root
   docker-compose up -d
   ```
   `docker-compose.yml` sample:
   ```yaml
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_DB: book_illustration
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"
       volumes:
         - pgdata:/var/lib/postgresql/data
   volumes:
     pgdata:
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install @prisma/client prisma
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt
   npm install --save-dev @types/passport-jwt
   ```

3. **Define Prisma schema** (`prisma/schema.prisma`) and generate clients
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   model User {
     id        String    @id @default(uuid())
     email     String    @unique
     name      String
     createdAt DateTime  @default(now())
     projects  Project[]
   }

   model Project {
     id        String   @id @default(uuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id])
     title     String

     // Book storage
     bookText      String
     bookFilePath  String

     // Gemini context
     bookFileUri             String?
     bookInteractionId       String?
     styleInteractionId      String?
     charactersInteractionId String?
     chaptersInteractionId   String?    // persist for resumability; NOT used as previousInteractionId for image chain

     // Step results (stored as JSON)
     style         String?
     characters    Json     @default("[]")
     chapters      Json     @default("[]")
     portraits     Json     @default("[]")
     illustrations Json     @default("[]")

     // State machine
     currentStep  Int      @default(0)   // 0–5
     stepState    String   @default("idle")  // idle | running | failed
     stuckAt      DateTime?
     errorMessage String?

     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Create Types & Constants**
   - Create `common/types.ts` and `common/constants.ts` (define limits: `MAX_CHARACTERS = 2`, `MAX_CHAPTERS = 1`, and `STUCK_THRESHOLD_MS`).

### Step B: Write Tests First (TDD)
5. **Write `StorageService` Tests** (`storage/storage.service.spec.ts`)
   - Test that it throws when path is invalid.
   - Test directory creation and file saving/reading.
6. **Write `UsersRepository` & `ProjectsRepository` Tests** (`users/users.repository.spec.ts`, `projects/projects.repository.spec.ts`)
   - Test `findOrCreate` user upsert.
   - Test CRUD for projects.
   - Test that `isStuck` logic returns true if `stuckAt` is older than `STUCK_THRESHOLD_MS`.
   - Test that searching for a project automatically marks it as failed if it is stuck.
7. **Write `AuthService` & `AuthGuard` Tests** (`auth/auth.service.spec.ts`, `auth/auth.guard.spec.ts`)
   - Test JWT payload signing and decoding.
   - Test Guard rejects requests missing JWT or containing invalid JWT.
8. **Run Tests to Verify Failure**
   - Execute `npm run test` or `npx jest` to verify they fail on missing implementation.

### Step C: Write Implementation to Pass Tests
9. **Implement `StorageService`** (`storage/storage.service.ts`)
10. **Implement `UsersRepository` & `UsersService`**
11. **Implement `ProjectsRepository` & `ProjectsService`**
12. **Implement `AuthService`, `AuthGuard`, and `@CurrentUser()` decorator**
13. **Configure global auth guard** (with metadata bypass for `/auth/login`)
14. **Run Tests to Verify Success**
    - Run the tests again to ensure all tests now pass.

---

## Todo List

- [ ] Spin up Postgres database via Docker
- [ ] Define Prisma models & run migrations/generate
- [ ] Create `common/types.ts` and `common/constants.ts`
- [ ] **[Test First]** Create `storage/storage.service.spec.ts`
- [ ] **[Test First]** Create `users/users.repository.spec.ts`
- [ ] **[Test First]** Create `projects/projects.repository.spec.ts` (with stuck validation, caps limit verification)
- [ ] **[Test First]** Create `auth/auth.service.spec.ts` and `auth/auth.guard.spec.ts`
- [ ] Run tests and verify failures
- [ ] Implement `StorageService` to pass tests
- [ ] Implement `UsersService` and repository to pass tests
- [ ] Implement `ProjectsService` (CRUD, stuck auto-fail detection, typed JSON arrays casting) to pass tests
- [ ] Implement `AuthService` & `AuthGuard` to pass tests
- [ ] Run tests and confirm they all pass successfully

---

## Success Criteria

- Running `npm run test` executes the schema, database, storage, and authentication tests successfully.
- Database correctly enforces relations and limits.
- Auth endpoints sign and verify JWT correctly.
- Stuck detection is validated by test suites before the service implementation was marked complete.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Docker không chạy trên máy reviewer | Document `docker-compose up -d` rõ trong README |
| `DATABASE_URL` sai format | Validate connection on startup, crash-fast với clear error message |
| Prisma migration conflict khi schema thay đổi | Dùng `prisma migrate dev`, không edit migration files thủ công |
| Prisma `Json` column trả `unknown` type | Cast rõ ràng khi read: `project.characters as Character[]` |
| JWT secret not set | Validate từ `process.env.JWT_SECRET` on startup, crash-fast nếu thiếu |
| `uploads/` bị commit | Ensure `.gitignore` covers `uploads/` |

---

## Security Considerations

- JWT signed with `JWT_SECRET` env var (never hardcoded)
- All project endpoints validate `project.userId === currentUser.id`
- Image serving endpoint checks auth before streaming file
- Never commit `uploads/` directory

---

## Next Steps

→ **Phase 02**: Gemini Service & Pipeline Engine (depends on Phase 01 types and StorageService)
