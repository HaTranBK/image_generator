# Brainstorm Report: Notebook → Book Illustration App

> **Date:** 2026-08-13
> **Sources:** `Book_illustration.ipynb` (Google Colab) + `business-brainstorm-book-illustration.md`
> **Context:** Mapping Google Colab notebook to full-stack NestJS + Next.js production app

---

## 0. Core Insight (Đừng Quên Cái Này)

Đừng nhìn app như `CRUD App + Gemini API`. Nhìn nó như:

```
             BOOK
              │
              ▼
       AI GENERATION PIPELINE
              │
      ┌───────┴────────┐
      │                │
 STATE MACHINE     AI CONTEXT
      │                │
      ▼                ▼
 RESUME / RETRY    CONSISTENCY
      │                │
      └───────┬────────┘
              ▼
       FINAL ILLUSTRATION
```

Business core mà assessment đang kiểm tra: khả năng thiết kế AI workflow có **state, step dependency, failure handling, retry, resume, concurrency protection, cost constraints, character consistency**.

---

## 1. Pipeline Flow (từ Notebook)

```
Book Text (upload) → Gemini File API → file.uri
         ↓
Step 1: Style         → interactions.create (model: gemini-3.6-flash, text out)
         ↓
Step 2: Characters    → interactions.create (previous_interaction_id=styleId, JSON schema)
                        → array of { name, prompt } — MAX 2 adults only
         ↓
Step 3: Portraits     → interactions.create IMAGE_MODEL per character (context chain)
                        → base64 images → upload to File API → save fileUri
         ↓
Step 4: Chapters      → interactions.create (previous_interaction_id=charactersId, JSON schema)
                        → array of { name, prompt } — MAX 1
         ↓
Step 5: Illustrations → interactions.create IMAGE_MODEL (previous + portrait fileUris as input)
                        → scene images, characters stay consistent via portrait references
```

### Context Chains (Two Separate)

```
Text chain:  bookInteraction → styleInteraction → charactersInteraction → chaptersInteraction
Image chain: portraitsInteraction[0..n] → illustrationsInteraction[0..n]
```

---

## 2. Notebook API → REST / JS SDK Mapping

| Notebook (Python SDK) | App (JS SDK `@google/genai`) |
|---|---|
| `client.files.upload(file)` | `ai.files.upload({ file, mimeType })` |
| `client.interactions.create(model, input, previous_interaction_id)` | `ai.interactions.create({ model, input, previousInteractionId })` |
| `response_format=JSON schema` | `generationConfig: { responseMimeType: "application/json", responseSchema }` |
| Image generation `response_modalities=['Image']` | `generateContent` with `responseModalities: ['IMAGE']` |

> ✅ JS SDK `@google/genai` đã có Interactions API (confirmed). Dùng SDK thay raw REST.

---

## 3. Business Domain Model

```
User
 │
 └── 1:N Project
             │
             ├── Book Text (local filesystem)
             │
             ├── Pipeline State (currentStep, stepState, stuckAt)
             │
             ├── Style (string)
             │
             ├── Characters (max 2)
             │       │
             │       └── Portrait (image)
             │
             └── Chapters (max 1)
                     │
                     └── Illustration (image)
```

---

## 4. Backend Data Model

```typescript
interface Project {
  id: string
  userId: string
  title: string
  bookText: string              // raw text, stored locally as .txt
  bookFilePath: string          // local .txt file path

  // Gemini state (persist ALL interaction IDs)
  bookFileUri: string | null    // Gemini File API URI (48h TTL!)
  bookInteractionId: string | null
  styleInteractionId: string | null
  charactersInteractionId: string | null
  // Image chain IDs: không cần persist (generate mới mỗi lần step)

  // Step results
  style: string | null
  characters: Character[]       // sliced to max 2 server-side
  chapters: Chapter[]           // sliced to max 1 server-side
  portraits: Portrait[]         // { characterId, localPath, geminiFileUri }
  illustrations: Illustration[] // { chapterId, localPath }

  // State machine (hai trường riêng biệt — không gộp chung)
  currentStep: 0 | 1 | 2 | 3 | 4 | 5  // 0 = not started, 5 = all done
  stepState: 'idle' | 'running' | 'failed'
  stuckAt: Date | null          // set khi stepState → 'running', dùng để detect stuck
  errorMessage: string | null

  // Meta
  createdAt: Date
  updatedAt: Date
}
```

---

## 5. Project Status vs Step State (Phân Biệt Rõ)

Một enum status duy nhất **không đủ** để biểu diễn state pipeline.

### Project Status
```
DRAFT        → chưa chạy bất kỳ step nào
IN_PROGRESS  → đang trong pipeline (bất kỳ step nào)
DONE         → cả 5 steps completed
```

### Step State (per step)
```
PENDING      → chưa tới lượt
IN_PROGRESS  → đang chạy
DONE         → hoàn thành
FAILED       → thất bại, user có thể retry
```

Ví dụ hợp lệ:
```
Project status = IN_PROGRESS
Step 1 Style        → DONE
Step 2 Characters   → DONE
Step 3 Portraits    → IN_PROGRESS  ← đang chạy
Step 4 Chapters     → PENDING
Step 5 Illustrations→ PENDING
```

---

## 6. Step State Machine (Per Step)

```
           ┌──────────────┐
           │   PENDING    │ ← initial
           └──────┬───────┘
                  │ user triggers (prev step DONE)
                  ▼
           ┌──────────────┐
           │  IN_PROGRESS │ ← stepState, stuckAt set
           └──┬───────┬───┘
     success  │       │ failure / timeout
              ▼       ▼
           ┌──────┐  ┌────────┐
           │ DONE │  │ FAILED │ → user retries → IN_PROGRESS
           └──────┘  └────────┘
```

**Business rule:** Step N chỉ được execute khi step N-1 đã `DONE`. Enforce backend, không chỉ disable button UI.

---

## 7. Key Design Decisions

### 7.1 JS SDK vs Raw REST
**Decision: JS SDK (`@google/genai`)**
- ✅ Interactions API is wrapped natively (confirmed)
- ✅ Auto-retry, typed responses
- ✅ Faster to implement within 16h constraint
- ⚠️ SDK version sensitivity — pin to tested version in package.json

### 7.2 Image Context Chaining (Portraits → Illustrations)
**Decision: Upload portrait images to Gemini File API**
- Generate portrait → nhận base64 → upload to File API → save `geminiFileUri`
- Step 5 sends `geminiFileUri` as multimodal input (lighter than inline base64)
- Also save local copy at `/uploads/projects/{id}/portraits/` for serving frontend
- Avoids re-encoding base64 on every illustration step

### 7.3 Stuck State Recovery — Double Layer
**Requirement:** User phải có path để recover. Không được yêu cầu manual DB surgery.

```
IN_PROGRESS
      ↓
Server restart / crash
      ↓
Detect stranded state (stuckAt > threshold)
      ↓
User can retry
```

**Implementation:**
- Layer 1 (Backend): DB-persisted `stuckAt` timestamp. On project load, if `stepState === 'running' && Date.now() - stuckAt > 5min` → auto-mark as `failed`. **Survives server restart.**
- Layer 2 (Frontend): "Stuck? Force retry" button appears after 60s running. User-triggered, calls `POST /api/projects/:id/steps/:step/reset`.
- Threshold values: backend=5min, frontend=60s (image generation = 10-30s per image)

### 7.4 Duplicate Call Prevention
**Requirement:** Double-click hoặc Tab A + Tab B không được tạo 2 Gemini calls.

```typescript
// In-memory lock (process-level)
const runningJobs = new Map<string, Promise<void>>() // projectId → promise

async function triggerStep(projectId: string) {
  if (runningJobs.has(projectId)) return // already running, no-op

  // Check DB state too (cross-process safety, covers server restart race)
  const project = await getProject(projectId)
  if (project.stepState === 'running') return

  const job = executeStep(projectId)
  runningJobs.set(projectId, job)
  try { await job } finally { runningJobs.delete(projectId) }
}
```

> ⚠️ In-memory Map bị reset khi server restart → DB `stepState` check là tuyến phòng thủ thứ 2.

### 7.5 Server-Side Cap Enforcement
**Requirement:** Hard cap, không chỉ UI disable.
```typescript
// Step 2: Characters
const characters = JSON.parse(geminiResponse.text).slice(0, 2) // max 2

// Step 4: Chapters
const chapters = JSON.parse(geminiResponse.text).slice(0, 1)  // max 1
```

### 7.6 File URI TTL (48h Gotcha)
Gemini File API URIs expire after 48 hours. User có thể quay lại sau 2 ngày.
- **Solution:** `ensureFileUri()` — trước mỗi step gọi `ai.files.get(fileUri)`, nếu expired → re-upload từ `bookText`. Transparent to user.
- `bookText` luôn được lưu local → re-upload bất cứ lúc nào cần.

### 7.7 Cost Discipline
- **No auto-retry loop:** `ERROR → retry → ERROR → retry` bị cấm. Retry chỉ do user trigger.
- **Book text reuse:** Upload 1 lần qua File API, reference bằng URI + Interactions chaining. Không re-send full text mỗi step.
- **Sequential image generation:** Portraits generate tuần tự (không parallel) — đúng như notebook, phù hợp rate limits.

---

## 8. WebSocket Architecture

### Clarification quan trọng
WebSocket **không phải business logic** — nó chỉ là communication mechanism.

**Persistence của project state mới là source of truth.** WS chỉ giúp push real-time progress.

```
                 ┌───────────────┐
                 │   Frontend    │
                 └───────┬───────┘
                         │
                    HTTP / WS
                         │
                 ┌───────▼───────┐
                 │    Backend    │
                 └───────┬───────┘
                         │
              ┌──────────▼──────────┐
              │   Project State     │
              │  step_state         │
              │  progress           │
              │  results            │
              │  error              │
              └──────────┬──────────┘
                         │
                    Gemini API
```

### Event Protocol
```typescript
type WsEvent =
  | { type: 'step:start';  step: StepName; totalItems?: number }
  | { type: 'item:done';   step: StepName; itemId: string; result: any }
  | { type: 'step:done';   step: StepName }
  | { type: 'step:failed'; step: StepName; error: string }
  | { type: 'state:sync';  project: ProjectSnapshot } // on reconnect
```

### Reconnection Flow
1. Client disconnects (refresh/network blip)
2. Client reconnects → sends `{ type: 'subscribe', projectId }`
3. Server checks `project.stepState`
   - If `running` → emit `state:sync` + continue broadcasting events
   - If `idle/done/failed` → emit `state:sync` only
4. Client rebuilds UI từ snapshot — no data loss

### Per-Item Reveal (Requirement)
Assessment: *"user sees each portrait land, not one long blocking wait"*
```
→ step:start { step: "portraits", totalItems: 2 }
→ item:done  { step: "portraits", itemId: "mole", imageUrl: "/api/images/..." }
→ item:done  { step: "portraits", itemId: "ratty", imageUrl: "/api/images/..." }
→ step:done  { step: "portraits" }
```

---

## 9. GeminiService Structure (NestJS)

```typescript
@Injectable()
class GeminiService {
  // Book management
  uploadBook(text: string): Promise<{ fileUri: string }>
  ensureFileUri(project: Project): Promise<string> // re-upload if expired (48h TTL)

  // Text pipeline
  createBookInteraction(fileUri: string): Promise<{ interactionId: string }>
  runStyle(bookInteractionId: string, style?: string): Promise<{ style: string; interactionId: string }>
  runCharacters(styleInteractionId: string): Promise<{ characters: Character[]; interactionId: string }>
  runChapters(charactersInteractionId: string): Promise<{ chapters: Chapter[]; interactionId: string }>

  // Image pipeline
  runPortraits(characters: Character[]): Promise<{ portraits: Portrait[] }>
  runIllustrations(chapters: Chapter[], portraitFileUris: string[]): Promise<{ illustrations: Illustration[] }>
}
```

---

## 10. Failure là Business State (Không Phải Exception)

Khi Gemini call fail:
```
Style       DONE
Characters  DONE
Portraits   FAILED   ← user thấy lỗi + Retry button
Chapters    PENDING
Illustration PENDING
```

- Project không broken — chỉ step đó bị failed.
- Các step đã DONE giữ nguyên results.
- User retry **chỉ step đó**, không restart from scratch.

---

## 11. Gaps Not in Notebook (App Must Solve)

| Gap | Solution |
|---|---|
| File URI TTL (48h) | `ensureFileUri()` — re-upload if expired, transparent |
| Multi-user isolation | All routes middleware-authenticated, projects scoped by userId |
| Image file serving | `GET /api/projects/:id/images/:filename` với auth guard |
| WebSocket auth | JWT in WS query param, validated on connect |
| Server restart recovery | Load from DB → check `isStuck()` → expose retry path |
| Rate limits (image model) | Sequential image gen (already how notebook does it), no auto-retry |
| Step ordering enforcement | Backend validates `currentStep` before executing, không chỉ UI |

---

## 12. AI Override Candidates (For DECISIONS.md)

| Override | Vấn đề AI propose | Override về |
|---|---|---|
| Image context | Inline base64 | File API URI (lighter, reusable, Gemini-native) |
| Stuck detection | In-memory timer | DB-persisted `stuckAt` (survives restart) |
| Cap enforcement | Frontend only | Server-side `.slice()` (spec requirement) |
| Single status field | One `status` enum | `currentStep` + `stepState` separation (express "step 3 done, step 4 running") |

---

## 13. Business Rules Checklist

| Rule | Business meaning |
|---|---|
| User có nhiều Project | Mỗi book là một project |
| Project có 5 steps | Pipeline cố định |
| Step chạy tuần tự | Không skip step |
| User phải trigger | Không tự động chạy pipeline |
| Characters ≤ 2 | Cost control |
| Characters chỉ adult | Theo reference pipeline |
| Chapters ≤ 1 | Cost control |
| Completed result không mất | Resume requirement |
| Running step không duplicate | Correctness + cost control |
| Failed step retry được | User recovery |
| Stuck step phải recover được | Server crash recovery |
| Book text được reuse | Cost/context efficiency |
| Images và book text lưu local filesystem | Theo scope assessment |

---

## 14. Notebook Sections NOT to Implement

Per §03 of assessment spec — **out of scope:**
- Veo (video animation)
- Lyria (music generation)
- TTS (narration)
- Media mixing / audiobook sections

Only steps 1–5 of "Illustrate a book: The Wind in the Willows" section.

---

## 15. Câu Tóm Tắt Business (Cho Interviewer)

> **User tạo một project từ một cuốn sách, sau đó từng bước biến nội dung của cuốn sách thành một bộ visual assets nhất quán bằng Gemini, trong khi hệ thống phải đảm bảo pipeline đúng thứ tự, không duplicate execution, có thể resume/retry và recover khi server gặp sự cố.**

---

## 16. Success Criteria

- [ ] Book upload + File API integration working
- [ ] Interaction chaining persisted (4 IDs: book, style, characters, chapters)
- [ ] Caps enforced server-side (max 2 chars, max 1 chapter)
- [ ] No duplicate Gemini calls (in-memory lock + DB check)
- [ ] Stuck state recovery path (auto timeout + manual button)
- [ ] Per-item WS events (portraits reveal one by one)
- [ ] File URI TTL handled (ensureFileUri re-upload on expiry)
- [ ] Failure state isolated per step (retry only that step)
- [ ] Image serving through authenticated API
- [ ] Step ordering enforced on backend
- [ ] Tests on step ordering, progress, and retry logic
