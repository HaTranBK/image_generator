# Architectural and Tech Stack Decisions

This document records the design decisions made for the Book Illustration Studio, emphasizing the collaboration between the engineer and the AI, where the engineer actively directed and corrected the AI's proposals to build a robust, scalable, and premium solution.

---

## 1. State Management & Data Fetching: TanStack Query + Axios
- **Proposed by**: AI suggested a simple native React `useState`/`useEffect` + `fetch` wrapper to query endpoints and handle polling.
- **Pushback**: I rejected the native state approach. Native fetch/state makes handling step progress, caching, and especially **blocking duplicate calls** (as requested in functional requirements) extremely verbose and error-prone. It also fails to sync status across tabs easily.
- **Where we landed**: Integrated **TanStack Query** (React Query) and **Axios**. TanStack Query handles caching, deduplication of queries, and declarative request tracking out-of-the-box. Axios provides a clean interceptor setup for authorization headers.
- **Cost**: A small increase in initial bundle size and setup complexity, which is fully offset by clean, bug-free server state management.

## 2. Real-time Step Progress: WebSockets over HTTP Polling
- **Proposed by**: AI proposed HTTP polling every 2-3 seconds to query the backend for step updates, arguing that polling is simpler to write and maintain (KISS).
- **Pushback**: I pushed back. Polling creates unnecessary HTTP traffic and makes the UI feel less premium due to lag. To achieve real-time, responsive image reveal states where the user sees each portrait land immediately, WebSockets are much more dynamic.
- **Where we landed**: We decided to implement **WebSockets** for push updates from the backend, notifying the frontend as individual assets (art style, character prompts, portraits, illustrations) finish.
- **Cost**: Higher backend infrastructure complexity (NestJS Gateway) and the need to handle client-side reconnection, heartbeat checks, and syncing WebSocket pushes back into the TanStack Query cache.

## 3. Single Book File Constraint per Project
- **Proposed by**: AI proposed adding file versioning (e.g., `book_v1.txt`, `book_v2.txt`) or upload rejection options in case a user uploads multiple books to a single project.
- **Pushback**: I corrected the AI. A project is strictly bound to exactly one book text file. There is no concept of multiple book uploads within a single project. The file is simply stored at a fixed path (`uploads/projects/{projectId}/book.txt`), and any re-upload or update simply replaces/overwrites the single file.
- **Where we landed**: We enforced a strict 1-to-1 mapping between a Project and its book file on disk. The storage service will overwrite the existing file if it exists, keeping the storage clean and avoiding unnecessary file versioning overhead.
- **Cost**: No extra storage or indexing cost; simplifies disk management and cleanup.

---

## If you had one more day, what would you build next and why?
I would build a robust background job queue (e.g., using BullMQ or a lightweight memory queue) for the backend Gemini pipeline. Currently, if the backend crashes mid-call, the WebSocket connection drops and the job is lost. A queue would make step execution completely resilient, allowing failed/interrupted jobs to auto-recover on server restart, ensuring zero data loss and satisfying the "resumable" requirement even under crash scenarios.


