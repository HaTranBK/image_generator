# Phase 03 — REST API & WebSocket Layer

**Plan:** [`plan.md`](./plan.md)
**Priority:** P1
**Effort:** ~3h
**Status:** Pending
**Depends on:** Phase 01, Phase 02

---

## Overview

Expose the `PipelineService` and project data via REST API endpoints and a WebSocket gateway for real-time step progress. This phase connects backend logic to the frontend.

---

## Key Insights

- **WebSocket is communication, not business logic** — all state lives in DB. WS only pushes progress.
- **Reconnect flow**: Client re-subscribes → server sends `state:sync` snapshot → frontend rebuilds from that.
- **WS auth**: JWT in query param (`?token=...`) validated on connect.
- **Image serving**: Authenticated GET endpoint — not static public folder — because projects are user-scoped.
- **Step trigger**: `POST /projects/:id/steps/run` — single endpoint for all steps (backend determines which step to run next based on `currentStep`).
- **Force-retry stuck step**: `POST /projects/:id/steps/reset` — clears `stepState=running` to allow retry. Only valid if `isStuck()`.

---

## API Contract

### Auth
```
POST /auth/login
  body: { email: string, name: string }
  response: { token: string, user: { id, email, name } }
```

### Projects
```
GET  /projects
  → ProjectSummary[]   { id, title, status, currentStep, stepState, createdAt }
  Note: `status` is derived server-side from currentStep+stepState:
        currentStep=5 → 'Done' | stepState='running' → 'In Progress' | else → 'Draft'

POST /projects
  body: { title: string, bookText: string }   (JSON — paste text flow)
     OR multipart/form-data: { title: string, bookFile: .txt }  (file upload flow)
  backend detects via content-type: application/json vs multipart/form-data
  Multer middleware only applied when content-type is multipart
  → Project
<!-- Updated: Validation Session 2 - POST /projects handles both JSON and multipart, Multer detect via content-type; status derived at backend -->

GET  /projects/:id
  → Project (full — including characters, chapters, portraits, illustrations)

DELETE /projects/:id   (optional)
```

### Pipeline
```
POST /projects/:id/steps/run
  body: { style?: string }   (only used for step 1)
  → { message: 'Step triggered' }   202 Accepted
  Errors: 409 if already running, 400 if already done / wrong order

POST /projects/:id/steps/reset
  body: {}
  → { message: 'Step reset' }
  Errors: 400 if step is NOT stuck (prevents misuse)
```

### Images
```
GET /api/images/:projectId/:type/:filename
  Headers: Authorization: Bearer {token}
  → streams the image file
  type: 'portraits' | 'illustrations'
```

---

## WebSocket Protocol

### Connection
```
ws://localhost:3001?token={jwt}&projectId={id}
```

### Server → Client Events
```typescript
// On connect: always send current state
{ type: 'state:sync', project: ProjectSnapshot }

// Step lifecycle
{ type: 'step:start',  step: number, totalItems?: number }
{ type: 'item:done',   step: number, itemId: string, imageUrl: string }
{ type: 'step:done',   step: number }
{ type: 'step:failed', step: number, error: string }
```

### Client → Server
```typescript
// Re-subscribe after reconnect
{ type: 'subscribe', projectId: string }
```

---

## Files to Create / Modify

```
backend/src/
├── auth/
│   └── auth.controller.ts        # POST /auth/login
├── projects/
│   ├── projects.controller.ts    # GET,POST /projects, GET /projects/:id
│   └── projects.dto.ts           # CreateProjectDto, ProjectSummaryDto
├── pipeline/
│   └── pipeline.controller.ts   # POST /projects/:id/steps/run|reset
├── gateway/
│   ├── gateway.module.ts
│   ├── ws.gateway.ts             # NestJS WebSocket gateway
│   └── ws.types.ts               # WsEvent union type
├── images/
│   └── images.controller.ts     # GET /api/images/:projectId/:type/:filename
└── app.module.ts                 # wire all modules
```

---

## Implementation Steps (Test-First Workflow)

### Step A: Setup & Installation
1. **Install WebSocket & Event-Emitter Dependencies**
   ```bash
   cd backend
   npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
   npm install @nestjs/event-emitter
   ```

2. **Create DTOs & Controller Skeletons**
   Create the required endpoint route skeletons in controllers without implementation, so they compile.

### Step B: Write Tests First (TDD)
3. **Write Controller Integration/Unit Tests**
   - **`auth.controller.spec.ts`**: Validate login input format and JWT signing return object.
   - **`projects.controller.spec.ts`**: Test that project creation handles both raw text body and `.txt` file uploads; assert that all endpoints return 401 Unauthorized without JWT.
   - **`pipeline.controller.spec.ts`**: Test that triggering step returns 202 Accepted; test that resetting checks `isStuck` and throws 400 BadRequest if the step is not stuck.
   - **`images.controller.spec.ts`**: Test that GET `/api/images/:projectId/:type/:filename` returns 401 if unauthenticated, 403 if authenticated as another user, 404 for non-existent files, and streams the image with correct headers on success.
4. **Write WebSocket Gateway Tests**
   - **`ws.gateway.spec.ts`**: Setup mock client sockets. Test that connection with invalid JWT or unauthorized project ID disconnects the client. Test that successful connection emits `state:sync` containing current project status immediately. Test that EventEmitter broadcasts to correct rooms.
5. **Run Tests to Verify Failure**
   - Execute the test command (`npm run test` or `npx jest`) to confirm the skeletons fail the assertions.

### Step C: Write Implementation to Pass Tests
6. **Implement Controllers**
   - Build auth, projects, pipeline, and image serving controller logic.
   - Implement ownership validation checks (e.g. checking project ownership on all endpoints).
7. **Implement `WsGateway`**
   - Build connection/disconnection logic, JWT authentication, and event broadast listener.
8. **Configure CORS & Global Pipes**
   - Configure global ValidationPipe and CORS policies in `main.ts` to allow cross-origin requests from the frontend.
9. **Run Tests to Verify Success**
   - Ensure all controller and WS gateway tests run and pass.

---

## Todo List

- [ ] Install `@nestjs/websockets`, `socket.io`, `@nestjs/event-emitter`
- [ ] Create endpoint skeletons for Controllers & Gateway
- [ ] **[Test First]** Create `auth/auth.controller.spec.ts`
- [ ] **[Test First]** Create `projects/projects.controller.spec.ts` (authentications, ownership, DTO validation)
- [ ] **[Test First]** Create `pipeline/pipeline.controller.spec.ts` (run step, reset stuck check)
- [ ] **[Test First]** Create `images/images.controller.spec.ts` (security validation, stream validation)
- [ ] **[Test First]** Create `gateway/ws.gateway.spec.ts` (handshake jwt validation, immediate `state:sync` sync, project scoping)
- [ ] Run tests and verify failures
- [ ] Implement controllers (Auth, Projects, Pipeline, Images) to pass tests
- [ ] Implement `WsGateway` & event handlers to pass tests
- [ ] Add CORS configurations & validation pipes in `main.ts`
- [ ] Run tests and confirm they all pass successfully

---

## Success Criteria

- `POST /auth/login { email, name }` → returns JWT
- `POST /projects` with `bookText` → creates project, returns full project object
- `POST /projects/:id/steps/run` while step already running → returns 409
- `POST /projects/:id/steps/run` for step 2 when step 1 not done → returns 400
- WS client connects → immediately receives `state:sync` with project snapshot
- WS client receives `item:done` event as each portrait finishes (not all at once)
- `GET /api/images/:id/portraits/char1.png` without auth → 401
- `GET /api/images/:id/portraits/char1.png` with another user's token → 403/404

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| WS connection drops during long image generation | `state:sync` on reconnect covers this — client rebuilds from DB state |
| CORS blocking WS handshake | Set `origin` in `WebSocketGateway` decorator to Next.js dev URL |
| EventEmitter memory leak (many projects) | Clean up subscription map in `handleDisconnect` |
| File upload too large | Limit Multer `fileSize` (5MB), validate MIME type |
| Multiple steps triggered via rapid API calls | PipelineService in-memory lock handles this |

---

## Security Considerations

- All project endpoints verify `project.userId === currentUser.id`
- WS connection verifies JWT + project ownership on connect, not per-message
- Image serving endpoint checks auth before streaming (not static public path)
- `POST /steps/reset` only works if project is genuinely stuck (prevents abuse)

---

## Next Steps

→ **Phase 04**: Frontend — UI & State (connects to these endpoints + WS)
