# Phase 01 — Storage Foundation

**Plan:** [plan.md](./plan.md)  
**Priority:** P1  
**Effort:** ~2h  
**Status:** Pending  

---

## Overview
Implement the file storage utility layer (`StorageService`) to handle writing and reading book files safely, ensuring paths are handled securely relative to the backend's workspace directory.

---

## Key Insights
- **Folder Structure**: Books are saved at `uploads/projects/{projectId}/book.txt` relative to the backend root.
- **Node fs Promises**: Use `fs.promises` (or `fs/promises`) for asynchronous, non-blocking I/O.
- **Directory Verification**: Auto-create nested folders on the fly using `recursive: true` in `mkdir`.
- **Absolute vs Relative**: Ensure all paths computed are strictly inside the designated `uploads` directory.

---

## Proposed Changes

### Storage Module (Backend)

#### [NEW] [storage.service.ts](file:///d:/gradion_assessment/backend/src/storage/storage.service.ts)
A service that provides the following helper methods:
- `saveBookText(projectId: string, fileName: string, content: string): Promise<string>`: Saves content to disk and returns the relative path.
- `saveBookFile(projectId: string, file: Express.Multer.File): Promise<string>`: Writes a Multer buffer to the project folder.
- `readBookText(projectId: string): Promise<string>`: Reads the saved book text file from disk.
- `deleteProjectDir(projectId: string): Promise<void>`: Deletes the directory recursively in case of failure/rollback.

#### [NEW] [storage.module.ts](file:///d:/gradion_assessment/backend/src/storage/storage.module.ts)
A NestJS module that exports the `StorageService`.

---

## Verification Plan

### Automated Tests
We will create `storage/storage.service.spec.ts` first:
- **Test cases**:
  - Should create project directories recursively when saving a file.
  - Should write text files correctly and return relative paths.
  - Should throw error if project path attempts directory traversal (security path sanitization).
  - Should read stored files correctly.
- **Command to run**:
  ```bash
  npm run test -- src/storage/storage.service.spec.ts
  ```
