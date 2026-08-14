# Business Brainstorm — Book Illustration AI Application

## 1. Business Overview

Ứng dụng biến nội dung của một cuốn sách thành một bộ hình minh họa nhất quán bằng Gemini AI.

Business flow:

User → Project → Book Text → AI Pipeline → Visual Assets

Pipeline gồm 5 bước chạy tuần tự:

1. Style
2. Characters
3. Portraits
4. Chapters
5. Illustrations

Mục tiêu cuối cùng là biến book text thành visual representation của câu chuyện.

---

## 2. Target User / Business Use Case

Có thể hình dung người dùng là:

- Writer / author
- Content creator
- Người muốn visualize một câu chuyện
- Designer muốn nhanh chóng tạo concept art cho một book

Thay vì tự đọc sách → xác định nhân vật → viết prompt → tạo từng hình → cố giữ nhân vật nhất quán, ứng dụng dùng AI để hỗ trợ toàn bộ quy trình.

---

## 3. Core Business Entity: Project

Project là business model trung tâm.

Một user có nhiều project:

```text
User
├── Project: Harry Potter
├── Project: The Wind in the Willows
└── Project: Alice in Wonderland
```

Mỗi project đại diện cho một lần user muốn illustrate một cuốn sách.

Có thể hình dung project gồm:

```text
Project
├── title
├── book text
├── status
├── current step
├── style
├── characters
│   ├── character 1
│   └── character 2
├── chapters
│   └── chapter 1
└── generated images
```

---

## 4. Business Flow

```text
User
 │
 │ nhập email + name
 ▼
User Account
 │
 │ tạo project
 ▼
Project
 │
 │ upload/paste book text
 ▼
Book
 │
 ▼
┌──────────────────────┐
│ 1. Generate Style    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Find Characters   │
│    max 2 adults      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Generate Portraits│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. Generate Chapter  │
│    max 1 chapter     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. Generate          │
│    Illustration      │
└──────────────────────┘
```

---

## 5. Đây không phải chỉ là một Gemini Request

Không nên nhìn business như:

```text
User → Gemini → Image
```

Mà phải hiểu là:

```text
User
  ↓
Project
  ↓
Pipeline
  ↓
Step 1
  ↓
Step 2
  ↓
Step 3
  ↓
Step 4
  ↓
Step 5
```

Mỗi step là một business state.

Ví dụ:

```text
Project A

Step 1: Style
    DONE

Step 2: Characters
    DONE

Step 3: Portraits
    IN_PROGRESS

Step 4: Chapters
    PENDING

Step 5: Illustrations
    PENDING
```

Nếu user refresh browser, server phải đọc state hiện tại của project và tiếp tục từ đó, không được chạy lại từ đầu.

---

# 6. Step 1 — Style

### Input

- Book text
- Optional user-provided style

Ví dụ:

```text
Watercolor children's book style
```

hoặc để trống để AI generate style từ book text.

### Output

Ví dụ:

```text
Art style:
Whimsical watercolor illustration...
```

### Business meaning

Style xác định visual language chung cho toàn bộ book.

Style này được dùng làm context cho các bước hình ảnh phía sau.

---

# 7. Step 2 — Characters

AI đọc book và xác định main adult characters.

Ví dụ:

```json
[
  {
    "name": "Mole",
    "prompt": "A gentle anthropomorphic mole..."
  },
  {
    "name": "Rat",
    "prompt": "An elegant anthropomorphic rat..."
  }
]
```

### Business constraints

- Chỉ lấy adult characters.
- Tối đa 2 characters.
- Constraint phải được enforce ở server-side.

Đây là giới hạn business/cost chứ không chỉ là giới hạn UI.

---

# 8. Step 3 — Portraits

Sau khi có characters, hệ thống generate một portrait cho mỗi character.

```text
Character
    ↓
Character Prompt
    ↓
Gemini Image Generation
    ↓
Portrait
```

Ví dụ:

```text
Mole → Portrait
Rat  → Portrait
```

Portraits có vai trò quan trọng vì sẽ được reuse làm reference cho bước illustration.

Mục đích là giữ character consistency giữa portrait và scene illustration.

---

# 9. Step 4 — Chapters

AI tạo chapter illustration prompt, có reference đến characters.

Ví dụ:

```json
[
  {
    "name": "Mole Meets Rat",
    "prompt": "Mole and Rat meet..."
  }
]
```

### Business constraint

```text
MAX 1 CHAPTER
```

Đây cũng là hard requirement để giới hạn API cost.

---

# 10. Step 5 — Illustration

Đây là output cuối cùng có giá trị trực tiếp với user.

Input có thể bao gồm:

```text
Chapter prompt
+
Style
+
Character portraits
+
Character information
```

Sau đó:

```text
Gemini Image Generation
        ↓
Final Chapter Illustration
```

Ví dụ:

```text
The river bank
       +
Mole portrait
       +
Rat portrait
       +
Watercolor style
       ↓
Final illustration
```

Business goal:

> Biến book text thành visual representation của câu chuyện.

---

# 11. Business Rule: Pipeline phải chạy theo thứ tự

User không được tự do chạy bất kỳ step nào.

Không hợp lệ:

```text
Project mới
    ↓
Generate Illustration
```

Phải:

```text
Style
  ↓
Characters
  ↓
Portraits
  ↓
Chapters
  ↓
Illustrations
```

Mỗi step chỉ được execute khi step trước đã succeeded.

Đây là business rule nên được enforce ở backend, không chỉ disable button ở frontend.

---

# 12. Project Status và Step State

Nên phân biệt Project Status và Step State.

## Project Status

```text
DRAFT
IN_PROGRESS
DONE
```

## Step State

```text
PENDING
IN_PROGRESS
DONE
FAILED
```

Ví dụ:

```text
Project
status = IN_PROGRESS

Style
DONE

Characters
DONE

Portraits
IN_PROGRESS

Chapters
PENDING

Illustrations
PENDING
```

Một enum status duy nhất khó biểu diễn chính xác trạng thái pipeline.

---

# 13. Failure là một Business State

Nếu Gemini call fail:

```text
Generate Portraits
        ↓
Gemini API
        ↓
ERROR
```

Không nên biến toàn bộ project thành broken.

Thay vào đó:

```text
Style       DONE
Characters  DONE
Portraits   FAILED
Chapters    PENDING
Illustration PENDING
```

User có thể:

```text
Retry Portraits
```

và chỉ retry step bị failed.

Các step đã hoàn thành phải được giữ nguyên.

---

# 14. Stuck Step / Server Crash Recovery

Một trường hợp quan trọng:

```text
User clicks Generate Portrait
        ↓
Backend
        ↓
Gemini request
        ↓
Server crashes
```

State có thể bị để lại:

```text
Portraits = IN_PROGRESS
```

Nếu không có recovery:

```text
IN_PROGRESS forever
```

User phải có path để recover.

Business flow:

```text
IN_PROGRESS
      ↓
Server restart
      ↓
Detect / recover stranded state
      ↓
User can retry
```

Không được yêu cầu manual database surgery.

---

# 15. WebSocket không phải Business Logic

WebSocket chỉ là communication mechanism.

Business requirement thật sự là:

```text
Step đang chạy
       ↓
Server chết
       ↓
Step bị stranded
       ↓
User phải có cách recover
       ↓
Retry step
```

WebSocket chỉ giúp:

```text
Backend
   ↓
Real-time progress
   ↓
Frontend
```

Persistence của project state mới là source of truth.

Có thể hình dung:

```text
                 ┌───────────────┐
                 │   Frontend    │
                 └───────┬───────┘
                         │
                    HTTP / WS
                         │
                 ┌───────▼───────┐
                 │    Backend     │
                 └───────┬───────┘
                         │
              ┌──────────▼──────────┐
              │   Project State     │
              │                     │
              │ step_state          │
              │ progress            │
              │ results             │
              │ error               │
              └──────────┬──────────┘
                         │
                    Gemini API
```

---

# 16. Duplicate Execution là Business Problem

Ví dụ user double-click:

```text
Click Generate
Click Generate
```

hoặc:

```text
Tab A → Generate
Tab B → Generate
```

Không được tạo 2 Gemini calls.

Expected:

```text
Request 1
   ↓
Step = IN_PROGRESS
   ↓
Request 2
   ↓
Không tạo Gemini call thứ 2
```

Đây vừa là correctness requirement vừa là cost-control requirement.

---

# 17. Resume là Business Requirement

Ví dụ:

```text
Style       DONE
Characters  DONE
Portraits   DONE
Chapters    IN_PROGRESS
```

User:

```text
Refresh
Logout
Server restart
```

Khi mở lại project:

```text
Chapters = IN_PROGRESS
```

và không được:

```text
Restart from Style ❌
```

Generated results trước đó phải được giữ lại.

---

# 18. Cost Discipline

Gemini calls có cost/quota nên business yêu cầu:

### Không auto retry loop

```text
ERROR
 ↓
retry
 ↓
ERROR
 ↓
retry
 ↓
ERROR
```

Không được làm vậy.

Retry phải do user trigger.

### Không gửi full book text ở mỗi step

Thay vào đó, book content phải được reuse thông qua:

- conversation/session chaining
- file upload + reference
- hoặc equivalent mechanism

Mục tiêu là không gửi lại toàn bộ book text nhiều lần.

---

# 19. Business Domain Model

Có thể hình dung domain như:

```text
User
 │
 └── 1:N Project
             │
             ├── Book Text
             │
             ├── Pipeline State
             │
             ├── Style
             │
             ├── Characters (max 2)
             │       │
             │       └── Portrait
             │
             └── Chapters (max 1)
                     │
                     └── Illustration
```

Pipeline:

```text
PROJECT
   │
   ▼
STYLE
   │
   ▼
CHARACTERS
   │
   ▼
PORTRAITS
   │
   ▼
CHAPTERS
   │
   ▼
ILLUSTRATIONS
```

---

# 20. Business Rules Checklist

| Rule | Business meaning |
|---|---|
| User có nhiều Project | Mỗi book là một project |
| Project có 5 steps | Pipeline cố định |
| Step chạy tuần tự | Không skip step |
| User phải trigger | Không tự động chạy pipeline |
| Characters ≤ 2 | Cost control |
| Characters chỉ adult | Theo reference pipeline |
| Chapters ≤ 1 | Cost control |
| Completed result không mất | Resume |
| Running step không duplicate | Correctness + cost control |
| Failed step retry được | User recovery |
| Stuck step phải recover được | Server crash recovery |
| Book text được reuse | Cost/context efficiency |
| Images và book text lưu local filesystem | Theo scope assessment |

---

# 21. Cách giải thích Business với Interviewer

Nếu interviewer hỏi:

> "What is the business of your application?"

Có thể trả lời:

> The application allows users to turn a book's text into a consistent set of AI-generated visual assets. A user creates a project for a book, then explicitly progresses through a five-step pipeline: defining the art style, identifying main adult characters, generating character portraits, creating a chapter illustration prompt, and finally generating the chapter illustration. The pipeline is resumable, retryable, and protected against duplicate AI executions.

---

# 22. Core Insight

Không nên nhìn application này như:

```text
CRUD App + Gemini API
```

Mà nên nhìn nó như:

```text
             BOOK
              │
              ▼
       AI GENERATION PIPELINE
              │
      ┌───────┴────────┐
      │                │
 STATE MACHINE     AI CONTEXT
      │                │
      ▼                ▼
 RESUME / RETRY    CONSISTENCY
      │                │
      └───────┬────────┘
              ▼
       FINAL ILLUSTRATION
```

Business core mà assessment đang kiểm tra không chỉ là "gọi Gemini API".

Nó là khả năng thiết kế một AI workflow có:

- State
- Step dependency
- Failure handling
- Retry
- Resume
- Concurrency protection
- Cost constraints
- Character consistency

---

# 23. Một câu tóm tắt để nhớ

> **User tạo một project từ một cuốn sách, sau đó từng bước biến nội dung của cuốn sách thành một bộ visual assets nhất quán bằng Gemini, trong khi hệ thống phải đảm bảo pipeline đúng thứ tự, không duplicate execution, có thể resume/retry và recover khi server gặp sự cố.**
