# Frontend Refactoring Plan

## Overview
This plan defines the refactoring of the Next.js App Router frontend codebase to align with the guidelines in [front-end-structure.md](file:///d:/gradion_assessment/docs/front-end-structure.md). We will split complex page files into structured sub-components (under `src/components/pages/[featureName]`) and clean up the Next.js page routes to act purely as the **Orchestration/Controller Layer**.

## Phases

| # | Phase | Focus | Status | Effort | Link |
|---|-------|-------|--------|--------|------|
| 1 | Home Page Refactoring | Extract Home page components (`HomeHeader`, `HomeProjectGrid`, `HomeProjectCard`) to `src/components/pages/home`. | Completed | 1h | [phase-01-home-refactoring.md](./phase-01-home-refactoring.md) |
| 2 | Login Page Refactoring | Extract Login page components (`LoginForm`) to `src/components/pages/login`. | Completed | 0.5h | [phase-02-login-refactoring.md](./phase-02-login-refactoring.md) |
| 3 | New Project Page Refactoring | Extract New Project components (`NewProjectForm`) to `src/components/pages/newProject`. | Completed | 0.5h | [phase-03-new-project-refactoring.md](./phase-03-new-project-refactoring.md) |
| 4 | Project Detail Page Refactoring | Extract Project Detail page components (Header, Progress, Bento parts) and custom hooks to `src/components/pages/projectDetail`. | Completed | 2h | [phase-04-project-detail-refactoring.md](./phase-04-project-detail-refactoring.md) |
| 5 | Testing & Validation | Run Jest tests and manually verify the application still functions correctly. | Completed | 1h | [phase-05-testing-validation.md](./phase-05-testing-validation.md) |
