# Phase 02 — Gemini Service & Pipeline Engine

**Plan:** [`plan.md`](./plan.md)
**Priority:** P1 — Critical
**Effort:** ~4h
**Status:** Pending
**Depends on:** Phase 01

---

## Overview

Implement the `GeminiService` that wraps the JS SDK and executes each pipeline step, plus the `PipelineEngine` that enforces step ordering, duplicate call prevention, stuck detection, and per-step state transitions.

This phase is the **business core** of the app.

---

## Key Insights

- Use `@google/genai` JS SDK — Interactions API is confirmed available
- **Two separate context chains**: text chain (steps 1, 2, 4) and image chain (steps 3, 5)
- **Text chain IDs** must be persisted to DB after each step
- **Image chain IDs** do NOT need to be persisted (fresh chain per run)
- **`ensureFileUri()`**: check if `bookFileUri` is still valid before any step; re-upload if expired (48h TTL)
- **Portraits → Illustrations**: upload portrait base64 to Gemini File API → use returned URI as multimodal input for step 5
- **Server-side caps**: `.slice(0, 2)` for characters, `.slice(0, 1)` for chapters — before persisting
- **In-memory lock** (`Map<projectId, Promise>`) + DB `stepState` check = dual duplicate guard
- **No auto-retry** — catch errors, mark step `failed`, expose to user

---

## Architecture

```
PipelineService (orchestrator)
│
├── validateCanRun(project, step) → enforces ordering + duplicate guard
├── runStep(projectId, step)
│   ├── acquire lock
│   ├── mark stepState=running, set stuckAt=now
│   ├── call GeminiService.run{Step}(...)
│   ├── save results to DB
│   ├── mark stepState=idle, currentStep++
│   └── release lock (finally)
│
└── GeminiService (pure Gemini API wrapper)
    ├── uploadBook(text)
    ├── ensureFileUri(project)
    ├── createBookInteraction(fileUri)
    ├── runStyle(bookInteractionId, style?)
    ├── runCharacters(styleInteractionId)
    ├── runPortraits(characters, style) → emits per-portrait events
    ├── runChapters(charactersInteractionId)
    └── runIllustrations(chapters, portraitFileUris, style) → emits per-illustration events
```

---

## Files to Create / Modify

```
backend/src/
├── gemini/
│   ├── gemini.module.ts
│   ├── gemini.service.ts       # Pure Gemini SDK wrapper
│   └── gemini.types.ts         # Prompt, Character, Chapter interfaces
├── pipeline/
│   ├── pipeline.module.ts
│   ├── pipeline.service.ts     # Orchestrator (lock, state transitions)
│   └── pipeline.events.ts      # Event emitter types for WS
```

---

## Implementation Steps (Test-First Workflow)

### Step A: Setup & Installation
1. **Install SDK**
   ```bash
   cd backend
   npm install @google/genai
   ```

2. **Add ProjectsService Methods for State Transitions** (Skeleton only)
   Create method skeletons in `ProjectsService` (so imports in tests don't break):
   - `setStepRunning(id)`
   - `advanceStep(id)`
   - `setStepFailed(id, msg)`
   - `saveStyleResult(id, data)`
   - `saveCharactersResult(id, data)`
   - `savePortrait(id, portrait)`
   - `saveChaptersResult(id, data)`
   - `saveIllustration(id, data)`

### Step B: Write Tests First (TDD)
3. **Write `PipelineService` & `GeminiService` Tests**
   - Create `pipeline/pipeline.service.spec.ts` and `gemini/gemini.service.spec.ts`.
   - **Mock Gemini SDK**: Create mock wrapper for `@google/genai` SDK interactions:
     ```typescript
     const mockGeminiService = {
       uploadBook: jest.fn().mockResolvedValue({ fileUri: 'gs://test/book' }),
       ensureFileUri: jest.fn().mockResolvedValue('gs://test/book'),
       createBookInteraction: jest.fn().mockResolvedValue({ interactionId: 'int-1' }),
       runStyle: jest.fn().mockResolvedValue({ style: 'Watercolor', interactionId: 'int-2' }),
       runCharacters: jest.fn().mockResolvedValue({ characters: [...], interactionId: 'int-3' }),
       runPortraits: jest.fn().mockResolvedValue(undefined),
       runChapters: jest.fn().mockResolvedValue({ chapters: [...], interactionId: 'int-4' }),
       runIllustrations: jest.fn().mockResolvedValue(undefined),
     }
     ```
   - **Test Step Ordering**: Test that running step N throws a ConflictException / BadRequestException if step N-1 is not complete.
   - **Test Duplicate Guard**: Test that simultaneous triggers lock execution so Gemini API is only hit once.
   - **Test Failure Isolation**: Test that if a step fails, the previous steps' results are preserved in the DB, and the state transitions to `failed` with the error message.
   - **Test Stuck Detection**: Test that `isStuck` is invoked and marks a running task as failed if it runs past 5 minutes.
   - **Test Server-Side Caps**: Test that characters are capped at 2 and chapters at 1.
4. **Run Tests to Verify Failure**
   - Run `npx jest` to ensure tests fail on empty/skeleton implementations.

### Step C: Write Implementation to Pass Tests
5. **Implement `GeminiService`**
   - Write `@google/genai` JS SDK calls.
   - Include defensive `extractImage()` helper with error logging in development.
6. **Implement `PipelineService`**
   - Implement the `runningJobs` in-memory lock.
   - Implement state transition calls and step ordering check.
   - Inject EventEmitter / WS Gateway to stream incremental progress events (`step:start`, `item:done`, `step:done`, etc.).
7. **Run Tests to Verify Success**
   - Run tests to confirm the implementation fully satisfies all correctness constraints.

---

## Todo List

- [ ] Install `@google/genai` SDK
- [ ] Implement transition method skeletons in `ProjectsService`
- [ ] **[Test First]** Create `gemini.service.spec.ts` with mocks for the Gemini SDK
- [ ] **[Test First]** Create `pipeline.service.spec.ts` testing step ordering, concurrency lock, failure isolation, and caps enforcement
- [ ] Run tests and verify failures
- [ ] Implement `GeminiService` (SDK wrapper, `ensureFileUri`, defensive `extractImage`) to pass tests
- [ ] Implement `PipelineService` state machine & orchestrator to pass tests
- [ ] Wire Event Emitters for incremental streaming progress
- [ ] Run tests and confirm they all pass successfully

---

## Success Criteria

- Running `npm run test` on the pipeline modules passes successfully.
- Triggering a step twice concurrently fails on the second request due to in-memory/DB lock.
- Attempting to bypass the sequential steps (e.g. running characters before style) is blocked by the step order check.
- High-priority validation checks (caps, stuck threshold) are fully validated by the test suite before any live testing.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Interactions API shape differs between Python/JS SDK | Verify with JS SDK docs; have REST fallback ready |
| Image model returns no image (rate limit) | Catch and rethrow with clear error message to user |
| Portrait upload to File API fails | Wrap in try/catch; mark step failed; portrait `geminiFileUri` stays null |
| `extractImage()` helper breaks on response shape change | Add defensive check; log raw response in dev |
| File URI expired mid-pipeline (step 3 using step 1's URI) | `ensureFileUri()` called at start of EVERY step |

---

## Security Considerations

- `GEMINI_API_KEY` only in environment variable, never committed
- Ship `.env.example` with placeholder value
- Log Gemini errors server-side but return generic messages to client

---

## Next Steps

→ **Phase 03**: REST API & WebSocket Layer (exposes PipelineService to HTTP + WS)
