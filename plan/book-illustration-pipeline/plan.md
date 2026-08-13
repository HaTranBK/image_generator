---
title: "Book Illustration AI — Full-Stack Implementation Plan"
description: "5-phase plan to build a resumable, multi-step Gemini pipeline web app from NestJS backend to Next.js frontend."
status: pending
priority: P1
effort: 16h
branch: main
tags: [feature, fullstack, backend, frontend, api, database]
created: 2026-08-13
---

# Book Illustration AI — Full-Stack Implementation Plan

## Overview

Build a web app that turns a book's text into AI-generated character portraits and chapter illustrations using the Gemini API. The core challenge is not "calling Gemini" but designing a **stateful, resumable AI pipeline** with step dependency enforcement, duplicate execution prevention, and per-step failure recovery.

Reference: [`brainstorm-pipeline-notebook-mapping.md`](../reports/brainstorm-pipeline-notebook-mapping.md)

---

## Test-First (TDD) Strategy

To prevent testing from being a retrospective activity designed to pass already-written code (which masks bugs and violates safety constraints), we follow a strict **Test-First (TDD) approach**:
1. **Write Tests First**: For each phase, the very first action is to write unit, schema-validation, or integration test files containing all success/failure assertions.
2. **Verify Failure**: Run the test suite and verify that the tests fail as expected because the implementation does not exist yet.
3. **Write Implementation**: Write the minimal code required to satisfy the specifications.
4. **Pass & Refactor**: Ensure tests pass, then refactor with confidence.

---

## Phases

| # | Phase | Methodology | Status | Effort | Link |
|---|-------|-------------|--------|--------|------|
| 1 | Foundation & Data Layer | Write repository and schema validation tests first, then build models/auth. | Pending | 3h | [phase-01](./phase-01-foundation-data-layer.md) |
| 2 | Pipeline Engine & Gemini Mocking | Write unit tests for step ordering/locks first, then implement the engine. | Pending | 4h | [phase-02](./phase-02-gemini-pipeline-engine.md) |
| 3 | API & WebSocket Gateway | Write REST/WS gateway controller tests first, then build endpoint routers. | Pending | 3h | [phase-03](./phase-03-api-websocket-layer.md) |
| 4 | Frontend UI & Component State | Write Jest/RTL tests for UI states (empty/loading/error) first, then build UI. | Pending | 4h | [phase-04](./phase-04-frontend-ui-state.md) |
| 5 | E2E Walkthrough & Polish | Perform final E2E verification, document decisions, and final cleanup. | Pending | 2h | [phase-05](./phase-05-testing-polish.md) |

---

## Key Architectural Decisions

- **JS SDK** (`@google/genai`) for Interactions API (confirmed available)
- **NestJS** backend with **Next.js** frontend (already scaffolded)
- **PostgreSQL** (Prisma ORM, `docker-compose` for local setup)
- **WebSocket** (NestJS Gateway) for real-time per-item progress
- **Two-field state**: `currentStep` (0-5) + `stepState` (idle/running/failed) — not one enum
- **DB-persisted `stuckAt` timestamp** for server-crash recovery

---

## Dependencies

- `@google/genai` ≥ 2.10.0 (Interactions API)
- NestJS WebSocket Gateway (`@nestjs/websockets`, `socket.io`)
- Prisma ORM + PostgreSQL (via `docker-compose`)
- `sharp` or `fs` for local image management
- Frontend: TanStack Query + Axios (already set up)
- Next.js (already scaffolded)

---

## Critical Constraints (from assessment)

- **Max 2 characters, max 1 chapter** — enforced server-side
- **No auto-retry loops** — retry is user-triggered only
- **Book text sent to Gemini once** — via File API + Interactions chaining
- **No duplicate Gemini calls** — in-memory lock + DB state guard
- **Images and book text on local filesystem** — no S3/blob storage

---

## Validation Log

### Session 1 — 2026-08-13
**Trigger:** User requested plan validation before implementation
**Questions asked:** 8

#### Questions & Answers

1. **[Architecture]** Phase 01 chỉ có `chaptersInteractionId` trong Phase 02 nhưng không có trong Prisma schema. Cần xử lý `chaptersInteractionId` như thế nào?
   - Options: Thêm vào schema | Không cần | In-memory only
   - **Answer:** Thêm `chaptersInteractionId String?` vào Prisma schema — cần cho Step 5 nếu Illustrations chạy tiếp chain từ Chapters
   - **Rationale:** Nếu server restart giữa Step 4 và Step 5, `chaptersInteractionId` cần được persist để resume; đồng thời cần track đủ 4 IDs nhất quán với Key Insights đã doc.

2. **[Assumptions]** `validateCanRun` chỉ check `stepState !== running` và `currentStep !== 5`. Step ordering enforcement có đủ không?
   - Options: Đủ (`currentStep` encode ordering) | Cần thêm explicit guard | Bổ sung data invariant checks
   - **Answer:** Đúng — `currentStep` đã encode thứ tự, không cần check thêm
   - **Rationale:** `currentStep` là single source of truth. Step N chỉ advance nếu step N-1 thành công, nên check `currentStep` là đủ và tránh over-engineering.

3. **[Tradeoff]** JWT storage: `localStorage` vs `httpOnly cookie`.
   - Options: localStorage | httpOnly cookie | Để cả hai qua .env flag
   - **Answer:** httpOnly cookie — bảo mật hơn, phòng XSS; NestJS có thể set cookie trực tiếp
   - **Rationale:** httpOnly cookie không accessible qua JS → mitigate XSS. NestJS `res.cookie()` với `httpOnly: true, sameSite: 'strict'`.

4. **[Risk]** `extractImage()` helper chưa có implementation detail — nếu response shape sai thì toàn bộ portrait/illustration pipeline fail.
   - Options: Defensive checks + dev logging | Integration test trước | Check SDK docs trước
   - **Answer:** Define `extractImage()` với defensive checks + log raw response trong dev mode; throw clear error nếu không tìm thấy image part
   - **Rationale:** Fast feedback loop. Nếu shape sai, log raw response giúp debug ngay mà không cần re-run toàn bộ pipeline.

5. **[Scope]** `start.sh`/`test.sh` là Bash scripts trên Windows environment.
   - Options: Giữ .sh + document Windows equivalent | Tạo cả .sh lẫn .bat | Bỏ scripts, chỉ README
   - **Answer:** Giữ start.sh + test.sh, document rõ trong README rằng Windows dùng lệnh tương đương
   - **Rationale:** Reviewer thường dùng Git Bash/WSL. Document Windows equivalent là safety net đủ.

6. **[Architecture]** WS fire-and-forget + `state:sync` on reconnect — có cần fallback polling không?
   - Options: Giữ nguyên | Thêm polling fallback | Thêm SSE
   - **Answer:** Giữ là đối soát step-by-step: fire-and-forget (202), WS push progress
   - **Rationale:** `state:sync` on reconnect đã cover mất event. Thêm polling tăng complexity không cần thiết trong scope assessment.

7. **[Architecture]** `chaptersInteractionId` có nên dùng làm `previousInteractionId` cho image chain Step 5 không?
   - Options: Không dùng cho image chain (fresh chain) | Dùng làm context | Không persist, in-memory only
   - **Answer:** Persist vào DB nhưng KHÔNG dùng cho image chain — Step 5 dùng fresh image chain
   - **Rationale:** Text chain và image chain là 2 chain riêng biệt. `chaptersInteractionId` chỉ cần persist để có thể re-run Step 5 nếu cần mà không phải re-run Step 4.

8. **[Risk]** Model ID `gemini-3.1-flash-lite-image` trong Phase 02 — có phải real model ID không?
   - Options: `gemini-2.0-flash-preview-image-generation` | `imagen-3.0-generate-002` | Giữ như plan
   - **Answer:** Giữ như plan — xác nhận dùng `gemini-3.1-flash-lite-image`
   - **Rationale:** Cần verify lại với SDK docs trong Phase 02 execution. Model ID là risk đã được doc trong Risk Assessment.

#### Confirmed Decisions

- **`chaptersInteractionId`**: Persist vào Prisma schema (`chaptersInteractionId String?`) — bắt buộc update Phase 01
- **JWT storage**: httpOnly cookie — thay thế localStorage trong Phase 04
- **`extractImage()` helper**: Implement với defensive checks + dev-mode raw logging — update Phase 02
- **Step ordering**: `currentStep` encode đủ, không cần thêm explicit guard
- **WS fallback**: Không cần polling fallback, `state:sync` on reconnect là đủ
- **Image chain**: Step 5 dùng fresh image chain, `chaptersInteractionId` chỉ persist không dùng làm `previousInteractionId`
- **Model ID**: Giữ nguyên, cần verify trong Phase 02 execution

#### Action Items
- [x] Thêm `chaptersInteractionId String?` vào Prisma schema (Phase 01)
- [x] Update Key Insights Phase 01: 4 IDs → 5 IDs (thêm `chaptersInteractionId`)
- [x] Update `saveChaptersResult()` spec để persist `chaptersInteractionId`
- [x] Switch JWT từ localStorage sang httpOnly cookie (Phase 04)
- [x] Add `extractImage()` implementation spec với defensive checks (Phase 02)
- [x] Document Windows equivalent commands trong README note (Phase 05)

#### Impact on Phases
- Phase 01: Prisma schema cần thêm `chaptersInteractionId String?`; Key Insights cần update "4 interaction IDs" → "5 interaction IDs"
- Phase 02: `extractImage()` cần implementation spec với defensive checks và dev-mode logging
- Phase 04: JWT storage phải dùng `httpOnly cookie` thay vì `localStorage`
- Phase 05: README section cần note Windows equivalent commands cho `start.sh`/`test.sh`
