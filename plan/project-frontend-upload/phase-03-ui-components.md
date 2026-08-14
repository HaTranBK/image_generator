# Phase 03 — UI Screens & State

**Plan:** [plan.md](./plan.md)  
**Priority:** P1  
**Effort:** ~2h  
**Status:** Completed  
**Depends on:** Phase 01, Phase 02  

---

## Overview
Implement the components and pages for uploading book files, choosing art styles, creating projects, and listing them.

---

## Proposed Changes

### Next.js Routing & Pages

#### [MODIFY] [page.tsx](file:///d:/gradion_assessment/frontend/src/app/page.tsx)
- Connect dashboard view to TanStack Query to fetch actual list of user projects using `getProjects`.
- Replace dummy list with real projects, handling loading spinner/skeleton and empty list states.

#### [NEW] [page.tsx](file:///d:/gradion_assessment/frontend/src/app/projects/new/page.tsx)
Implement the New Project screen:
- Renders Title input field.
- Renders Art Style dropdown field with preset options: `Anime`, `Realistic`, `Cartoon`, `Oil Painting`, and `Custom`. If `Custom` is selected, display an additional free-form text input field.
- Handles file drag-and-drop/select zone restricting uploads to `.txt` only.
- Show errors on UI validation failures.
- Calls `createProject` API with a `FormData` object and redirects to `/projects/[id]` on success.

<!-- Updated: Validation Session 1 - Dropdown selection with custom option + Details page routing -->

#### [NEW] [page.tsx](file:///d:/gradion_assessment/frontend/src/app/projects/[id]/page.tsx)
Implement the Project Details page placeholder:
- Displays basic information of the project (e.g. ID, Title, preferred Art Style, upload time/status).
- Shows progress of the pipeline via a horizontal stepper with custom connectors matching the app-demo.html reference.
- Includes a button to go back to the dashboard homepage (`/`).

---

## Verification Plan

### Automated Tests
Run the test suites created in Phase 01:
```bash
cd frontend
npm run test
```
All tests must pass successfully.

### Manual Verification
1. Login to the application to obtain a session cookie.
2. Click "New Project" on the project dashboard.
3. Try submitting with missing fields and verify validation highlights.
4. Drop/select a valid `.txt` file, specify an optional art style, and submit.
5. Verify redirection to the project detail page, and check that the project list updates.
6. Verify file exists in `backend/uploads/projects/{projectId}/book.txt`.
