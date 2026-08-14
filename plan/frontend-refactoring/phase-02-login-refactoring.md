# Phase 2: Login Page Refactoring

Refactor the login page (`src/app/login/page.tsx`) to extract components to `src/components/pages/login`.

## Proposed Structure

- `src/components/pages/login/index.tsx` (Main View wrapper with visual decorative backgrounds)
- `src/components/pages/login/LoginForm/index.tsx` (Form rendering inputs for email and name, errors, and handling react-hook-form lifecycle)

## Step-by-Step Implementation

1. **Create LoginForm Component**:
   - Move form registration, error rendering, and submit button inside `LoginForm/index.tsx`.
   - Take `register`, `handleSubmit`, `errors`, `isSubmitting`, `onSubmit`, and `apiError` from props.
2. **Create Login Page Component (`src/components/pages/login/index.tsx`)**:
   - Organize background layouts, logo elements, title header, and embed `<LoginForm />`.
3. **Simplify Route (`src/app/login/page.tsx`)**:
   - Keep auth checks (`isAuthenticated`, `isLoading`, `loginMutation`) and routing redirects.
   - Render the `LoginView` wrapper, binding appropriate handlers.
