# Brainstorm Summary: Frontend Technical Stack & Design

This document summarizes the agreed technical decisions for the Frontend (FE) development of the Book Illustration Studio app.

## Agreed Tech Stack

1. **State Management & Caching**: [TanStack Query](https://tanstack.com/query) (`@tanstack/react-query`) + [Axios](https://axios-http.com/)
   - **Rationale**: Axios provides simple, robust HTTP call configurations (base URLs, timeouts, headers). TanStack Query provides declarative state caching, status tracking (idle, loading, error, success), and out-of-the-box UI synchronizations.
2. **Form Management & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
   - **Rationale**: Efficient form handling (minimal re-renders) combined with strict type-safe validation schemas for user registration (Name, Email) and project initiation (Title, Book text paste/upload).
3. **Icons**: [Lucide React](https://lucide.dev/)
   - **Rationale**: High quality, consistent, and SVG-based UI icons fitting the clean and premium look.
4. **Real-time Updates**: WebSockets (using native `WebSocket` or a client wrapper integrated with TanStack Query invalidation)
   - **Rationale**: Delivers immediate updates as each asset (art style, character prompts, portraits, chapter prompts, illustrations) gets generated on the backend, allowing users to watch portraits land in real-time.
5. **UI & Design Aesthetics**: Light Theme (Gradion Design System)
   - **Colors**: Vibrant Orange (`#FF6B00` primary, `#E85F00` hover), warm paper backgrounds (`#F2EEE7`, `#F8F8F8`), ink/dark grey text (`#231F20`, `#434343`), and clean borders (`#BAB7B1`, `#E8E2E0`).
   - **Animations**: Subtle micro-animations (e.g., ring pulses on the active step, hover lift-up transitions on cards/buttons).
   - **Fallback/Loading States**: Spinner animations and progressive portrait loading.

## Feasibility & Implementation Risks

- **WebSocket Connection Resilience**: WebSockets can disconnect. The client must handle automatic reconnection and query refetching when reconnecting to prevent stale/incorrect loading state.
- **Concurrent State Sync**: Ensure that if a user opens the project on multiple tabs or refreshes the page, the WebSocket messages and React Query cache stay consistent.

## Next Steps

1. Install frontend dependencies:
   ```bash
   npm install @tanstack/react-query axios react-hook-form zod lucide-react
   ```
2. Setup Axios client instance pointing to backend server URL.
3. Integrate TanStack Query provider.
4. Design components using the Gradion Design System light theme.
