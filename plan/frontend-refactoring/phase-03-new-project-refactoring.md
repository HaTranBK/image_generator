# Phase 3: New Project Page Refactoring

Refactor the project creation screen (`src/app/projects/new/page.tsx`) to extract components to `src/components/pages/newProject`.

## Proposed Structure

- `src/components/pages/newProject/index.tsx` (Page container rendering decorative gradients and background layout)
- `src/components/pages/newProject/NewProjectForm/index.tsx` (Form fields handling drag and drop file upload, title input, style dropdowns, text area, error lists, and submission actions)

## Step-by-Step Implementation

1. **Create NewProjectForm Component**:
   - Extract form inputs, drag-and-drop file inputs, text area inputs, validation error rendering, and buttons.
   - Accept title, styles, errors, book text, drag & drop state handlers, and callbacks from props.
2. **Create NewProject View (`src/components/pages/newProject/index.tsx`)**:
   - Wrap the form under general grid structures.
3. **Simplify Route (`src/app/projects/new/page.tsx`)**:
   - Keep project creation API call logic, redirection handlers, and page form submit wrapper.
   - Render `<NewProjectView />` with props.
