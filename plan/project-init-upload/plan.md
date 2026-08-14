---
title: "Project Initialization & Book Text Upload Plan"
description: "Multi-phase implementation plan for initializing projects, handling book text file uploads, setting up local filesystem storage, and persisting project data."
status: pending
priority: P1
effort: 6h
tags: [feature, backend, uploads, storage]
created: 2026-08-13
---

# Project Initialization & Book Text Upload

## Overview

This roadmap defines the implementation for project creation and book `.txt` file processing. 
The goal is to receive a `.txt` book file and an optional style preference from the user, save the file to local disk under a strict folder structure (`uploads/projects/{projectId}/book.txt`), extract its text content, and persist the project state to the database under the authenticated user's ID.

---

## Test-First (TDD) Strategy
As per development rules, we write unit and integration tests *before* writing the actual logic. Each phase defines its respective test files and expectations.

---

## Phases

| # | Phase | Focus | Status | Effort | Link |
|---|-------|-------|--------|--------|------|
| 1 | Storage Foundation | Implement `StorageService` with directory creation, reading, and writing helpers. | Pending | 2h | [phase-01](./phase-01-storage-foundation.md) |
| 2 | Projects Core & Database | Define DTOs, project repository, database mapping, and limits validation. | Pending | 2h | [phase-02](./phase-02-projects-logic-db.md) |
| 3 | API Upload & Controller | Wire up `ProjectsController` with Multer file uploading and authenticate with current user. | Pending | 2h | [phase-03](./phase-03-rest-upload-controller.md) |

---

## Critical Constraints
- Uploaded files must reside on the local disk inside the project workspace directory (`uploads/projects/{projectId}/book.txt`).
- The `uploads/` directory must be excluded from version control (`.gitignore`).
- Endpoints must be protected by the global `JwtAuthGuard`.

---

## Validation Log

### Session 1 — 2026-08-13
**Trigger:** Plan validation requested for project setup and file upload
**Questions asked:** 3

#### Questions & Answers

1. **[Architecture/Risk]** If a user uploads multiple books with the same name, or updates a book for the same project, how should we handle the file storage?
   - Options: Overwrite the existing book.txt file under the same projectId folder (Recommended) | Version the files (e.g. book_v1.txt, book_v2.txt) to keep historical uploads | Reject the upload if a book file already exists for that project
   - **Answer:** Clarified that a project only contains exactly one text file. Re-uploads simply overwrite the single book file.
   - **Rationale:** Keeps file management strictly 1:1, avoiding directory clutter.

2. **[Assumptions]** How should the backend validate the uploaded file content before saving it and using it in the database/Gemini?
   - Options: Validate strictly as UTF-8 text and check for empty file / character limit (Recommended) | Accept any file stream directly without validation to keep upload fast | Convert the file content using a parser to handle PDF/EPUB along with TXT
   - **Answer:** Validate strictly as UTF-8 text and check for empty file / character limit (Recommended)
   - **Rationale:** Prevent invalid formatting from entering the DB or breaking LLM context.

3. **[Tradeoffs]** The style description is optional. If the user provides a style, should it be stored as a raw string, or should it be validated against a predefined list of art styles?
   - Options: Store as a freeform string to allow max user creativity (Recommended) | Limit to a pre-defined set of styles to ensure Gemini works well
   - **Answer:** Store as a freeform string to allow max user creativity (Recommended)
   - **Rationale:** Gives users full control over custom styles.

#### Confirmed Decisions
- Single book file per project: Enforced strictly, file path is deterministic and overwrites.
- Input validation: Only UTF-8 text files allowed.
- Style storage: Stored as raw freeform string.

#### Action Items
- None (already matched in planned phases).

