# Phase 01 — Test Suite Foundation

**Plan:** [plan.md](./plan.md)  
**Priority:** P1  
**Effort:** ~1h  
**Status:** Completed  

---

## Overview
Implement the test specs for the new project creation page and API integration. Since the frontend lacks testing utilities, this phase will also configure Jest, React Testing Library, and jsdom in the project.

<!-- Updated: Validation Session 1 - Configure Jest/RTL testing environment -->

---

## Proposed Changes

### Testing Configuration

#### [NEW] [jest.config.ts](file:///d:/gradion_assessment/frontend/jest.config.ts) or [jest.config.js](file:///d:/gradion_assessment/frontend/jest.config.js)
- Configure Jest to use the `jest-environment-jsdom` environment.
- Setup support for TypeScript/TSX (using `ts-jest` or Next.js built-in Jest Rust compiler support via `next/jest`).

#### [NEW] [jest.setup.ts](file:///d:/gradion_assessment/frontend/jest.setup.ts)
- Import `@testing-library/jest-dom` for custom matchers.
- Mock router and global components/APIs if necessary.

### Frontend Tests

#### [NEW] [new-project.spec.tsx](file:///d:/gradion_assessment/frontend/src/app/projects/new/__tests__/new-project.spec.tsx)
Write unit and integration tests for the "New Project" component before implementing it:
- **Test cases**:
  - Should render form fields: Title (required input), Style Preference (optional input), and File Upload zone.
  - Should show a validation message if submitting without a title.
  - Should show a validation message if submitting without a book file.
  - Should reject non-`.txt` files with an error message and refuse to select them.
  - Should accept `.txt` files, showing the file name.
  - Should call the API with the correct payload structure (using `FormData` containing `title`, `style`, and `file`) when submitted.
  - Should disable the submit button during submission and handle network failure gracefully.

---

## Verification Plan

### Automated Tests
Run Jest to ensure that these tests fail initially:
```bash
cd frontend
npm run test -- src/app/projects/new/__tests__/new-project.spec.tsx
```
The tests must fail with clear compilation/missing component errors before we write the implementation.
