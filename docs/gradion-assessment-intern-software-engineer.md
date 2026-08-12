# Intern Fullstack Developer — Take-Home Assessment

> **Effort:** up to ~16 hours of focused work
> **Deadline:** 3 calendar days from receipt
> **Delivery:** One Git repository link (GitHub / GitLab / Bitbucket)
> **Questions?** Reach out to the recruiter who sent you this document

---

## 01 · What You're Building

A web app that turns a book's text into character portraits and a chapter illustration, using the Gemini API.

Five steps, run one at a time by the user. Style → characters → portraits → chapters → illustrations.

**We are not counting features.** We are checking three things:

1. Does the full stack actually work together, end to end?
2. Did you use AI as your copilot — and can you prove how?
3. Do your decisions make sense when you explain them?

Scope is bounded on purpose. Use AI tools hard. Use your own judgment on whether the output is any good.

---

## 02 · Required: AI as Your Copilot

**You must build this with an AI coding tool** (Claude Code, Cursor, Copilot, Codex, or equivalent). This is not a bonus — it is how we work at Gradion, and it is a graded part of this assessment.

We are not looking for a perfect AI workflow. We are looking for evidence that you **drove** the AI instead of pasting whatever it gave you.

### 2.1 Proof of work — in `DECISIONS.md` (required)

No separate worklog. `DECISIONS.md` holds **decisions only** — not a time log, not a diary of what you did when. Your git history covers that.

A heading per decision, then a short paragraph in your own words: who proposed it, who pushed back, where you landed, and what it cost you. No template to fill in.

> ## Separate `status` and `step_state`
>
> Claude proposed a single `status` enum. I pushed back — one enum can't express "step 3 done, step 4 currently running", which is exactly the state a refresh mid-step has to read correctly. Split it in two. Cost: two fields to keep in sync, and a stranded `step_state` needs a timeout to clear.
>
> ## JSON files instead of a database
>
> My call. Claude pushed back on concurrent writes, fairly — I added a per-project write lock. A DB buys nothing at this scope. No transactions is the real cost I accepted.

The push-back goes both ways — some of these should be AI catching your mistake. 4–6 real decisions is plenty, a paragraph or two each. Close the file with one short answer to: _"If you had one more day, what would you build next and why?"_ **Vague or obviously back-filled entries score badly.**

### 2.2 AI artifacts in-repo (required)

Whatever your tool actually produced — commit it:

- `CLAUDE.md` / `.cursor/rules` / `AGENTS.md` — your project context files
- `.claude/` — commands, settings, memory
- `docs/plan.md`, `docs/architecture.md` — planning or architecture notes you generated
- Saved prompts, agent configs, transcript exports

### 2.3 Where you overrode the AI (required)

Call out **at least 3 places** in `DECISIONS.md` where AI output was wrong, unsafe, or overcomplicated — and what you did instead. This is the single strongest signal in the whole submission.

### 2.4 Git history (required)

Your commits are the story of how you worked.

- Small, meaningful commits with real messages. **No single giant commit.**
- Commit as you go, not all at the end. We look at timestamps.
- If a commit was mostly AI-authored, say so in the message body (e.g. `co-authored-by`, or a one-line note). Honesty scores; hiding it doesn't.

---

## 03 · The Reference Pipeline

Your pipeline **must follow** the section **"Illustrate a book: The Wind in the Willows"** (steps 1–5 only) in Google's notebook:

> https://colab.research.google.com/github/google-gemini/cookbook/blob/main/examples/Book_illustration.ipynb

**Run it yourself in Colab before writing any app code.** The table below is the contract — the steps and the caps. The _mechanics_ are not in this document: which model, which call, how context is chained between steps, how structured output is requested. Get those from the notebook, not from guesswork.

> **Hint:** you don't need Python, and you don't need a Google SDK. Every call the notebook makes is a plain HTTP endpoint you can hit from any language — file upload, structured JSON output, conversation chaining, image generation. Read the notebook for the _pipeline_, then map each call to the REST docs.
> https://ai.google.dev/gemini-api/docs
>
> Note the SDK coverage: the newest conversation API is wrapped only by the Python and JS SDKs so far. Its REST endpoint is fully documented, so on any other stack REST is the path — not a downgrade.

| #   | Step              | Produces                                                                                                                                                    |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Style**         | An art style for the book — user-provided, or generated from the book's text                                                                                |
| 2   | **Characters**    | Structured list of the main **adult** characters, each with an image prompt — **max 2**. The notebook restricts to adults on purpose; keep that restriction |
| 3   | **Portraits**     | One portrait image per character                                                                                                                            |
| 4   | **Chapters**      | Structured list of chapter illustration prompts, referencing the characters — **max 1**                                                                     |
| 5   | **Illustrations** | One scene illustration per chapter, reusing the portraits so characters stay consistent                                                                     |

The **2 characters / 1 chapter caps are hard requirements** — they bound API cost per submission. **Enforce them server-side**, not just in the UI.

**Out of scope — do not implement:** the notebook's later sections (Veo animation, Lyria music, TTS narration, media mixing, audiobook). See §08 if you finish early.

---

## 04 · Functional Requirements

### 4.1 Identity

Email + name to start. Email exists → load their projects. Doesn't exist → create the user. No password, no OAuth. Session representation (cookie, token, header) is your call.

### 4.2 Projects

- Create a project from a book's text — pasted or uploaded as `.txt` — plus a project title.
- A user has many projects and sees a list of their own, each with its current status.
- Opening a project shows exactly where it is in the pipeline and lets the user run the next step.

### 4.3 Pipeline behavior

Requirements on _behavior_. Schema, API shape, and progress storage are your decisions — explain them in `DECISIONS.md`.

- **User-driven, in order.** Each step needs an explicit user action. A step cannot run before the previous ones have succeeded.
- **Resumable.** Refresh, logout, or server restart mid-pipeline → reopening the project shows its true state and continues from there. Never from scratch. Never losing generated results.
- **No duplicate calls.** Refresh, second tab, or double-click during a running step must **not** fire the Gemini call twice. The UI shows the existing in-flight state instead.
- **Specific in-progress state.** Calls take 10–30s+ (longer for images). The UI must show _which_ step is running, not a bare spinner.
- **Failures are retryable.** A failed step leaves the project usable. The user sees the failure and retries **that step only**, without touching completed steps.
- **Nothing stuck forever.** If a step is stranded in "in progress" (server died mid-call), the user must have some path to retry it — no manual DB surgery.
- **Cost discipline.** Never auto-retry a Gemini call in a loop — retries are user-triggered only. Send the book's content to Gemini **once** and reuse it across steps (chat/session chaining, file upload + reference, or equivalent). Do not re-send the full text on every step.

### 4.4 Frontend

`app-demo.html` ships with this assessment. **Open it, click through it — it is the reference for scope and behavior.** Your UI must cover everything it does. Match or beat it visually; you do not have to copy its layout.

Required screens and states:

- **Identity** — name + email, with validation.
- **Project list** — per-project title, created date, status pill (Draft / In progress / Done), and a visual progress indicator across the 5 steps. Empty state when there are none.
- **New project** — title, `.txt` upload _and_ paste-text, with validation.
- **Project detail**
  - Title, created date, and the book text — readable in full, at any point in the pipeline.
  - A stepper showing all 5 steps: done / current / pending.
  - Current style once generated.
  - Character cards — name, prompt, portrait once generated.
  - Chapter cards — name, prompt, illustration once generated.
  - One clear action button for the current step; step 1 accepts an optional user-supplied style.
  - Per-item progress while images generate — the user sees each portrait land, not one long blocking wait.
- **In-progress state** naming the running step. **Error state** with a retry button for that step. **Stuck-step recovery** affordance.
- Sign out.

**Cover everything the demo does — but it's a mock, and it stops short in three places you still have to solve.** It never fails, so there is no error state to copy. Its duplicate-click guard lives in one browser tab, which is not where yours belongs. And its fake timings (~2s steps, an 8s "stuck" threshold) are nothing like real calls at 10–30s+. Don't port its `localStorage` store or its numbers.

---

## 05 · Technical Requirements

> **Keep it simple and lean. Do not over-engineer.**
> Choosing the right-sized solution is part of what we're assessing. AI will hand you more structure than this needs — decide what to keep.

### 5.1 Stack

Any frontend framework, any backend language. Pick what lets you move fast and produce quality work. Boring and familiar beats novel.

### 5.2 Storage

**A database is optional** — a real DB is the common choice and most candidates will go that way. But JSON files on disk genuinely fit this scope, _if done properly_: state isolated per user/project, and safe against concurrent or overlapping writes.

Either way, `DECISIONS.md` must record your reasoning, the upsides, the cons you accepted, and the limits of the choice.

Images and book text live on the local filesystem, served through your own API. No S3, no blob storage, no CDN.

Whatever you pick must still satisfy the resume and no-duplicate-call rules in §4.3.

### 5.3 Gemini API

- Your own key, via environment variable. **Never commit it.** Ship a `.env.example`.
- Real calls to a current Gemini text model and a current Gemini image model (Nano Banana family). Model IDs change — pick current ones, note your choice in `DECISIONS.md`.
- REST or an official SDK, whichever suits your stack — see the API docs above.
- Check the free-tier limits for the **image** model before you start; they are tighter than text. https://ai.google.dev/gemini-api/docs/rate-limits
- No rate-limiting infrastructure required anywhere. The cost rules in §4.3 are what apply.

### 5.4 Testing

Tests on **both sides** are required.

- **Backend** — the logic governing step ordering, progress, and retry.
- **Frontend** — your components and their states (loading, error, empty). Pick a couple that matter; don't test everything.
- **`TESTING.md`** — what you test, what you deliberately don't, and why. A few hundred words.
- **A test report** — the actual output of a real run. Paste it into `TESTING.md` or commit the generated file. AI-written or human-written, both fine — but it must be a **real run**, not an invented summary.

_Nice to have:_ an integration test covering a happy-path run through all 5 steps (mock Gemini — don't burn quota).

Writing tests first is a good way to keep the AI honest (§09) — but we're grading the tests you ended up with, not your code coverage. E2E is not expected.

### 5.5 Local development

- **One command starts the stack. One command runs the tests.** Ship them as scripts — e.g. `./start.sh` and `./test.sh` (or `make up` / `make test`). A reviewer runs one line and it works.
- Use `docker-compose.yml` if your setup needs it. If disk storage means you don't, skip it — say so in `README.md`.

---

## 06 · Deliverables

| File / Artifact      | What we expect                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`          | The one command to start, the one command to test, prerequisites, env vars, and a short architecture overview                                                                                                                  |
| `DECISIONS.md`       | 4–6 decisions written up per §2.1, including ≥3 AI overrides (§2.3). Cover at least: stack and storage choice, how you modeled pipeline progress, how you stopped duplicate execution on refresh. Plus the one-more-day answer |
| `TESTING.md`         | Testing strategy (FE + BE) + a real test report — see §5.4                                                                                                                                                                     |
| AI artifacts         | `CLAUDE.md` / `.cursor/` / `docs/plan.md` / prompts — see §2.2                                                                                                                                                                 |
| Start + test scripts | One command each. `docker-compose.yml` only if your setup needs it — see §5.5                                                                                                                                                  |
| `.env.example`       | Required env vars, no real secrets                                                                                                                                                                                             |
| Git history          | Small, meaningful, incremental commits — see §2.4                                                                                                                                                                              |

---

## 07 · Evaluation Criteria

| Dimension                            | What we look for                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI copilot workflow**              | Real artifacts in-repo. `DECISIONS.md` shows who drove each call — especially where you overrode the AI. Git history shows genuine progress over time.                                                                                                |
| **Followed the actual spec**         | You ran the notebook and implemented _its_ pipeline — context chaining, structured JSON, characters-then-chapters order, the 2/1 caps — not an imagined simplification.                                                                               |
| **Full-stack competence**            | Storage, API, and UI wired together and working. Not one polished layer over three stubs.                                                                                                                                                             |
| **Resume & concurrency correctness** | Genuinely stops and resumes at any step. No data loss, no duplicate Gemini calls, no permanent stuck state.                                                                                                                                           |
| **UI/UX quality**                    | Polished and modern — the standard you see on products you actually use. Consistent spacing and type, real empty/loading/error states, sensible responsive behavior, keyboard-usable, no layout jumps. `app-demo.html` is the floor, not the ceiling. |
| **Testing**                          | Meaningful tests on both frontend and backend, a strategy you can justify, and a real test report.                                                                                                                                                    |
| **Right-sized solution**             | Are you aware of over-engineering? Smallest thing that fully works. Adding a 6th step shouldn't need a rewrite, but no abstractions for features you aren't shipping.                                                                                 |
| **Communication**                    | `DECISIONS.md` reads like an engineer explaining real trade-offs, not a feature list.                                                                                                                                                                 |

---

## 08 · Bonus

Not expected. Absence will not hurt you. Here if you finish early and want to show depth.

**Do not deploy this anywhere public.** Run it locally only — a hosted demo risks exposing your Gemini key, and we won't credit it.

- **Retry / attempt history** visible per step.
- **Sample public-domain books** to pick from, instead of only pasting text.
- **More characters or chapters** — still bounded, and document the changed caps.
- **One later notebook section** — chapter animation (Veo), background music (Lyria), or narration (TTS).
- **A CI pipeline** running your tests on push.
- **Real-time step updates** (SSE / WebSocket) instead of polling.

---

## 09 · Suggested Way of Working

Not a constraint. This is how we work with AI, and how you work is part of what we're assessing — so we name the practices, not the recipe. Look up what you don't know.

1. **Explore first, by yourself.** Run the notebook — §03 requires this. Understand the pipeline by doing it, before AI writes anything.
2. **Spec-driven development.** Your spec is the source of truth. Write it, brainstorm it with AI until the holes are filled, then build against it.
3. **Set up your harness before you build.** Whatever gives you and the AI fast, automatic feedback that something broke.
4. **Monitor and improve that harness as you go.** A harness that got better mid-project says more than a perfect one committed on day one.
5. **Let AI implement; let the harness control quality.** Make it write the test first, then the code — TDD here is a leash on the AI, not a coverage target (§5.4). Tests and your own UAT are what tell you it's right, not reading every diff.
6. **Review per task or at checkpoints — your call.** Either way you run it and see it yourself before it piles up.
7. **You own the final quality pass.** Test the ugly paths yourself. Polish until it's yours.

**Big bonus:** subagents · deliberate context management. If you know why these matter, show it.

---

_GRADION · Scaling Business_
