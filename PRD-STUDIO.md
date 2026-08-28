# LockIn Studio — codebase analysis and build brief

**Companion document to [`PRD.md`](PRD.md).** That PRD still describes the built product accurately. This one covers what exists now, what should change, and the next body of work: turning the thinnest part of the app — the prompt library — into the part worth showing other people.

| | |
|---|---|
| **Repo** | `github.com/thisisirdi/lockin` · Next.js 16.3.2 · React 19.2.8 · TypeScript |
| **Analysed at** | commit `bc1ef82` — "Add grid snapping and full 8-direction resize to OS windows" |
| **Date** | 27 August 2026 |
| **Size** | ~7,070 lines across `app/`, `components/`, `lib/`, `db/` · 9 windows · 19 API routes · 13 tables · 10 commits |
| **Launch gate** | 30 October 2026 |

> **Correction to the previous brief.** An earlier draft of this spec recommended cutting the web-OS shell as too expensive to build before launch. That recommendation was made without seeing the code and is withdrawn: the window manager is already built, and it is the single most valuable asset in the repo. Everything below is written from the code.

---

## 1. The decision, up front

**LockIn stays a personal deep-work OS. Studio becomes the app inside it that outsiders come for.**

Do not rename the product, do not split it, and do not go looking for a name like *Promptly* or *BetterPrompted* — both are heavily occupied and neither is needed now. The prompt workspace ships as **Studio**, a window in LockIn, and the public pitch leads with it.

Three reasons this is the right shape rather than a separate app:

1. **The expensive part is already paid for.** A drag-resize-snap-focus-layout window manager, a dock, layout presets, and persisted geometry are done and working. A standalone prompt tool throws that away and restarts a nine-week clock with five weeks left on it.
2. **The differentiating interaction already exists.** `components/os/Window.tsx` implements drag-a-window-onto-the-AI-to-attach-its-data as context. No prompt tool on the market has a spatial context-attachment gesture. Studio should be a second drop target for that same gesture, which is a small change to code that already works.
3. **Everything else is a commodity.** Focus timers with streaks are a crowded market (clockout.gg, FRDM, Focusmate, Session, Sunsama) where there is no edge. A prompt composer that can pull in your actual notes, tasks and session data is not.

The honest cost of this decision: LockIn reads as two products to a stranger. That is solved cheaply in §7.6 with a Studio-first default layout, not by cutting features.

---

## 2. What is actually built

### 2.1 Inventory

| Area | State | Evidence |
|---|---|---|
| **Window manager** | Complete | `components/os/Window.tsx` (242 L), `lib/store/os.ts` (198 L), `lib/os/snap.ts`. Drag, 8-direction resize, 20px grid snap, edge-snap to other windows and stage margins, z-order focus, minimize, persisted to `localStorage` |
| **Layout presets** | Complete | `lib/os/types.ts` — 4 presets (Everything, Deep work, Writing, Planning), plus user-saved layouts, scaled from a 1240×780 reference stage |
| **Auth** | Complete | Google OAuth, email+password, magic link. `app/login/page.tsx`, `app/auth/callback/route.ts`, `proxy.ts` guards every route |
| **Timer + sessions** | Complete | `lib/store/timer.ts` — elapsed time recomputed from a stored `startedAt`, never ticked from an interval. Survives refresh with no drift |
| **Streak + heatmap** | Complete | `lib/streak.ts`, Clock window |
| **Tasks / Notes / Clipboard / Freedom Goal / Ambient** | Complete | One window each, thin over `lib/hooks/*` over `/api/*` |
| **Companion (AI)** | Complete, over-built | 7 tabs, 6 API routes, three ways to attach context (window drag, text selection, attach picker). System prompts explicitly forbid inventing facts |
| **Prompt library** | **Skeleton** | `components/os/windows/PromptsWindow.tsx` — 96 lines |
| **Prompt refiner** | **One-shot black box** | `lib/anthropic/refine-prompt.ts` — paste rough, get refined, no structure, no iteration |
| **Rooms / multiplayer** | Tables only, no code | `db/migrations/0001_init.sql` |
| **Tests** | **None** | No test files, no runner in `package.json` |

### 2.2 What is genuinely good, and should be built on

- **The timer is correct.** Recomputing from `startedAt` instead of a `setInterval` is the right call and avoids the drift bug that ruins most browser timers. Don't touch it.
- **Row-level security is on every user table**, with `security definer` functions that set `search_path`. The `PATCH /api/prompts/[id]` handler does an unscoped `select` of `usage_count` before updating — that is safe only because RLS blocks it, which is exactly the point of putting the policy in the database. Multi-tenancy is enforced in the right layer.
- **The layering held under a full UI rewrite.** Commit `9d4c3f9` replaced the entire shell — sidebar and routed pages became a window manager — without touching hooks, API routes or schema. That is the proof the data layer is correctly separated, and it is why Studio can be added as another window rather than a rewrite.
- **The AI routes are disciplined.** Context is fetched fresh server-side (`lib/companion/context.ts`), never trusted from the client, and the Review tab reports only numbers computed from the `sessions` table. Keep that standard in Studio.
- **The drag-to-attach gesture is the product's one novel interaction.** `Window.tsx:60–110` hit-tests the dragged window against the Companion and resolves its live data into a context chip. This is the primitive Studio is built on.

### 2.3 What is weak, with specifics

**The prompt subsystem is the least developed part of the app, and it is the part you now want to be the product.**

1. **`PromptsWindow.tsx` is 96 lines and only creates and copies.** `usePrompts()` exposes `updatePrompt` and `deletePrompt` — nothing calls either. There is no edit, no delete, no search, no tag UI (though `prompts.tags` exists in the schema and the API filters on it), and the list is hard-truncated to `prompts.slice(0, 8)`.
2. **`prompt_refinements` is a write-only table.** `/api/refine-prompt` inserts a row on every refinement. No code ever reads it back. You are accumulating the exact history that would make iteration work, and discarding it at the UI.
3. **A prompt has no structure.** `prompts.body` is one `text` column. No blocks, no framework, no variables, no bound context. Every feature you now want needs structure, and structure cannot be retrofitted onto a single text field without a migration.
4. **Refine is the commodity.** Paste rough → receive rewritten. It loses the original, is not iterative, and hardcodes the saved title to `"Refined prompt"` (`RefineTab.tsx:84`). This is the one feature in the app that model vendors are actively giving away for free.
5. **Duplicate client state.** `usePrompts()` is called independently in `PromptsWindow.tsx:10` and `RefineTab.tsx:14`. Each instance keeps its own `useState` array. Saving from Refine does not appear in the Prompts window until it remounts. The README acknowledges the same class of bug for Companion → Tasks. Adding Studio adds a third copy.
6. **Every window fetches on page load whether or not it is visible.** `Desktop.tsx` mounts all nine window components unconditionally; `OSWindow` returns `null` when `!win.visible`, but the data hook in the child has already run its `useEffect`. Five hooks fetch on mount regardless of layout — so "Deep work," which shows two windows, still issues the full set of requests.
7. **No input validation anywhere.** No `zod`, no schema on any route. Request bodies are destructured and trusted (`const { title, body, tags } = await request.json()`). RLS covers ownership; nothing covers shape.
8. **No streaming.** Every AI call is `messages.create`, so the UI blocks until the whole response lands. Studio will make many small AI calls, where perceived latency is the whole experience.
9. **The API key is yours.** `ANTHROPIC_API_KEY` is server-side and account-wide. Correct for a personal tool; a hard blocker for opening the app to anyone else. See §7.5.
10. **No tests.** Zero. Acceptable for what exists — most of it is CRUD over RLS. Not acceptable for a prompt resolver and a framework mapper, where a bug produces a subtly wrong prompt rather than an error.
11. **Dead surface.** `rooms` and `room_members` exist in the migration and the generated types and appear nowhere in the application code. `rooms` carries a `for select using (is_public or ...)` policy — an unused table with a public-read policy is a liability, not an asset.
12. **Small things.** The dock uses the same `Sparkles` icon for both `prompts` and `ai` (`Dock.tsx:26,34`). `public/next.svg`, `file.svg`, `window.svg`, `globe.svg` are scaffolding leftovers. `profiles.pomodoro_settings` and `min_session_minutes_for_streak` exist with no UI.

---

## 3. What your "iterative" idea actually is, and why it's the right one

You described: *write part of the prompt, lock it in, let AI refine it, then move to the next part, always improving what's left.*

That is **progressive, block-scoped refinement**, and it is better than what I proposed previously as the primary loop, because it works before you have run anything. The two loops are complementary and both belong in the product:

**Loop A — compose time (yours).** You build the prompt one block at a time. Write the block, lock it, and the model tightens *that block only*, having been shown every block already locked. Locked blocks become the context for refining the next one. You end with a complete prompt built in passes, where each part was improved in light of what came before it.

**Loop B — run time (from the previous brief).** After you have used the prompt and the output was wrong, you tag the failure, the model patches the one block responsible, and that becomes a new version.

Loop A **fills** the library. Loop B **curates** it. You identified exactly this in your own words, and it is the correct division.

### On autocomplete

You mentioned autocomplete or suggestions. Inline ghost-text completion inside a prompt editor is latency-sensitive, expensive to make feel good, and mostly a novelty in this context — the user is writing 40 words, not 400 lines.

**Recommendation: slot suggestions instead.** When the active block is empty or thin, offer three concrete one-click candidates, generated from the already-locked blocks plus the deliverable type. Same benefit, no keystroke-latency engineering, and it reuses the same endpoint as the lock-in refinement. Build autocomplete later only if suggestions get used constantly.

---

## 4. Studio — the specification

### 4.1 Concepts

| Concept | Definition | Storage |
|---|---|---|
| **Prompt** | The named artifact. Replaces today's `prompts` row as the container. | `prompts` (extended) |
| **Version** | Immutable snapshot of blocks + variables. | `prompt_versions` (new) |
| **Block** | One labelled part of a prompt: `role · context · task · constraints · format · examples · guardrails`. Has a state: `empty · draft · locked`. | `jsonb` on the version |
| **Framework** | A named mapping of block types onto acronym slots (CREATE, CO-STAR, KERNEL, RTF). A **lens**, not a template. | `frameworks` (new, seeded) |
| **Context Block** | Reusable piece of the user's world: company, product, customer, stack, audience, voice, glossary. Written once, attached to many prompts. | `context_blocks` (new) |
| **Variable** | Typed `{{placeholder}}` rendered as a form field before use. | `jsonb` on the version |
| **Run** | One use: resolved prompt, variable values, output, rating, critique tags. | `prompt_runs` (new) |

### 4.2 The lock-in loop (Loop A) — exact behaviour

1. User picks a deliverable type and a framework. Studio renders that framework's slots as empty blocks in order.
2. The **active block** is the first unlocked one. It is the only editable block; locked blocks are visually settled and collapsed to one line.
3. **Suggest** (optional, on the active block) → three candidate contents, generated from the deliverable type and every locked block. One click fills the editor.
4. **Lock** → sends `{blockType, draft, deliverableType, lockedBlocks[]}` to `/api/studio/refine-block`. Returns `{refined, changeNote}` — a tightened version of *that block only* and one line saying what changed.
5. The user sees their draft and the refinement side by side and picks one. Either way the block locks and the next unfilled block becomes active.
6. **Unlock** returns a block to draft. Unlocking a block does not touch later blocks; a "later blocks were written against the old version of this one" hint appears if any block after it is locked.
7. A progress meter shows locked / required slots for the chosen framework.
8. **Save version** writes an immutable `prompt_versions` row.

**Hard rules for the refinement model:** refine only the block it was given; never introduce facts absent from the draft or the locked blocks; never restate the content of other blocks; return the block text and one sentence of change note, nothing else. This is the same anti-invention discipline already used in `app/api/companion/chat/route.ts` — keep it.

### 4.3 The critique loop (Loop B)

- A Run records the resolved prompt, the variable values, the model, the output, and a rating. Output can be **pasted in**, so a run is recorded even when the prompt was copied out to ChatGPT or Claude.
- Critique tags — *Too long · Too generic · Wrong audience · Missed a constraint · Wrong format · Invented facts · Wrong tone* — each map to a target block type via a seeded `critique_mappings` table.
- Selecting a tag proposes a patch to that block alone, shown as a diff. Accepting creates a new version linked to the run that triggered it.
- Version list shows created date, change note, run count, average rating. Any version can be promoted to current.

### 4.4 Frameworks as a lens

Blocks are stored canonically by `block_type`. A framework defines slot order, slot labels, coaching text and which slots are required. Switching framework **re-labels and re-orders; it never rewrites content**. Blocks with no slot in the target framework move to an "Additional" group and stay in the resolved prompt.

This is what makes the framework library a feature rather than a blog post, and it makes adding a framework a seed row rather than code.

Seed four at launch, with attribution on each (they come from practitioners, not standards bodies — cite the source, it is both correct and better for credibility):

| Framework | Slots |
|---|---|
| CREATE | Character, Request, Example, Adjustment, Type of output, Extras |
| CO-STAR | Context, Objective, Style, Tone, Audience, Response |
| KERNEL | Knowledge, Engagement, Relevance, Nuance, Execution, Learning |
| RTF | Role, Task, Format |

### 4.5 Context, via the gesture you already built

`Window.tsx` currently hardcodes the Companion as the only drop target:

```js
const aiEl = document.querySelector('[data-os-window="ai"]');
```

Generalise this to a list of drop targets, and make Studio one of them. Dragging the **Notes** window onto Studio attaches its content as a context block on the current prompt. Dragging **Tasks** or **Timer** does the same. `lib/companion/resolve-window-context.ts` already produces exactly the right shape and needs only a second consumer.

That gesture — drag your actual work onto the prompt you are writing — is the thing no competitor has, and it is a refactor of about thirty lines.

---

## 5. Data model changes — migration `0002_studio.sql`

### 5.1 Extend `prompts`

| Column | Type | Notes |
|---|---|---|
| `deliverable_type` | `text` | discovery · runbook · troubleshooting · onboarding · qbr · enablement · comms · analysis · other |
| `framework_id` | `uuid` | FK → `frameworks`, nullable |
| `current_version_id` | `uuid` | FK → `prompt_versions`, nullable |
| `description` | `text` | |
| `is_starter` | `boolean` | system-owned starter prompts have `user_id` null |
| `forked_from_id` | `uuid` | FK → `prompts`, self-referential lineage |
| `public_slug` | `text` | unique, nullable — set on publish |
| `archived_at` | `timestamptz` | soft delete |

Keep `body` for one release as the resolved text of `current_version_id`, so existing rows and the Copy button keep working. Backfill every existing prompt into a v1 `prompt_versions` row with a single `task` block. Drop `body` in `0003` once nothing reads it.

### 5.2 New tables

**`frameworks`** — `id`, `key` (unique), `name`, `acronym_expansion`, `slot_map jsonb`, `source_url`, `is_active`. Seeded, read-only to users, no RLS restriction on select.

**`prompt_versions`** — `id`, `prompt_id`, `version_no` (unique per prompt), `blocks jsonb`, `variables jsonb`, `change_note`, `created_from_run_id` (nullable), `created_at`. Immutable.

`blocks` shape: `[{ id, block_type, framework_slot, body, state, order }]` where `state ∈ empty|draft|locked`.
`variables` shape: `[{ key, label, type, required, options, default }]`.

Blocks are `jsonb` rather than a table because they are always read and written as a whole version and never queried individually. Context blocks *are* normalised, because they are shared across prompts and edited independently.

**`context_blocks`** — `id`, `user_id`, `kind` (company · product · customer · stack · audience · voice · glossary · snippet), `name`, `body`, `token_estimate`, `archived_at`, timestamps.

**`prompt_version_contexts`** — join: `prompt_version_id`, `context_block_id`, `position`. PK on both ids. RLS via ownership of the parent version, following the `project_categories` pattern already in `0001`.

**`prompt_runs`** — `id`, `user_id`, `prompt_version_id`, `provider`, `model`, `variable_values jsonb`, `resolved_prompt`, `output` (nullable until pasted), `rating`, `critique_tags text[]`, `latency_ms`, `created_at`.

**`critique_mappings`** — seeded reference: `tag` (unique), `label`, `target_block_type`, `patch_instruction`, `static_hint`. Referenced by tag string from `prompt_runs.critique_tags` with no foreign key, so removing a mapping never orphans history.

**`prompt_block_refinements`** — `id`, `user_id`, `prompt_id` (nullable), `block_type`, `before`, `after`, `accepted boolean`, `created_at`. This is what `prompt_refinements` should have been. Rename the old table to `prompt_refinements_legacy`, stop writing to it, drop it in `0003`.

### 5.3 Removals

```sql
drop table if exists public.room_members;
drop table if exists public.rooms;
```

Also remove them from `lib/types/database.ts`. `projects` and `project_categories` stay — `app/api/freedom-goal/route.ts` uses both.

### 5.4 Indexes

`prompt_versions (prompt_id, version_no desc)` · `prompt_runs (prompt_version_id, created_at desc)` · `prompt_runs (user_id, created_at desc)` · `context_blocks (user_id, kind)` · `prompts (user_id, archived_at)` · `prompts (public_slug) where public_slug is not null` · GIN on `to_tsvector('english', title || ' ' || coalesce(description,''))` for library search.

**Every new user-owned table gets an RLS policy in the same migration that creates it.** Follow `0001` exactly.

---

## 6. API surface

### 6.1 New

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/studio/suggest-block` | Active block + locked blocks + deliverable type → 3 candidate contents |
| POST | `/api/studio/refine-block` | Draft block + locked blocks → `{refined, changeNote}`; logs to `prompt_block_refinements` |
| POST | `/api/studio/resolve` | Blocks + variables + context → resolved prompt + token estimate |
| POST | `/api/prompts/:id/versions` | Save immutable version |
| POST | `/api/prompts/:id/promote` | Set `current_version_id` |
| GET | `/api/prompts/:id/versions/:a/diff/:b` | Block-level diff |
| POST | `/api/prompts/:id/fork` | Fork starter or public prompt |
| POST | `/api/prompts/:id/publish` | Mint `public_slug` |
| GET/POST/PATCH/DELETE | `/api/context-blocks` | Context CRUD |
| POST | `/api/notes/:id/promote` | Note → Context Block |
| POST | `/api/runs` · PATCH `/api/runs/:id` | Record a run; attach output, rating, critique tags |
| POST | `/api/runs/:id/patch-suggestion` | Critique tag → single-block patch proposal |
| GET | `/r/:public_slug` | Public read-only prompt page, SSR, indexable — the growth surface |

### 6.2 Consolidated

Fold `/api/companion/{plan,breakdown,unstick-smallest}` into a single `/api/companion/action` taking an `action` parameter, and turn those three Companion tabs into quick-action chips inside the Chat tab that pre-fill the composer. **This preserves every capability** and removes three routes, three tab components (~330 lines) and three system prompts to maintain. Keep `/api/companion/review` separate — it computes real statistics server-side and is not a chat.

Companion goes from seven tabs to three: **Chat** (with quick actions and attachments), **Review**, and **Studio** — where the Refine tab used to be, now opening the Studio window rather than doing a one-shot rewrite.

### 6.3 The resolver is shared code

`lib/studio/resolve.ts` — blocks + variables + context → resolved prompt + token estimate. Imported by both the client preview and every server route. **One implementation.** If the preview and the sent prompt can diverge, users stop trusting the preview, and the preview is most of the product.

---

## 7. Decisions that need making now

### 7.1 Client data layer — adopt TanStack Query

The hand-rolled `lib/hooks/*` pattern already produces stale windows and duplicate state, and Studio triples the number of surfaces reading the same prompts. Add `@tanstack/react-query`, convert the six hooks, and invalidate on mutation. Half a day, and it removes a whole class of bug before the composer multiplies it.

Do this **before** building Studio, not after.

### 7.2 Validation — add zod to every route

A shared `zod` schema per route, and one shared schema for the `blocks` jsonb shape used by both client and server. Reject bad shapes at the boundary instead of writing malformed jsonb that breaks the resolver later.

### 7.3 Tests — add vitest, cover three functions

Not broad coverage. Three pure functions where a bug is silent rather than loud:

- `lib/studio/resolve.ts` — resolution, variable substitution, disabled blocks, context ordering
- `lib/studio/frameworks.ts` — switching frameworks preserves content and keeps unmapped blocks
- `lib/os/snap.ts` — already exists, currently untested, and it is pure

### 7.4 Streaming

Convert `/api/companion/chat` and `/api/studio/refine-block` to `messages.stream` with a `ReadableStream` response. Block refinement is short, so the win is entirely perceptual — but the composer's whole feel depends on the lock action feeling instant.

### 7.5 Whose API key — the decision that gates a public launch

Today `ANTHROPIC_API_KEY` is server-side and account-wide, so every AI action any user takes is billed to you. That is correct for a personal tool and a hard blocker for opening the app up.

**Recommendation: bring-your-own-key, implemented as a one-line change to the client factory.**

```ts
export function getAnthropicClient(userKey?: string) {
  if (userKey) return new Anthropic({ apiKey: userKey });
  // ...existing cached env-key client
}
```

Every AI route already runs server-side, so there is no CORS problem and no new proxy is needed. The user's key is held client-side (IndexedDB, encrypted with a passphrase-derived key), sent per request, used, and never written to the database or a log. Your own account keeps working off the env key via an allowlist.

This costs about an hour, removes billing, abuse handling and rate limiting from the launch entirely, and is why 30 October remains achievable.

Pair it with a **copy-out path that is complete and pleasant** — resolve, copy to clipboard, deep links to ChatGPT / Claude / Gemini, and paste the output back to record a run. Most new users will start there, and some will stay there. The clipboard history table you already have makes this path better than a competitor's.

### 7.6 The two-headed product problem

A stranger arriving at LockIn sees a focus timer, a zen wallpaper picker, a revenue goal, and a prompt composer, and cannot tell what the product is.

**Fix it with a layout, not with cuts.** Add a fifth preset to `lib/os/types.ts`:

```
studio: { name: "Studio", wins: { studio: [...], prompts: [...], notes: [...],
          timer: "min", clock: null, freedom: null, ambient: null, ai: [...] } }
```

Make it the default for accounts with no sessions logged. A new user lands in a workspace built around prompts, with the timer one dock click away; you land in "Everything" as you do today. One object literal, and the positioning problem is solved.

Keep the timer, streak, freedom goal and ambient room. They are built, they cost nothing to keep, and they are why *you* open the app daily. Just never lead with them — the deep-work-timer market is crowded and you have no edge in it. Lead with Studio, where you do.

---

## 8. Removal checklist

| Remove | Why |
|---|---|
| `rooms`, `room_members` tables + their types | No code references them; `rooms` carries a public-read policy on an unused table |
| Multiplayer / presence / public rooms from the roadmap | Real-time infrastructure for a product with no second user yet |
| `public/next.svg`, `file.svg`, `window.svg`, `globe.svg` | Scaffolding leftovers |
| `/api/companion/plan`, `/breakdown`, `/unstick-smallest` | Fold into `/api/companion/action`; capability preserved |
| `PlanTab`, `BreakdownTab`, `UnstickTab` | Become quick-action chips in Chat |
| `RefineTab`'s one-shot rewrite | Superseded by Studio; the tab becomes an entry point |
| `prompt_refinements` | Write-only. Rename to `_legacy`, replace with `prompt_block_refinements`, drop in `0003` |
| `prompts.slice(0, 8)` in `PromptsWindow` | Replaced by a real library with search and paging |
| Duplicate `usePrompts()` state | Replaced by TanStack Query |
| Duplicate `Sparkles` dock icon | `prompts` and `ai` need distinct icons |

**Do not remove:** the window manager, layout presets, timer, streak, freedom goal, ambient room, clipboard history, `projects` / `project_categories`, or the drag-to-attach gesture.

---

## 9. Build order for Claude Code

Each phase ends in a state where the app runs and the previous phase's work is verifiable. Do not start a phase before the one above it is green.

### Phase 0 — Foundation (week 1)

1. Add `@tanstack/react-query`, `zod`, `vitest`, `@testing-library/react`. Wrap the app in a `QueryClientProvider`.
2. Convert `lib/hooks/*` to `useQuery` / `useMutation` with invalidation. **Verify:** saving a prompt in one window updates it in another without a remount.
3. Add zod validation to every existing `/api` route.
4. Move each window's data hook behind its visibility so hidden windows do not fetch. **Verify:** loading "Deep work" issues no `/api/notes` or `/api/prompts` request.
5. Write `migration 0002`: extend `prompts`, create `frameworks`, `prompt_versions`, `context_blocks`, `prompt_version_contexts`, `prompt_runs`, `critique_mappings`, `prompt_block_refinements`; drop `rooms` and `room_members`; seed 4 frameworks and the critique mappings; backfill existing prompts into v1 versions. **RLS policy for every new user-owned table, in the same migration.**
6. **Verify with two accounts that cross-user reads on every new table return zero rows. Do not proceed until this passes.**
7. `getAnthropicClient(userKey?)` + client-side key vault + settings UI.
8. Delete the dead SVGs; give `prompts` its own dock icon.

### Phase 1 — The composer (weeks 2–4)

9. `lib/studio/resolve.ts` and `lib/studio/frameworks.ts` **first, with unit tests, before any UI.** Both are imported by client and server.
10. `StudioWindow` + `studio` window id, meta, dock entry, and the `studio` layout preset.
11. Block list UI: active block editor, locked blocks collapsed, lock / unlock, progress meter, live resolved preview with token estimate.
12. `/api/studio/refine-block` (streaming) and the accept-or-keep-mine comparison.
13. `/api/studio/suggest-block` and the three-candidate chips.
14. Framework switcher. **Verify:** switching CREATE → KERNEL → CO-STAR and back leaves every block's text byte-identical.
15. Save version; version list.
16. Generalise `Window.tsx` drop targets so Studio accepts dragged windows as context.

### Phase 2 — Library and context (weeks 5–6)

17. Rebuild `PromptsWindow` as a real library: search, tag filter, edit, archive, open in Studio, sort by usage.
18. Context Blocks: CRUD, a context rail in Studio, drag-to-attach, token budget warning at 8,000 tokens.
19. Note → Context Block promotion.
20. Variables: `{{var}}` detection, typed pre-run form, last-used defaults.
21. Copy-out path: clipboard, deep links, paste-back to record a run.

### Phase 3 — Iteration and curation (week 7)

22. Runs: record, rate, list per prompt.
23. Critique tags → single-block patch proposal → diff → accept creates a version.
24. Version diff and promote.
25. Consolidate the Companion to three tabs.

### Phase 4 — Launch (weeks 8–9)

26. Twenty starter prompts for technical customer-facing work — discovery summaries, integration runbooks, troubleshooting guides, onboarding plans, QBR narratives, API scoping docs. Version-controlled as `/seed/prompts/*.json`.
27. Public prompt pages at `/r/:slug`, forkable.
28. First-run onboarding: role → deliverable → three blocks locked → first resolved prompt, ending with the user's first Context Block created from what they typed.
29. Data export, account deletion, empty states, error handling, accessibility pass.
30. Landing page, launch post, build case study.

---

## 10. Definition of done

**Launch gate — 30 October 2026**

- [ ] Public URL, sign-up works, a stranger can complete the loop end to end
- [ ] Compose loop: pick deliverable → lock blocks one at a time with refinement → save version
- [ ] Critique loop: run → rate → tag → patch one block → new version → promote
- [ ] Context Blocks attach and resolve into the prompt
- [ ] Copy-out works with no API key at all
- [ ] BYO key works, and no code path writes a key to the database or a log
- [ ] Two-account RLS check passes on every new table
- [ ] Framework switching is provably content-preserving (unit test, not a click-through)
- [ ] 20 starter prompts live
- [ ] Studio layout is the default for a new account

**Thirty days after launch**

| Metric | Target | Why it matters |
|---|---|---|
| Registered users | 50 | Distribution works at all |
| Completed a compose loop | 40% | The core interaction is understood |
| Users with ≥1 Context Block | 20 | The habit that creates switching cost |
| Week-2 return | 10 | The only real signal of value |
| Prompts with ≥2 versions | 15 | Iteration is being used, not just storage |
| Published case study | 1 | Portfolio and job-search value |

**Kill criterion.** If fewer than 10 users return in week 2 and fewer than 15 create a Context Block, the switching-cost thesis is wrong. Do not add features. Interview the users who did return, and either re-aim or stop.

---

## 11. Risks and open questions

| # | Item | Assessment |
|---|---|---|
| R1 | **Scope.** Phases 0–4 in nine weeks, solo, alongside a job search | Real. Phase 0 and Phase 1 alone are a shippable product — Studio plus the existing app. If week 6 arrives and Phase 2 is unfinished, cut Phases 3 and 4 to the starter prompts only and launch. Do not extend the date. |
| R2 | **Commoditisation.** Vendors give away one-shot prompt rewriting | Mitigated by design: the value is the accumulated context and version history, not the rewrite. Never market the refinement itself. |
| R3 | **Two-headed product** | Mitigated by §7.6 at near-zero cost. Revisit only if new users say they are confused. |
| R4 | **Cost** | Removed by BYO key. Do not reintroduce a server-paid free tier without a usage cap and a table to enforce it. |
| OQ-1 | Does the `body` → blocks backfill need to preserve anything beyond a single `task` block? | Assumed no. Existing prompts are unstructured text. |
| OQ-2 | Privacy: `prompt_runs.output` stores model outputs | State it plainly at sign-up and add a per-prompt "don't store outputs" toggle. No compliance regime is assumed. |
| OQ-3 | Public prompt pages are indexable by design | Confirm that is wanted before shipping `/r/:slug`; it is the growth loop but it is also public writing under your name. |
| OQ-4 | Type-check status | `npx tsc --noEmit` was started against the repo over a network mount and had not finished at the time of writing. Run it locally and treat a clean result as the Phase 0 baseline. |

---

## 12. The immediate next action

Not code. **Write three starter prompts from deliverables you have actually produced at CData** — an integration discovery summary, a CDC troubleshooting runbook, a customer onboarding plan — using the block structure in §4.1: role, context, task, constraints, format.

If those three are good, the block model is right and the seed content is real. If you cannot write three good ones in an evening, the deliverable framing is wrong and it is far cheaper to find that out now than in week six.
