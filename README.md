# Book Illustration Studio

A web application that turns a book's text into character portraits and chapter illustrations using the Gemini API.

## Prerequisites

Before running the application, make sure you have:
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm** installed

### Setup Git Hooks (Husky & lint-staged)

We use **Husky** and **lint-staged** to automatically check code syntax (ESLint) and formatting (Prettier) before each commit.

1. **Install dependencies at the root directory** (this will automatically initialize git hooks via the `prepare` script):
   ```bash
   npm install
   ```
2. **Commit validation**:
   When you run `git commit`, Husky will run `lint-staged` to format changed files and fix ESLint errors automatically. If there are syntax errors that cannot be fixed automatically, the commit will be blocked until they are resolved.
3. **Bypassing the check** (only when absolutely necessary, e.g., work in progress):
   ```bash
   git commit -m "commit message" --no-verify
   ```

## Development and Testing

- **Backend**: Refer to [backend/README.md](file:///d:/gradion_assessment/backend/README.md)
- **Frontend**: Refer to [frontend/README.md](file:///d:/gradion_assessment/frontend/README.md)
