# Project Frontend Upload & Creation Plan

## Overview
This roadmap defines the frontend implementation for project creation, book file upload, and style selection to match the backend REST endpoints. Following a strict Test-First (TDD) approach, we write tests before implementation.

## Phases

| # | Phase | Focus | Status | Effort | Link |
|---|-------|-------|--------|--------|------|
| 1 | Test Suite Foundation | Write unit and integration test specs for file upload rules and form behavior first. | Completed | 1h | [phase-01-test-suite-foundation.md](./phase-01-test-suite-foundation.md) |
| 2 | API Integration Layer | Create API service layer to interface with the NestJS projects endpoints. | Completed | 1h | [phase-02-api-service.md](./phase-02-api-service.md) |
| 3 | UI Screens & State | Build "New Project" forms, dropzone, and update "Dashboard List" using TanStack Query. | Completed | 2h | [phase-03-ui-components.md](./phase-03-ui-components.md) |

## Validation Log

### Session 1 — 2026-08-14
**Trigger:** User requested validation of the frontend upload plan.
**Questions asked:** 3

#### Questions & Answers

1. **[Architecture]** Testing Setup: No testing packages or scripts are configured in the frontend workspace. How should we set up the testing environment?
   - Options: (Recommended) Install and configure Jest with React Testing Library (RTL) and jsdom. | Install and configure Vitest with React Testing Library. | Skip automated tests for now and focus purely on manual verification & implementation.
   - **Answer:** (Recommended) Install and configure Jest with React Testing Library (RTL) and jsdom.
   - **Rationale:** Standard testing setup ensures TDD behaves as specified in Phase 1.

2. **[Scope]** Redirect Target: The plan specifies redirecting to /projects/[id] on success, but this page does not exist yet. Where should the user be redirected after a successful upload?
   - Options: (Recommended) Redirect back to the main dashboard (homepage) and show a success toast/notification. | Redirect to /projects/[id] (this requires creating a new project details page/route in the frontend).
   - **Answer:** Redirect to /projects/[id] (this requires creating a new project details page/route in the frontend).
   - **Rationale:** Requires adding the project detail page route to the scope to ensure a complete user flow.

3. **[Scope]** Art Style Input: How should the "Art Style Preference" field be presented in the project creation form?
   - Options: (Recommended) A dropdown selection with preset styles (e.g., Anime, Realistic, Cartoon, Oil Painting) plus an optional custom text field. | A simple free-form text input field.
   - **Answer:** (Recommended) A dropdown selection with preset styles (e.g., Anime, Realistic, Cartoon, Oil Painting) plus an optional custom text field.
   - **Rationale:** Better UX and cleaner inputs while retaining customization flexibility.

#### Confirmed Decisions
- **Testing Tooling**: Install Jest, `@testing-library/react`, `jest-environment-jsdom`, `@types/jest`, `ts-jest` (or similar next-compatible jest config) and configure them in `frontend/package.json`.
- **New Routes**: Create `/projects/[id]/page.tsx` (detail view page) in addition to `/projects/new/page.tsx`.
- **Form Design**: Dropdown for style options (Anime, Realistic, Cartoon, Oil Painting, Custom) + optional custom text field if "Custom" is selected.

#### Action Items
- [ ] Configure Jest and React Testing Library in `frontend`.
- [ ] Create `/projects/[id]/page.tsx` to display project details, stage progress, etc.
- [ ] Implement the dropdown selector and custom input in the project form.

#### Impact on Phases
- **Phase 01**: Needs details on setting up Jest and RTL packages/configs.
- **Phase 03**: Needs to include the new detail page `src/app/projects/[id]/page.tsx` and hook up redirect to it.

