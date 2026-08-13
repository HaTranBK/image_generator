# Phase 04 — Frontend: UI & State

**Plan:** [`plan.md`](./plan.md)
**Priority:** P1
**Effort:** ~4h
**Status:** Pending
**Depends on:** Phase 03

---

## Overview

Build the Next.js frontend that covers all required screens from the assessment spec: Identity, Project list, New project, and Project detail. Connects to the backend via REST (TanStack Query + Axios, already set up) and WebSocket (socket.io-client) for real-time step progress.

The `app-demo.html` from the assessment is the **floor** — match or exceed it visually and behaviorally.

---

## Key Insights

- **TanStack Query + Axios already scaffolded** — use them for all REST calls.
- **WebSocket per project**: Only connect WS when inside Project Detail page. Disconnect on unmount.
- **Per-item reveal**: When `item:done` event arrives → update only that card (portrait/illustration) immediately.
- **No localStorage state machine** — all state from backend via API/WS. Never port the demo's fake localStorage.
- **Fake timings in demo are wrong** — real Gemini calls are 10–30s+ for images. Don't copy `~2s step` timings.
- **TanStack Query cache invalidation**: After WS `step:done` → invalidate `['project', id]` query so sidebar/header reflect new state.
- **Stuck recovery button**: Show "Force Retry" after 60s of `step:running` state in UI.
- **Error state**: Show error message + "Retry this step" button. No full page error.
- **Session token**: Store JWT in `httpOnly` cookie OR `localStorage` (simpler for assessment scope). Attach via Axios interceptor (already configured).

---

## Required Screens & States

### 1. Identity Page (`/`)
- Input: name, email
- Validation: both required, email format
- On submit: `POST /auth/login` → store token → redirect to `/projects`
- No password, no OAuth

### 2. Project List Page (`/projects`)
- List all user's projects
- Per project: title, created date, status pill (Draft / In Progress / Done)
- Visual progress indicator: 5-step bar showing done/current/pending
- Empty state: friendly message + "Create your first project" CTA
- "New Project" button → `/projects/new`
- Sign out button

### 3. New Project Page (`/projects/new`)
- Title input (required)
- Book text: two tabs — "Upload .txt" and "Paste text"
- Validation: title required, book text required (either upload or paste)
- On submit: `POST /projects` → redirect to `/projects/{id}`

### 4. Project Detail Page (`/projects/:id`)
- Header: title, created date, "Back to projects"
- Book text: collapsible/scrollable full text
- Stepper: 5 steps — Done ✓ / Current (animated) / Pending (grey)
- **Style section**: show style text when available
- **Character cards** (max 2): name, prompt, portrait image (appears when done)
- **Chapter cards** (max 1): name, prompt, illustration image (appears when done)
- **Action button**: context-aware per current step
  - Step 1: "Generate Style" + optional style text input
  - Steps 2–5: "Generate [Step Name]"
  - All done: "Complete 🎉"
- **In-progress state**: show which step is running (name, not just spinner)
- **Error state**: error message + "Retry" button for failed step
- **Stuck detection**: after 60s running → show "Stuck? Force Retry" button
- Sign out accessible

---

## Route Structure (Next.js App Router)

```
frontend/src/app/
├── layout.tsx               # root layout, font, QueryProvider
├── page.tsx                 # Identity page (/)
├── projects/
│   ├── page.tsx             # Project list (/projects)
│   ├── new/
│   │   └── page.tsx         # New project (/projects/new)
│   └── [id]/
│       └── page.tsx         # Project detail (/projects/[id])
```

---

## Component Structure

```
frontend/src/components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Card.tsx
│   ├── Badge.tsx            # Status pill
│   ├── Stepper.tsx          # 5-step progress stepper
│   ├── ProgressBar.tsx      # Mini progress for project list
│   └── Spinner.tsx
├── project/
│   ├── ProjectCard.tsx      # In project list
│   ├── CharacterCard.tsx    # Name + prompt + portrait (with loading skeleton)
│   ├── ChapterCard.tsx      # Name + prompt + illustration (with loading skeleton)
│   └── StepActionButton.tsx # Context-aware action button
└── layout/
    ├── Header.tsx
    └── SignOutButton.tsx
```

---

## State Management Strategy

```typescript
// 1. Server state (REST) → TanStack Query
const { data: project } = useQuery({
  queryKey: ['project', id],
  queryFn: () => api.get(`/projects/${id}`),
  refetchInterval: false,  // WS handles live updates
  staleTime: Infinity,     // don't auto-refetch; WS invalidates
})

// 2. Real-time (WebSocket) → manually update query cache
const queryClient = useQueryClient()

useEffect(() => {
  const socket = io(WS_URL, { query: { token, projectId: id } })

  socket.on('message', (event) => {
    if (event.type === 'state:sync') {
      queryClient.setQueryData(['project', id], event.project)
    }
    if (event.type === 'item:done') {
      queryClient.setQueryData(['project', id], (old) => ({
        ...old,
        // append portrait or illustration to the right array
        portraits: event.step === 3 ? [...old.portraits, { characterId: event.itemId, imageUrl: event.imageUrl }] : old.portraits,
        illustrations: event.step === 5 ? [...old.illustrations, { chapterId: event.itemId, imageUrl: event.imageUrl }] : old.illustrations,
      }))
    }
    if (event.type === 'step:done') {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    }
    if (event.type === 'step:failed') {
      queryClient.setQueryData(['project', id], (old) => ({
        ...old,
        stepState: 'failed',
        errorMessage: event.error,
      }))
    }
  })

  return () => socket.disconnect()
}, [id, token])
```

---

## Stuck Detection (Frontend)

```typescript
// In ProjectDetail page
const [runningStartTime, setRunningStartTime] = useState<number | null>(null)
const [showForceRetry, setShowForceRetry] = useState(false)

useEffect(() => {
  if (project?.stepState === 'running') {
    setRunningStartTime(Date.now())
    const timer = setTimeout(() => setShowForceRetry(true), 60_000)
    return () => clearTimeout(timer)
  } else {
    setRunningStartTime(null)
    setShowForceRetry(false)
  }
}, [project?.stepState])
```

---

## API Hooks

```typescript
// hooks/useProjects.ts
export const useProjects = () => useQuery({ queryKey: ['projects'], queryFn: api.getProjects })
export const useProject = (id: string) => useQuery({ queryKey: ['project', id], queryFn: () => api.getProject(id) })
export const useRunStep = (id: string) => useMutation({ mutationFn: (body) => api.runStep(id, body) })
export const useResetStep = (id: string) => useMutation({ mutationFn: () => api.resetStep(id) })
export const useCreateProject = () => useMutation({ mutationFn: api.createProject, onSuccess: () => router.push(`/projects/${data.id}`) })
```

---

## Implementation Steps

1. **Install socket.io-client**
   ```bash
   cd frontend
   npm install socket.io-client
   ```

2. **Update `apiClient.ts`** — ensure Axios base URL, JWT interceptor, error handling

3. **Create `hooks/useAuth.ts`** — store/read JWT, `signOut()` clears token + redirects

4. **Build Identity page** (`/`)
   - Form with name + email validation
   - On success: store JWT, push to `/projects`
   - Protected: if already logged in → redirect to `/projects`

5. **Build Project List page** (`/projects`)
   - `useProjects()` hook
   - Loading skeleton (3 cards)
   - Empty state component
   - `ProjectCard` with status pill + 5-step progress bar
   - "New Project" button

6. **Build New Project page** (`/projects/new`)
   - Tabbed interface: Upload vs Paste
   - `FileReader` API for client-side .txt reading
   - Form validation before submit
   - `useCreateProject()` mutation

7. **Build Project Detail page** (`/projects/:id`)
   - `useProject(id)` for initial data
   - `useWebSocket(id)` custom hook for WS connection + cache updates
   - `Stepper` component driven by `currentStep`
   - Style section (show when available)
   - `CharacterCard` × N (with portrait loading skeleton → image reveal)
   - `ChapterCard` × N (with illustration loading skeleton → image reveal)
   - `StepActionButton` — context switch on `currentStep`
   - Step 1 UI: optional style text input inline
   - In-progress: animated current step indicator
   - Error: error message + "Retry" button
   - Stuck: "Force Retry" button after 60s timeout

8. **Design system / global CSS**
   - Dark mode preferred (modern, premium)
   - Smooth card transitions for image reveal
   - Status pill colors: Draft=grey, In Progress=blue, Done=green
   - Stepper: checkmark for done, pulse animation for current, grey for pending

---

## Todo List

- [ ] Install `socket.io-client`
- [ ] Update Axios `apiClient.ts` — JWT interceptor, base URL from env
- [ ] Create `hooks/useAuth.ts` — JWT store, signOut
- [ ] Add route protection middleware (redirect to `/` if no token)
- [ ] Build Identity page with form validation
- [ ] Build Project List page with loading/empty states
- [ ] Build `ProjectCard` with status pill + progress bar
- [ ] Build New Project page with tabbed upload/paste input
- [ ] Build Project Detail page shell + `Stepper`
- [ ] Implement `useWebSocket` hook — connect on mount, disconnect on unmount, update TQ cache
- [ ] Implement `CharacterCard` with portrait reveal animation
- [ ] Implement `ChapterCard` with illustration reveal animation
- [ ] Implement `StepActionButton` (context-aware per step)
- [ ] Implement step 1 style text input (optional)
- [ ] Implement in-progress state with step name display
- [ ] Implement error state with retry button
- [ ] Implement stuck detection (60s timer) + "Force Retry" button
- [ ] Add sign-out button to all authenticated pages
- [ ] Polish: animations, typography, spacing, dark mode

---

## Success Criteria

- Identity page validates email format and blocks submit if invalid
- Project list shows empty state when no projects, loading skeleton while fetching
- New project: "Upload" tab accepts only `.txt` files; "Paste" tab accepts freeform text
- Project detail: portrait cards show skeleton → image reveal as each `item:done` arrives
- "Generate Style" button disabled while `stepState === 'running'`
- Step 2 button only enabled after step 1 is DONE (stepper reflects this)
- Error state appears when `stepState === 'failed'` with actual error message
- "Force Retry" button appears after 60s of running state
- Refresh mid-step → WS reconnects → `state:sync` → UI shows correct running state
- Signing out clears token and redirects to `/`

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| WS events arrive after component unmount | Clean up socket in `useEffect` return |
| TanStack Query stale data after WS update | `queryClient.setQueryData` for granular updates; `invalidateQueries` for full refresh |
| 60s stuck timer fires but step finished | Reset timer when `stepState` changes away from 'running' |
| Portrait images flicker on re-render | Use stable image URLs with `key={characterId}` on cards |
| `.txt` upload: browser reads large files slowly | Show loading indicator during `FileReader.readAsText()` |

---

## Security Considerations

- JWT stored in `localStorage` for simplicity (or `httpOnly` cookie for better XSS protection — document tradeoff in `DECISIONS.md`)
- All API calls include `Authorization: Bearer {token}` header (Axios interceptor)
- Never display raw error messages from Gemini API — catch and normalize
- Images served from authenticated backend endpoint (not public folder)

---

## Next Steps

→ **Phase 05**: Testing & Polish
