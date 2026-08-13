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
- **4 interaction IDs** must be persisted: `bookInteractionId`, `styleInteractionId`, `charactersInteractionId`, `chaptersInteractionId`.
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
  // Image interaction IDs: NOT persisted (new chain per step run)

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

## Implementation Steps

1. **Spin up PostgreSQL via Docker**
   ```bash
   # docker-compose.yml at project root
   docker-compose up -d
   ```
   `docker-compose.yml` mẫu:
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
   ```

3. **Define Prisma schema** (`prisma/schema.prisma`)
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

4. **Create `common/types.ts`** — export all shared interfaces

5. **Create `common/constants.ts`**
   ```typescript
   export const STUCK_THRESHOLD_MS = 5 * 60 * 1000  // 5 minutes
   export const MAX_CHARACTERS = 2
   export const MAX_CHAPTERS = 1
   ```

6. **Create `storage/storage.service.ts`**
   - `saveBookText(projectId, text): Promise<string>` → writes to `uploads/projects/{id}/book.txt`
   - `saveImage(projectId, type, name, buffer): Promise<string>` → writes PNG to correct subfolder
   - `getImagePath(projectId, type, name): string`
   - Ensure `uploads/` directory exists on startup

7. **Create `users/` module**
   - `UsersService.findOrCreate(email, name)` — no password, upsert by email
   - `UsersRepository` wrapping Prisma client
   - Upsert pattern: `prisma.user.upsert({ where: { email }, update: { name }, create: { email, name } })`

8. **Create `projects/` module**
   - `ProjectsService.create(userId, title, bookText)`
   - `ProjectsService.findByUser(userId)`
   - `ProjectsService.findById(id)`
   - `ProjectsService.isStuck(project)` → `stepState === 'running' && stuckAt > THRESHOLD`
   - On `findById`: if `isStuck` → auto-mark as `failed`, save, return updated
   - Note: Prisma returns `Json` columns as `unknown` — cast to typed arrays when reading

9. **Create `auth/` module**
   - `POST /auth/login` — body `{ email, name }` → upsert user → return JWT
   - `AuthGuard` — validate JWT on all protected routes
   - `@CurrentUser()` decorator to extract user from request

10. **Add `AUTH_GUARD` globally** or per-controller (except `/auth/login`)

11. **Create `/uploads` static serving**
    - NestJS `ServeStaticModule` or custom guard-protected route
    - Auth-check before serving images (projects are user-scoped)

---

## Todo List

- [ ] Create `docker-compose.yml` with PostgreSQL service
- [ ] Add `DATABASE_URL` to `.env.example` (`postgresql://postgres:postgres@localhost:5432/book_illustration`)
- [ ] Install Prisma + `@prisma/client`
- [ ] Write `prisma/schema.prisma` with User + Project models
- [ ] Run `prisma migrate dev --name init` + `prisma generate`
- [ ] Define User + Project schema
- [ ] Create `common/types.ts` and `constants.ts`
- [ ] Create `StorageService` (book text + image file I/O)
- [ ] Create `UsersService` with `findOrCreate`
- [ ] Create `ProjectsService` with all CRUD + `isStuck` logic
- [ ] Create `AuthService` — email+name → JWT
- [ ] Create `AuthGuard` and `@CurrentUser()` decorator
- [ ] Wire `uploads/` directory creation on app bootstrap
- [ ] Add auth-protected image serving endpoint

---

## Success Criteria

- `POST /auth/login` with `{email, name}` returns JWT
- `GET /projects` returns user's projects (empty array if none)
- `POST /projects` creates project, saves `book.txt` to disk
- `GET /projects/:id` returns full project state
- Stuck detection: if `stepState=running` and `stuckAt` > 5min → returns `stepState=failed`
- `uploads/projects/{id}/book.txt` exists after project creation

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
