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
- **Focus Area**: Loading, error, and empty states.
- **Why**: The user experience depends heavily on clear UI states (e.g. indicating which step is running, displaying error states with retry buttons, showing empty project lists).
- **Testing Approach**: Component unit testing using Jest/React Testing Library or Playwright.

---

## 2. Test Execution Report
*(To be populated after test suite execution. A real run output will be pasted here.)*

```
[Test runner output placeholder]
```
