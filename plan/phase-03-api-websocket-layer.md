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
  → ProjectSummary[]   { id, title, status, currentStep, createdAt }

POST /projects
  body: { title: string, bookText: string }   (or multipart for .txt upload)
  → Project

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

## Implementation Steps

### Step 1 — Install WS dependencies

```bash
cd backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install @nestjs/event-emitter
```

### Step 2 — Create `auth.controller.ts`

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.usersService.findOrCreate(dto.email, dto.name)
    const token = this.authService.signToken(user.id)
    return { token, user }
  }
}
```

### Step 3 — Create `projects.controller.ts`

```typescript
@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  @Get()
  findAll(@CurrentUser() user) {
    return this.projectsService.findByUser(user.id)
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))  // for .txt upload
  async create(@CurrentUser() user, @Body() dto, @UploadedFile() file?) {
    const bookText = file ? file.buffer.toString('utf-8') : dto.bookText
    if (!bookText?.trim()) throw new BadRequestException('Book text required')
    return this.projectsService.create(user.id, dto.title, bookText)
  }

  @Get(':id')
  findOne(@CurrentUser() user, @Param('id') id: string) {
    return this.projectsService.findById(id, user.id)  // ownership check inside
  }
}
```

### Step 4 — Create `pipeline.controller.ts`

```typescript
@Controller('projects/:id/steps')
@UseGuards(AuthGuard)
export class PipelineController {
  @Post('run')
  @HttpCode(202)
  async run(@Param('id') id, @CurrentUser() user, @Body() body: { style?: string }) {
    // Fire and forget — PipelineService handles async execution
    this.pipelineService.triggerStep(id, user.id, body).catch(() => {})
    return { message: 'Step triggered' }
  }

  @Post('reset')
  async reset(@Param('id') id, @CurrentUser() user) {
    const project = await this.projectsService.findById(id, user.id)
    if (!this.projectsService.isStuck(project)) {
      throw new BadRequestException('Step is not stuck')
    }
    await this.projectsService.setStepFailed(id, 'Manually reset by user')
    return { message: 'Step reset' }
  }
}
```

### Step 5 — Create `ws.gateway.ts`

```typescript
@WebSocketGateway({ cors: true })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private projectSubscriptions = new Map<string, Set<string>>() // projectId → socketIds

  async handleConnection(socket: Socket) {
    const token = socket.handshake.query.token as string
    const projectId = socket.handshake.query.projectId as string
    
    // Validate JWT
    const user = this.authService.verifyToken(token)
    if (!user) { socket.disconnect(); return }

    // Validate project ownership
    const project = await this.projectsService.findById(projectId, user.id).catch(() => null)
    if (!project) { socket.disconnect(); return }

    socket.data.userId = user.id
    socket.data.projectId = projectId

    // Add to subscription map
    if (!this.projectSubscriptions.has(projectId)) {
      this.projectSubscriptions.set(projectId, new Set())
    }
    this.projectSubscriptions.get(projectId)!.add(socket.id)

    // Send current state immediately on connect
    socket.emit('message', { type: 'state:sync', project })
  }

  handleDisconnect(socket: Socket) {
    const projectId = socket.data.projectId
    this.projectSubscriptions.get(projectId)?.delete(socket.id)
  }

  // Called by PipelineService via EventEmitter
  @OnEvent('ws.*')
  broadcastToProject(event: { projectId: string; type: string; [key: string]: any }) {
    const { projectId, ...payload } = event
    const sockets = this.projectSubscriptions.get(projectId)
    if (!sockets) return
    sockets.forEach(socketId => {
      this.server.to(socketId).emit('message', payload)
    })
  }
}
```

> Use `@nestjs/event-emitter` (`EventEmitter2`) to decouple `PipelineService` from `WsGateway`. PipelineService emits `ws.{projectId}` events; Gateway listens and broadcasts.

### Step 6 — Create `images.controller.ts`

```typescript
@Controller('api/images')
@UseGuards(AuthGuard)
export class ImagesController {
  @Get(':projectId/:type/:filename')
  async serveImage(
    @Param('projectId') projectId,
    @Param('type') type: 'portraits' | 'illustrations',
    @Param('filename') filename,
    @CurrentUser() user,
    @Res() res: Response,
  ) {
    // Ownership check
    const project = await this.projectsService.findById(projectId, user.id)
    const filePath = this.storageService.getImagePath(projectId, type, filename)
    
    if (!fs.existsSync(filePath)) throw new NotFoundException()
    res.setHeader('Content-Type', 'image/png')
    fs.createReadStream(filePath).pipe(res)
  }
}
```

### Step 7 — Wire EventEmitter in `app.module.ts`

```typescript
imports: [
  EventEmitterModule.forRoot(),
  // ... other modules
]
```

### Step 8 — Handle .txt file upload

Use `MulterModule` or `FileInterceptor` for the book upload. Validate:
- File must be `.txt`
- Max file size (e.g., 5MB)
- If both `bookText` body field AND file provided → use file

---

## Todo List

- [ ] Install `@nestjs/websockets`, `socket.io`, `@nestjs/event-emitter`
- [ ] Create `AuthController` — `POST /auth/login`
- [ ] Create `ProjectsController` — CRUD + file upload support
- [ ] Create `PipelineController` — `POST run` (202) and `POST reset`
- [ ] Create `WsGateway` — connect, disconnect, auth validation, `state:sync` on connect
- [ ] Wire `EventEmitter2` in `PipelineService` → `WsGateway` listener
- [ ] Create `ImagesController` — auth-protected image streaming
- [ ] Add global `ValidationPipe` in `main.ts`
- [ ] Add CORS config in `main.ts` (allow Next.js dev port)
- [ ] Add `multer` config for `.txt` upload validation
- [ ] Test all endpoints with `curl` or Postman before moving to frontend

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
