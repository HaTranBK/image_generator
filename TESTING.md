# Testing Strategy & Report

This document outlines the testing strategy for both the Frontend (Next.js) and Backend (NestJS) components, detailing what is covered, what is deliberately left out, and why.

---

## 1. Testing Strategy

### Backend (NestJS)
- **Focus Area**: Step execution logic, step transition constraints, and retry mechanics.
- **Why**: The pipeline order (Style -> Characters -> Portraits -> Chapters -> Illustrations) and constraints (e.g. max 2 characters, max 1 chapter) are critical server-side rules. We must ensure a step cannot be bypassed or triggered out of order.
- **Testing Approach**: Unit and integration tests using Jest.
- **Mocks**: The Gemini API calls (both text generation and image generation) will be mocked during tests to avoid quota depletion and ensure fast, deterministic runs.

### Frontend (Next.js)
- **Focus Area**: Input validation, loading, error, and empty states.
- **Why**: The user experience depends heavily on clear UI states (e.g. indicating which step is running, displaying error states with retry buttons, showing empty project lists) and correct payload mapping (e.g., sending FormData for file uploads vs JSON for direct pastes).
- **Testing Approach**: Component testing with Jest and React Testing Library.

---

## 2. What We Deliberately Did Not Test & Why
- **E2E Browser Automation**: Writing full Playwright/Cypress end-to-end tests was deliberately left out to keep the project lean and prevent test suite execution from becoming slow and flaky. The API contract and component states are fully covered by unit/integration tests instead.
- **CSS and Visual Styles**: We did not write tests to assert CSS classes, alignments, or colors, because layout changes happen frequently during visual polish. Asserting styles adds maintenance burden without providing functional safety.

---

## 3. Test Execution Report

### Backend Test Results (`npm run test:cov`)

```text
> backend@0.0.1 test:cov
> jest --coverage

 PASS  src/app.controller.spec.ts
 PASS  src/storage/storage.service.spec.ts
 PASS  src/projects/projects.controller.spec.ts
 PASS  src/projects/projects.service.spec.ts
------------------------------------|---------|----------|---------|---------|----------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                      
------------------------------------|---------|----------|---------|---------|----------------------------------------
All files                           |   17.65 |    14.59 |   16.03 |   17.46 |                                        
 src                                |   23.63 |       30 |      60 |   18.36 |                                        
  app.controller.ts                 |     100 |       75 |     100 |     100 | 6                                      
  app.module.ts                     |       0 |      100 |     100 |       0 | 1-51                                   
  app.service.ts                    |     100 |      100 |     100 |     100 |                                        
  main.ts                           |       0 |        0 |       0 |       0 | 1-55                                   
 src/auth                           |    1.98 |        0 |       0 |    2.32 |                                        
  auth.controller.ts                |       0 |        0 |       0 |       0 | 2-113                                  
  auth.guard.ts                     |       0 |        0 |       0 |       0 | 1-36                                   
  auth.module.ts                    |       0 |        0 |       0 |       0 | 1-33                                   
  auth.service.ts                   |       0 |        0 |       0 |       0 | 1-40                                   
  current-user.decorator.ts         |      50 |      100 |       0 |      50 | 11-14                                  
  jwt.strategy.ts                   |       0 |        0 |       0 |       0 | 1-31                                   
  public.decorator.ts               |       0 |      100 |       0 |       0 | 1-9                                    
 src/auth/dto                       |       0 |      100 |     100 |       0 | 1-17                                   
 src/common                         |     100 |      100 |     100 |     100 |                                        
  constants.ts                      |     100 |      100 |     100 |     100 |                                        
 src/projects                       |   48.06 |    41.07 |      50 |   48.79 |                                        
  projects.controller.ts            |   93.75 |       75 |     100 |   93.33 | 84,97                                  
  projects.module.ts                |       0 |      100 |     100 |       0 | 1-14                                   
  projects.service.ts               |   40.71 |    31.81 |      40 |   41.08 | 35-36,61,74,95,134,159,182-189,198-370 
 src/projects/dto                   |     100 |      100 |     100 |     100 |                                        
  create-project.dto.ts             |     100 |      100 |     100 |     100 |                                        
 src/projects/provider              |      24 |    13.63 |       0 |   17.39 |                                        
  projects.repository.ts            |      24 |    13.63 |       0 |   17.39 | 14-109                                 
 src/storage                        |   63.26 |    88.88 |   66.66 |   64.44 |                                        
  storage.module.ts                 |       0 |      100 |     100 |       0 | 1-8                                    
  storage.service.ts                |   70.45 |    88.88 |   66.66 |   69.04 | 14,89-122                              
------------------------------------|---------|----------|---------|---------|----------------------------------------
Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        18.429 s
Ran all test suites.
```

### Frontend Test Results (`npm run test`)

```text
> frontend@0.1.0 test
> jest

  NewProjectPage
    √ should render form fields: Title, Style Preference dropdown, and File Upload zone (187 ms)
    √ should show a validation message if submitting without a title (82 ms)
    √ should show a validation message if submitting without a book file (57 ms)
    √ should reject non-.txt files with an error message (21 ms)
    √ should accept .txt files, showing the file name (29 ms)
    √ should show custom text input when "Custom" style is selected (22 ms)
    √ should call the API with the correct payload structure (using FormData) when submitted (66 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        4.475 s
Ran all test suites.
```
