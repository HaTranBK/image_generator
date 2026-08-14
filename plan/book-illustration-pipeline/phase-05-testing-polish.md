# Phase 05 — Testing & Polish

**Plan:** [`plan.md`](./plan.md)
**Priority:** P2
**Effort:** ~2h
**Status:** Pending
**Depends on:** Phase 01–04

---

## Overview

Write backend unit tests for pipeline logic, frontend component tests for key states, fill `TESTING.md` with strategy + real test run output, populate `DECISIONS.md` with final decisions, and do a full end-to-end manual walkthrough.

---

## Key Insights

- Assessment grades **strategy + real run output**, not coverage. Don't test everything.
- Backend tests focus on: step ordering, duplicate call prevention, stuck detection.
- Frontend tests focus on: component states (loading, error, empty) — not full integration.
- **Test report = real run output** (paste `jest` output or commit generated HTML). Not a summary.
- `TESTING.md` must explain what is tested, what is deliberately NOT tested, and why.
- **Mock Gemini for backend tests** — don't burn quota.
- Integration test (optional but valued): happy-path mock of all 5 steps.

---

## Backend Tests

### Target: `PipelineService` + `ProjectsService`

```
backend/src/pipeline/__tests__/
├── pipeline.service.spec.ts       # step ordering, duplicate guard, stuck detection
└── gemini.service.spec.ts         # unit tests with mocked AI SDK

backend/src/projects/__tests__/
└── projects.service.spec.ts       # isStuck(), state transitions
```

### Test Cases — `PipelineService`

```typescript
// Step ordering
it('should throw if step 2 triggered before step 1 done')
it('should throw if step 3 triggered before step 2 done')
it('should run step 1 if currentStep=0 and stepState=idle')

// Duplicate guard
it('should not trigger Gemini if stepState is already running (DB check)')
it('should not trigger Gemini if in-memory lock is held')
it('should release lock after step success')
it('should release lock after step failure')

// Stuck detection
it('isStuck() returns false if stepState=idle')
it('isStuck() returns false if running but stuckAt < threshold')
it('isStuck() returns true if stepState=running and stuckAt > STUCK_THRESHOLD_MS')
it('findById returns failed state if project is stuck')

// Failure isolation
it('failed step 3 should not clear step 1 and 2 results')
it('failed step should set stepState=failed with errorMessage')
it('retry after failure should re-run only that step')
```

### Test Cases — `ProjectsService`

```typescript
it('setStepRunning sets stepState=running and stuckAt=now')
it('advanceStep increments currentStep and clears stuckAt')
it('setStepFailed sets stepState=failed and errorMessage')
it('saveCharactersResult slices to max 2')
it('saveChaptersResult slices to max 1')
```

### Mock Strategy

```typescript
// Mock GeminiService
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

---

## Frontend Tests

### Target: Key components and states

```
frontend/src/
├── components/ui/__tests__/
│   └── Stepper.spec.tsx           # renders done/current/pending correctly
├── components/project/__tests__/
│   ├── CharacterCard.spec.tsx     # skeleton state, image reveal state
│   ├── ProjectCard.spec.tsx       # status pill, progress bar
│   └── StepActionButton.spec.tsx  # correct label per step, disabled when running
└── app/__tests__/
    └── projects.page.spec.tsx     # empty state, loading skeleton
```

### Test Cases — Frontend

```typescript
// Stepper
it('renders 5 steps')
it('marks steps before currentStep as done')
it('marks currentStep as active')
it('marks steps after currentStep as pending')

// CharacterCard
it('shows skeleton when portrait is undefined')
it('shows image when portrait is provided')
it('shows character name and prompt')

// StepActionButton
it('shows "Generate Style" label for step 1')
it('shows "Generate Characters" label for step 2')
it('disables button when stepState=running')
it('shows "Retry" variant when stepState=failed')

// Project list page
it('shows EmptyState when projects array is empty')
it('shows loading skeleton while query is loading')
it('renders ProjectCard for each project')
```

### Framework

- **Jest** + **React Testing Library** (standard Next.js setup)
- No E2E (Playwright/Cypress) — not expected per assessment spec

---

## DECISIONS.md — Final Entries Needed

The following decisions must be written up (see assessment §2.1):

| Decision | Description |
|---|---|
| JS SDK vs REST | Used `@google/genai` for Interactions API |
| JSON files vs DB | SQLite/Prisma (or JSON with lock) — document tradeoff |
| WebSocket vs polling | WS chosen (already in DECISIONS.md, expand) |
| `currentStep` + `stepState` vs single enum | Why two fields needed |
| Image context: File API URI vs base64 | Why File API URI for portraits → illustrations |
| JWT in localStorage vs httpOnly cookie | Which was chosen and why |
| Model IDs chosen | Which exact model IDs and version note |

**Each entry must include:** who proposed, who pushed back, where landed, what it cost.
**AI override examples (≥3):**
1. Cap enforcement: AI put in frontend → override to server-side `.slice()`
2. Stuck detection: AI used in-memory timer → override to DB-persisted `stuckAt`
3. Image context: AI proposed base64 inline → override to File API URI

---

## TESTING.md — Required Content

```markdown
# Testing Strategy

## What We Test

### Backend
- Step ordering enforcement (cannot run step N if step N-1 not done)
- Duplicate execution guard (in-memory lock + DB state check)
- Stuck step detection (stuckAt > threshold → marked failed)
- Step failure isolation (failed step doesn't clear prior step results)
- Server-side cap enforcement (characters ≤ 2, chapters ≤ 1)

### Frontend
- Component states: loading, error, empty
- Stepper rendering per currentStep value
- StepActionButton label and disabled state
- CharacterCard skeleton vs image reveal

## What We Deliberately Don't Test

- Gemini API integration (mocked — don't burn quota)
- E2E flows (Playwright/Cypress) — outside scope for 16h assessment
- WS reconnection (complex async, manual tested instead)
- Image file I/O (StorageService) — thin wrapper, tested manually

## Test Report

[paste actual jest output here]
```

---

## Manual End-to-End Walkthrough

Before submitting, run this full walkthrough manually:

1. Start backend + frontend (`./start.sh`)
2. Open browser, enter name + email → verify JWT stored
3. Create project with pasted book text
4. Run Step 1 (Style) — verify style text appears in UI
5. Run Step 2 (Characters) — verify 2 character cards appear with prompts
6. Run Step 3 (Portraits) — verify portraits reveal one by one
7. Run Step 4 (Chapters) — verify chapter card appears
8. Run Step 5 (Illustrations) — verify illustration appears
9. Refresh browser mid-step — verify UI shows running state on reconnect
10. Force kill backend during step — verify stuck detection on reload
11. Sign out — verify token cleared, redirect to identity page
12. Sign in again with same email — verify projects still there

---

## Implementation Steps

1. **Verify Test Suites**
   - Run both backend tests and frontend tests to ensure everything is passing after implementation:
     ```bash
     cd backend && npm run test
     cd ../frontend && npm run test
     ```

2. **Fill `TESTING.md`**
   - Detail the TDD methodology followed.
   - Run the final test suite and copy-paste the actual terminal test execution outputs directly into `TESTING.md`.

3. **Fill `DECISIONS.md`**
   - Document all design trade-offs, model versions chosen, state machine choices, and JWT httpOnly cookie decision.
   - Document at least 3 concrete cases where AI implementations were overridden to ensure assessment guidelines.

4. **Create Scripts (`start.sh`, `test.sh` and Windows PowerShell equivalents)**
   - Create `start.sh` & `test.sh` for Linux/bash environments.
   - Create `start.ps1` & `test.ps1` for Windows environments to run the servers and tests in one command.

5. **Manual E2E Walkthrough**
   - Execute the 12-step manual walkthrough (Identity -> Project List -> Create -> Step 1-5 runs -> WS sync -> Stuck simulation).

6. **Final Submission Readiness**
   - Verify `.env.example` has all placeholders.
   - Run a clean clone/setup test.

---

## Todo List

- [ ] Run backend tests and confirm 100% pass rate
- [ ] Run frontend tests and confirm 100% pass rate
- [ ] Document final decisions and AI overrides in `DECISIONS.md`
  - New entries: JWT localStorage tradeoff (vs httpOnly cookie, WS incompatibility)
  - New entries: In-memory lock scope (single-process local dev, cross-process limitation accepted)
- [ ] Write the TDD testing report in `TESTING.md` with raw test output
- [ ] Create `start.sh` and `test.sh` scripts
- [ ] Create `start.ps1` and `test.ps1` scripts for Windows users
- [ ] **[AI Artifacts]** Create `CLAUDE.md` summarizing project architecture, stack decisions, and how to run — per assessment §2.2
- [ ] **[AI Artifacts]** Ensure `.agents/` dir is committed (skills, workflows, brainstorm docs)
- [ ] **[AI Artifacts]** Copy `plan/book-illustration-pipeline/` into `docs/` for discoverability
- [ ] Complete the 12-step manual E2E walkthrough
- [ ] Verify `.env.example` completeness
- [ ] Review git log for clean commits and no leaked keys
<!-- Updated: Validation Session 2 - added AI artifacts tasks (CLAUDE.md, .agents/, docs/plan/) -->

---

## Success Criteria

- `./test.sh` runs without errors and shows test pass output
- `./start.sh` starts both backend and frontend in one command
- `TESTING.md` has real test output (not invented)
- `DECISIONS.md` has ≥4 real decisions, ≥3 AI overrides
- `README.md` has one-command start + test + env vars + architecture overview
- No secrets committed (`git log --all --oneline` + grep)
- Full manual walkthrough completed without blocking issues

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Tests time out on CI due to async Promises | Use `jest.useFakeTimers()` for stuck detection tests |
| `start.sh` not executable on fresh clone | Add `chmod +x start.sh test.sh` to setup instructions |
| DECISIONS.md entries sound too generic | Write specific, honest push-back stories — vague entries score badly |
| Test output lost | Copy to `TESTING.md` immediately after running — don't regenerate later |

---

## Next Steps

**Done.** Review assessment checklist:
- [ ] Full pipeline works end-to-end
- [ ] `DECISIONS.md` complete with ≥3 AI overrides
- [ ] `TESTING.md` with real test run
- [ ] AI artifacts committed (`CLAUDE.md` or `.cursor/`, `docs/plan.md`)
- [ ] `start.sh` + `test.sh` work from clean clone
- [ ] `.env.example` present
- [ ] Git history: small commits, no secrets
