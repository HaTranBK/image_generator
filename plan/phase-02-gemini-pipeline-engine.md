# Phase 02 — Gemini Service & Pipeline Engine

**Plan:** [`plan.md`](./plan.md)
**Priority:** P1 — Critical
**Effort:** ~4h
**Status:** Pending
**Depends on:** Phase 01

---

## Overview

Implement the `GeminiService` that wraps the JS SDK and executes each pipeline step, plus the `PipelineEngine` that enforces step ordering, duplicate call prevention, stuck detection, and per-step state transitions.

This phase is the **business core** of the app.

---

## Key Insights

- Use `@google/genai` JS SDK — Interactions API is confirmed available
- **Two separate context chains**: text chain (steps 1, 2, 4) and image chain (steps 3, 5)
- **Text chain IDs** must be persisted to DB after each step
- **Image chain IDs** do NOT need to be persisted (fresh chain per run)
- **`ensureFileUri()`**: check if `bookFileUri` is still valid before any step; re-upload if expired (48h TTL)
- **Portraits → Illustrations**: upload portrait base64 to Gemini File API → use returned URI as multimodal input for step 5
- **Server-side caps**: `.slice(0, 2)` for characters, `.slice(0, 1)` for chapters — before persisting
- **In-memory lock** (`Map<projectId, Promise>`) + DB `stepState` check = dual duplicate guard
- **No auto-retry** — catch errors, mark step `failed`, expose to user

---

## Architecture

```
PipelineService (orchestrator)
│
├── validateCanRun(project, step) → enforces ordering + duplicate guard
├── runStep(projectId, step)
│   ├── acquire lock
│   ├── mark stepState=running, set stuckAt=now
│   ├── call GeminiService.run{Step}(...)
│   ├── save results to DB
│   ├── mark stepState=idle, currentStep++
│   └── release lock (finally)
│
└── GeminiService (pure Gemini API wrapper)
    ├── uploadBook(text)
    ├── ensureFileUri(project)
    ├── createBookInteraction(fileUri)
    ├── runStyle(bookInteractionId, style?)
    ├── runCharacters(styleInteractionId)
    ├── runPortraits(characters, style) → emits per-portrait events
    ├── runChapters(charactersInteractionId)
    └── runIllustrations(chapters, portraitFileUris, style) → emits per-illustration events
```

---

## Files to Create / Modify

```
backend/src/
├── gemini/
│   ├── gemini.module.ts
│   ├── gemini.service.ts       # Pure Gemini SDK wrapper
│   └── gemini.types.ts         # Prompt, Character, Chapter interfaces
├── pipeline/
│   ├── pipeline.module.ts
│   ├── pipeline.service.ts     # Orchestrator (lock, state transitions)
│   └── pipeline.events.ts      # Event emitter types for WS
```

---

## Implementation Steps

### Step 1 — Install SDK

```bash
cd backend
npm install @google/genai
```

### Step 2 — Create `gemini.service.ts`

```typescript
@Injectable()
export class GeminiService {
  private ai: GoogleGenAI

  constructor(private configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.get('GEMINI_API_KEY'),
    })
  }

  // ── Book Management ──────────────────────────────────────────────

  async uploadBook(text: string): Promise<{ fileUri: string }> {
    const buffer = Buffer.from(text, 'utf-8')
    const blob = new Blob([buffer], { type: 'text/plain' })
    const file = await this.ai.files.upload({
      file: blob,
      config: { mimeType: 'text/plain', displayName: 'book.txt' },
    })
    return { fileUri: file.uri }
  }

  async ensureFileUri(project: Project): Promise<string> {
    // Try to get existing file — if 404/expired, re-upload
    try {
      const name = project.bookFileUri.split('/').pop()
      await this.ai.files.get({ name })
      return project.bookFileUri
    } catch {
      const { fileUri } = await this.uploadBook(project.bookText)
      return fileUri // caller must update DB
    }
  }

  // ── Text Pipeline ────────────────────────────────────────────────

  async createBookInteraction(fileUri: string): Promise<{ interactionId: string }> {
    const interaction = await this.ai.interactions.create({
      model: GEMINI_TEXT_MODEL,
      input: [
        { type: 'text', text: "Here's a book to illustrate. Don't say anything yet." },
        { type: 'document', uri: fileUri },
      ],
    })
    return { interactionId: interaction.id }
  }

  async runStyle(bookInteractionId: string, style?: string): Promise<{ style: string; interactionId: string }> {
    const prompt = style
      ? `The art style will be: "${style}". Acknowledge briefly.`
      : 'Define an art style that fits this story. Return only the style description.'

    const interaction = await this.ai.interactions.create({
      model: GEMINI_TEXT_MODEL,
      input: prompt,
      previousInteractionId: bookInteractionId,
    })
    return { style: style || interaction.outputText, interactionId: interaction.id }
  }

  async runCharacters(styleInteractionId: string): Promise<{ characters: Character[]; interactionId: string }> {
    const interaction = await this.ai.interactions.create({
      model: GEMINI_TEXT_MODEL,
      input: 'List the main ADULT characters with a detailed image prompt for each. JSON array of {name, prompt}.',
      previousInteractionId: styleInteractionId,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: CHARACTER_SCHEMA,
      },
    })
    const raw = JSON.parse(interaction.outputText) as Character[]
    return {
      characters: raw.slice(0, MAX_CHARACTERS), // SERVER-SIDE CAP
      interactionId: interaction.id,
    }
  }

  async runChapters(charactersInteractionId: string): Promise<{ chapters: Chapter[]; interactionId: string }> {
    const interaction = await this.ai.interactions.create({
      model: GEMINI_TEXT_MODEL,
      input: 'For each chapter, give a detailed scene illustration prompt referencing characters by name. JSON array of {name, prompt}.',
      previousInteractionId: charactersInteractionId,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: CHAPTER_SCHEMA,
      },
    })
    const raw = JSON.parse(interaction.outputText) as Chapter[]
    return {
      chapters: raw.slice(0, MAX_CHAPTERS), // SERVER-SIDE CAP
      interactionId: interaction.id,
    }
  }

  // ── Image Pipeline ───────────────────────────────────────────────

  async runPortraits(
    characters: Character[],
    style: string,
    onPortraitDone: (characterId: string, imageBuffer: Buffer, geminiFileUri: string) => Promise<void>,
  ): Promise<Portrait[]> {
    const portraits: Portrait[] = []

    // Fresh image interaction chain
    let prevId: string | undefined

    for (const character of characters) {
      const interaction = await this.ai.interactions.create({
        model: GEMINI_IMAGE_MODEL,
        input: `Portrait of ${character.name}: ${character.prompt}. Style: ${style}. No text, no borders.`,
        previousInteractionId: prevId,
        generationConfig: { responseModalities: ['IMAGE'] },
      })

      const imageData = extractImage(interaction) // parse base64 from response
      const buffer = Buffer.from(imageData.data, 'base64')

      // Upload to File API for step 5 reference
      const blob = new Blob([buffer], { type: 'image/png' })
      const uploadedFile = await this.ai.files.upload({ file: blob, config: { mimeType: 'image/png' } })

      const portrait: Portrait = {
        characterId: character.id,
        localPath: '',  // filled by callback
        geminiFileUri: uploadedFile.uri,
      }

      await onPortraitDone(character.id, buffer, uploadedFile.uri)
      portraits.push(portrait)
      prevId = interaction.id
    }

    return portraits
  }

  async runIllustrations(
    chapters: Chapter[],
    characters: Character[],
    portraitFileUris: string[],
    style: string,
    onIllustrationDone: (chapterId: string, imageBuffer: Buffer) => Promise<void>,
  ): Promise<void> {
    let prevId: string | undefined

    for (const chapter of chapters) {
      // Build multimodal input with portrait references
      const portraitInputs = portraitFileUris.map(uri => ({ type: 'image', uri }))

      const interaction = await this.ai.interactions.create({
        model: GEMINI_IMAGE_MODEL,
        input: [
          ...portraitInputs,
          { type: 'text', text: `Scene: ${chapter.prompt}. Style: ${style}. No text, no borders.` },
        ],
        previousInteractionId: prevId,
        generationConfig: { responseModalities: ['IMAGE'] },
      })

      const imageData = extractImage(interaction)
      const buffer = Buffer.from(imageData.data, 'base64')
      await onIllustrationDone(chapter.id, buffer)
      prevId = interaction.id
    }
  }
}
```

### Step 3 — Create `pipeline.service.ts`

```typescript
@Injectable()
export class PipelineService {
  // In-memory lock: projectId → running Promise
  private runningJobs = new Map<string, Promise<void>>()

  constructor(
    private projectsService: ProjectsService,
    private geminiService: GeminiService,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,  // or WsGateway injected
  ) {}

  async triggerStep(projectId: string, userId: string, stepInput?: { style?: string }): Promise<void> {
    // Guard 1: in-memory lock
    if (this.runningJobs.has(projectId)) return

    const project = await this.projectsService.findById(projectId, userId)

    // Guard 2: DB state check (handles server restart race)
    if (project.stepState === 'running') return

    // Guard 3: step ordering
    this.validateCanRun(project)

    const job = this.executeStep(project, stepInput)
    this.runningJobs.set(projectId, job)
    try {
      await job
    } finally {
      this.runningJobs.delete(projectId)
    }
  }

  private validateCanRun(project: Project): void {
    if (project.stepState === 'running') {
      throw new ConflictException('Step already running')
    }
    if (project.currentStep === 5) {
      throw new BadRequestException('Pipeline already complete')
    }
    // Previous step must be done (currentStep indicates next step to run)
    // currentStep 0 means style hasn't run; currentStep 1 means characters hasn't run, etc.
  }

  private async executeStep(project: Project, input?: { style?: string }): Promise<void> {
    const step = project.currentStep + 1 // next step to execute (1–5)

    // Mark running
    await this.projectsService.setStepRunning(project.id)
    this.emit(project.id, 'step:start', { step })

    try {
      switch (step) {
        case 1: await this.runStyle(project, input?.style); break
        case 2: await this.runCharacters(project); break
        case 3: await this.runPortraits(project); break
        case 4: await this.runChapters(project); break
        case 5: await this.runIllustrations(project); break
      }

      await this.projectsService.advanceStep(project.id)
      this.emit(project.id, 'step:done', { step })
    } catch (err) {
      await this.projectsService.setStepFailed(project.id, err.message)
      this.emit(project.id, 'step:failed', { step, error: err.message })
    }
  }

  // ── Per-step runners ─────────────────────────────────────────────

  private async runStyle(project: Project, style?: string): Promise<void> {
    const fileUri = await this.geminiService.ensureFileUri(project)

    let bookInteractionId = project.bookInteractionId
    if (!bookInteractionId) {
      const result = await this.geminiService.createBookInteraction(fileUri)
      bookInteractionId = result.interactionId
    }

    const { style: generatedStyle, interactionId } = await this.geminiService.runStyle(bookInteractionId, style)

    await this.projectsService.saveStyleResult(project.id, {
      style: generatedStyle,
      bookFileUri: fileUri,
      bookInteractionId,
      styleInteractionId: interactionId,
    })
  }

  private async runCharacters(project: Project): Promise<void> {
    const { characters, interactionId } = await this.geminiService.runCharacters(project.styleInteractionId!)
    await this.projectsService.saveCharactersResult(project.id, { characters, charactersInteractionId: interactionId })
  }

  private async runPortraits(project: Project): Promise<void> {
    await this.geminiService.runPortraits(
      project.characters,
      project.style!,
      async (characterId, buffer, geminiFileUri) => {
        const localPath = await this.storageService.saveImage(project.id, 'portraits', characterId, buffer)
        await this.projectsService.savePortrait(project.id, { characterId, localPath, geminiFileUri })
        this.emit(project.id, 'item:done', { step: 3, itemId: characterId, imageUrl: `/api/images/${project.id}/portraits/${characterId}.png` })
      },
    )
  }

  private async runChapters(project: Project): Promise<void> {
    const { chapters, interactionId } = await this.geminiService.runChapters(project.charactersInteractionId!)
    await this.projectsService.saveChaptersResult(project.id, { chapters, chaptersInteractionId: interactionId })
  }

  private async runIllustrations(project: Project): Promise<void> {
    const portraitFileUris = project.portraits.map(p => p.geminiFileUri)
    await this.geminiService.runIllustrations(
      project.chapters,
      project.characters,
      portraitFileUris,
      project.style!,
      async (chapterId, buffer) => {
        const localPath = await this.storageService.saveImage(project.id, 'illustrations', chapterId, buffer)
        await this.projectsService.saveIllustration(project.id, { chapterId, localPath })
        this.emit(project.id, 'item:done', { step: 5, itemId: chapterId, imageUrl: `/api/images/${project.id}/illustrations/${chapterId}.png` })
      },
    )
  }

  private emit(projectId: string, event: string, data: any): void {
    this.eventEmitter.emit(`ws.${projectId}`, { type: event, ...data })
  }
}
```

### Step 4 — Add ProjectsService Methods for State Transitions

```typescript
// In ProjectsService:
setStepRunning(id: string)       → stepState='running', stuckAt=now
advanceStep(id: string)          → currentStep++, stepState='idle', stuckAt=null, errorMessage=null
setStepFailed(id: string, msg)   → stepState='failed', errorMessage=msg, stuckAt=null
saveStyleResult(id, data)        → update style, bookFileUri, bookInteractionId, styleInteractionId
saveCharactersResult(id, data)   → update characters, charactersInteractionId
savePortrait(id, portrait)       → append to portraits array
saveChaptersResult(id, data)     → update chapters, chaptersInteractionId
saveIllustration(id, data)       → append to illustrations array
```

### Step 5 — Constants and Model IDs

```typescript
// common/constants.ts
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'     // or gemini-3.6-flash
export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-lite-image'  // Nano Banana
export const MAX_CHARACTERS = 2
export const MAX_CHAPTERS = 1
export const STUCK_THRESHOLD_MS = 5 * 60 * 1000  // 5 minutes
```

> Document model IDs in `DECISIONS.md` — they change, note the version chosen.

---

## Todo List

- [ ] Install `@google/genai` SDK
- [ ] Create `gemini/` module with `GeminiService`
- [ ] Implement `uploadBook()` and `ensureFileUri()`
- [ ] Implement `createBookInteraction()` and `runStyle()`
- [ ] Implement `runCharacters()` with JSON schema + server-side cap
- [ ] Implement `runChapters()` with JSON schema + server-side cap
- [ ] Implement `runPortraits()` with sequential loop + File API upload + callback
- [ ] Implement `runIllustrations()` with portrait URIs as multimodal input + callback
- [ ] Create `pipeline/` module with `PipelineService`
- [ ] Implement in-memory lock (`runningJobs` Map)
- [ ] Implement `validateCanRun()` — step ordering enforcement
- [ ] Implement `executeStep()` with try/catch → setStepFailed on error
- [ ] Add all `ProjectsService` state-transition methods
- [ ] Add `GEMINI_API_KEY` validation on startup (crash-fast if missing)
- [ ] Write `.env.example` with `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`

---

## Success Criteria

- Calling `PipelineService.triggerStep(id)` twice simultaneously executes Gemini only once
- Step 2 (Characters) cannot run if step 1 (Style) hasn't completed — throws `ConflictException`
- Characters result always ≤ 2 entries (server-side `.slice(0, 2)`)
- Chapters result always ≤ 1 entry
- `ensureFileUri()` re-uploads book if URI expired, returns new URI
- Each portrait emits `item:done` event individually before next portrait starts
- Failed step leaves `stepState='failed'`, does not corrupt `characters`/`style` already saved

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Interactions API shape differs between Python/JS SDK | Verify with JS SDK docs; have REST fallback ready |
| Image model returns no image (rate limit) | Catch and rethrow with clear error message to user |
| Portrait upload to File API fails | Wrap in try/catch; mark step failed; portrait `geminiFileUri` stays null |
| `extractImage()` helper breaks on response shape change | Add defensive check; log raw response in dev |
| File URI expired mid-pipeline (step 3 using step 1's URI) | `ensureFileUri()` called at start of EVERY step |

---

## Security Considerations

- `GEMINI_API_KEY` only in environment variable, never committed
- Ship `.env.example` with placeholder value
- Log Gemini errors server-side but return generic messages to client

---

## Next Steps

→ **Phase 03**: REST API & WebSocket Layer (exposes PipelineService to HTTP + WS)
