# Book Illustration Studio

A web application that turns a book's text into character portraits and chapter illustrations using the Gemini API.

## Prerequisites

Before running the application, make sure you have:
- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm** installed
- **Docker** and **Docker Compose** (for PostgreSQL database)

---

## Method 1: Quick Start (Automated Scripts — One Command)

This method automatically handles package installation, database setup, database migration, and concurrent application boot with a single command.

### 1. Configure Environment Variables
Copy the `.env.example` file in the backend directory to `.env` and fill in your Gemini API key:
```bash
cp backend/.env.example backend/.env
```
Ensure you have configured `GEMINI_API_KEY` inside `backend/.env`.

### 2. Start Application Stack
At the repository root, execute one of the following commands depending on your shell:
- **macOS / Linux / Git Bash**:
  ```bash
  chmod +x scripts/start.sh scripts/test.sh
  ./scripts/start.sh
  ```
- **Windows PowerShell**:
  ```powershell
  .\scripts\start.ps1
  ```
- **Universal npm Script** (requires WSL/Bash configured):
  ```bash
  npm run start
  ```

### 3. Run Test Suites
At the repository root, execute one of the following commands:
- **macOS / Linux / Git Bash**:
  ```bash
  ./scripts/test.sh
  ```
- **Windows PowerShell**:
  ```powershell
  .\scripts\test.ps1
  ```
- **Universal npm Script**:
  ```bash
  npm run test
  ```

---

## Method 2: Manual Run (Step-by-Step Setup)

If you prefer to set up and run the backend and frontend components manually, follow these steps:

### 1. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and update `GEMINI_API_KEY`:
```bash
cp backend/.env.example backend/.env
```

### 2. Install Dependencies
Install node modules for the workspace, backend, and frontend directories:
```bash
# Install at root
npm install

# Install at backend
cd backend && npm install

# Install at frontend
cd ../frontend && npm install
```

### 3. Start Database
From the `backend` directory, spin up the PostgreSQL database container:
```bash
cd backend
docker-compose up -d
# (Or using Docker compose v2: docker compose up -d)
```

### 4. Sync Database Schema & Generate Prisma Client
Push the database schema structure to PostgreSQL and generate the local Prisma Client:
```bash
cd backend
npx prisma db push
```

### 5. Run the Application
Open two separate terminal instances:
- **Terminal 1 (Backend)**:
  ```bash
  cd backend
  npm run start:dev
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  cd frontend
  npm run dev
  ```

---

## Setup Git Hooks (Husky & lint-staged)

We use **Husky** and **lint-staged** to automatically check code syntax (ESLint) and formatting (Prettier) before each commit.

1. **Install dependencies at the root directory**:
   ```bash
   npm install
   ```
2. **Commit validation**:
   When you run `git commit`, Husky will run `lint-staged` to format changed files and fix ESLint errors automatically. If there are syntax errors that cannot be fixed automatically, the commit will be blocked.
3. **Bypassing the check**:
   ```bash
   git commit -m "commit message" --no-verify
   ```

## Development and Testing Details

- **Backend Details**: Refer to [backend/README.md](file:///d:/gradion_assessment/backend/README.md)
- **Frontend Details**: Refer to [frontend/README.md](file:///d:/gradion_assessment/frontend/README.md)
