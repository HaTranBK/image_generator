# Phase 4: Project Detail Page Refactoring

Refactor the massive project details page (`src/app/projects/[id]/page.tsx`) to extract components and hooks to `src/components/pages/projectDetail`.

## Proposed Structure

- `src/components/pages/projectDetail/index.tsx` (Organizes layout, contains bento grid)
- `src/components/pages/projectDetail/hooks/useProjectDetail.ts` (Custom hook encapsulating Socket.io connections, timers, and mutations)
- `src/components/pages/projectDetail/ProjectDetailHeader/index.tsx` (Title, status badge, project ID)
- `src/components/pages/projectDetail/ProjectDetailProgress/index.tsx` (Steppers 1 to 5)
- `src/components/pages/projectDetail/ProjectDetailActions/index.tsx` (Next step button, stop & retry actions, custom style field)
- `src/components/pages/projectDetail/ProjectDetailBento/index.tsx` (Bento layout grid)
- `src/components/pages/projectDetail/ProjectDetailArtStyle/index.tsx` (Step 1 output display)
- `src/components/pages/projectDetail/ProjectDetailCharacterIdentities/index.tsx` (Step 2 output display)
- `src/components/pages/projectDetail/ProjectDetailCharacterPortraits/index.tsx` (Step 3 output display)
- `src/components/pages/projectDetail/ProjectDetailScenePrompts/index.tsx` (Step 4 output display)
- `src/components/pages/projectDetail/ProjectDetailSceneIllustrations/index.tsx` (Step 5 output display)

## Step-by-Step Implementation

1. **Create Custom Hook**:
   - Write `hooks/useProjectDetail.ts` to manage local timer state, websocket connect/disconnect events, and `runStep`/`resetStep` triggers.
2. **Create Bento Grid sub-components**:
   - Write separate files for Step 1 through Step 5 components to keep each output card modular, self-contained, and readable.
3. **Create Page Control components**:
   - Move header navigation, progress stepper, and trigger buttons into distinct sub-components.
4. **Assemble the ProjectDetail View**:
   - Lay out the overall dashboard sections inside `src/components/pages/projectDetail/index.tsx`.
5. **Simplify Route (`src/app/projects/[id]/page.tsx`)**:
   - Retain next/navigation routing bindings, and render `<ProjectDetailView />`.
