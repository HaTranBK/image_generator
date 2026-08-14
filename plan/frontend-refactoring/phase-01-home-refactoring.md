# Phase 1: Home Page Refactoring

Refactor the home page (`src/app/page.tsx`) to extract components to `src/components/pages/home`.

## Proposed Structure

- `src/components/pages/home/index.tsx` (Main Orchestrator Component / View)
- `src/components/pages/home/HomeHeader/index.tsx` (Header section containing the title and "New Project" button)
- `src/components/pages/home/HomeProjectGrid/index.tsx` (List grid displaying projects, handling the loading/empty state)
- `src/components/pages/home/HomeProjectCard/index.tsx` (Individual project card)

## Step-by-Step Implementation

1. **Create Sub-components**:
   - Create `HomeProjectCard/index.tsx` mapping project values, step progress calculation, and labels.
   - Create `HomeProjectGrid/index.tsx` mapping arrays of projects and conditionally rendering the empty state or loader.
   - Create `HomeHeader/index.tsx` rendering title/subtitle and binding click event handler.
2. **Create Home View (`src/components/pages/home/index.tsx`)**:
   - Compose the sub-components inside the orchestrator layout wrapper.
3. **Simplify Route (`src/app/page.tsx`)**:
   - Keep hook initialization (e.g. `useAuth`, `useQuery` for projects, `useRouter`).
   - Retain redirect checks (`useEffect`).
   - Render `<HomeView />` passing necessary props (`projects`, `isLoading`, `onNewProject`, `onSelectProject`).
