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

## Phases

| # | Phase | Status | Effort | Link |
|---|-------|--------|--------|------|
| 1 | Foundation & Data Layer | Pending | 3h | [phase-01](./phase-01-foundation-data-layer.md) |
| 2 | Gemini Service & Pipeline Engine | Pending | 4h | [phase-02](./phase-02-gemini-pipeline-engine.md) |
| 3 | REST API & WebSocket Layer | Pending | 3h | [phase-03](./phase-03-api-websocket-layer.md) |
| 4 | Frontend — UI & State | Pending | 4h | [phase-04](./phase-04-frontend-ui-state.md) |
| 5 | Testing & Polish | Pending | 2h | [phase-05](./phase-05-testing-polish.md) |

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
