# PRD: LockIn (working name) — Personal Deep Work OS

> **Note:** This is the original spec. The UI it describes (sidebar + routed pages) has
> since been replaced by a desktop-style window-manager redesign — see
> [`README.md`](README.md#the-os-redesign) for the current architecture. The underlying
> features, data model, and API routes below are still accurate; only the shell changed.

## Overview

LockIn is a personal productivity app built around a single mechanic: **start a timer, tag what you're doing, and watch the evidence pile up**. It reverse-engineers the core loop of clockout.gg/FRDM (focus timer + ambient co-working rooms + streaks + a "financial freedom" framing for the work) and extends it with tools Irdi actually needs day to day: a notes/clipboard system built for fast copy-paste, a prompt library, and an AI-assisted prompt refiner. Multiplayer rooms, easter eggs, and mini-games are real but explicitly secondary — they ship after the solo loop is solid enough to use daily.

This PRD treats the reference app's screenshots as reverse-engineered source material (marked **[REF]** below) and Irdi's own additions as new scope (marked **[NEW]**).

## Goals & Non-Goals

**Goals**
1. Give Irdi a daily-use tool that replaces ad hoc timers, sticky notes, and copy-paste chaos with one app.
2. Make focused work visible over time (streaks, heatmap) so consistency — his stated weak point — has a scoreboard.
3. Tie work sessions to the $10K/month freedom goal, not just abstract "productivity," so the timer means something.
4. Ship a usable v1 solo, in weeks not months, on a stack Irdi can build and operate alone.
5. Leave a clean path to make it public/multi-user later without a rewrite.

**Non-Goals (v1)**
- Not a team project management tool (no Gantt charts, no assignees beyond "me").
- Not a full clipboard manager that hooks the OS clipboard globally — v1 is in-app/in-browser only (see Open Questions).
- Not a social network. Rooms in v1 are solo "ambient" spaces; multiplayer presence is v2+.
- Not trying to monetize as a SaaS from day one. Public/multi-tenant is a later phase, not an MVP requirement.

## Target Users

- **Primary**: Irdi, solo. Technical Customer Success / Solutions / Data Engineering background, works across job hunting, freelance client work, and building his own products/content.
- **Secondary (v2+)**: A small group of people doing the same kind of self-directed, remote knowledge work (freelancers, indie builders, remote job seekers) who'd use it as a lightweight Focusmate/clockout.gg alternative with better tooling for people who live in prompts, notes, and code.

## Tech Stack (with rationale)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 14+ (App Router), TypeScript | Matches the reference app's likely stack, has the best ecosystem for the shadcn/ui dark aesthetic in the screenshots, deploys trivially to Vercel. |
| UI | Tailwind CSS + shadcn/ui + Framer Motion | shadcn/ui gives you the exact "dark, minimal, rounded-card" look in the screenshots out of the box. Framer Motion for timer animations, easter-egg polish. |
| State (client) | Zustand | Lighter than Redux, fine for timer/session/UI state; avoids over-engineering a single-user app. |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) | One vendor gives you Postgres, row-level security, built-in auth, realtime channels (needed for "X online" presence and rooms later), and file storage (room avatars) — all things the reference app needs. You already think in schemas and APIs; Supabase's SQL-first model fits that better than a fully abstracted BaaS. |
| Auth | Supabase Auth (Google + email magic link) | Same OAuth pattern as the reference app's Clerk modal, without adding a second vendor. Add X/Twitter OAuth later if demand shows up; skip it for v1 (low value for a solo tool). |
| AI (prompt refiner) | Anthropic API (Claude), direct via `@anthropic-ai/sdk` | You're already deep in the Claude ecosystem; using the same model family for "refine this prompt" keeps behavior predictable and lets you reuse prompt-engineering techniques you already know. |
| Realtime presence / rooms | Supabase Realtime (Presence + Broadcast) | Native fit for "X online," live room member counts, and later synced timers — no separate WebSocket service to run. |
| Hosting | Vercel (frontend + API routes) + Supabase Cloud | Zero-ops for a solo builder; free tiers cover this scale comfortably. |
| Background jobs (streaks, daily rollups) | Supabase Edge Functions + `pg_cron` | Keeps scheduled logic (e.g., nightly streak calculation) inside the same platform instead of adding a separate worker/queue system. |
| Analytics (optional, v2) | PostHog (self-hostable or cloud free tier) | If you ever open this to others, you'll want funnel/retention data; skip entirely for solo v1. |

**Alternative considered**: Firebase instead of Supabase. Rejected because Postgres + SQL gives you a real relational data model (sessions → projects → tasks → notes, all foreign-keyed) which matches how you already think about data, and RLS policies map cleanly to "my data only" now and "shared rooms" later.

## User Stories & Epics

### Epic A — Focus Timer & Sessions **[REF]**
- As a user, I want to start a countdown or count-up timer with one click, so I can begin a focus session without friction.
  - AC: Timer starts in ≤1 click from the dashboard; state persists across page refresh/tab close.
- As a user, I want to tag each session with a category (Code/Market/Design/custom), so my time is categorized automatically.
  - AC: Category selector visible before and during a running session; stored on the session record.
- As a user, I want Pomodoro mode with configurable work/short-break/long-break durations and cycles, so I can work in structured sprints.
  - AC: Settings modal persists values; timer auto-transitions between work/break phases; a phase-change notification/sound fires.
- As a user, I want to pause, complete, or cancel a session, so I have control mid-session.
  - AC: Complete logs the session with actual elapsed time even if shorter than planned; cancel discards it (with confirm).

### Epic B — Streaks & Deep Work Heatmap **[REF]**
- As a user, I want a "Days Locked In" streak counter, so consistency is visible at a glance.
  - AC: Streak increments once per calendar day (user's local timezone) with ≥1 completed session meeting a minimum-duration threshold (default 15 min, configurable).
- As a user, I want a GitHub-style contribution calendar of daily deep-work hours, so I can see patterns over the year.
  - AC: Cells colored by 5 buckets (0 / 0–1 / 1–2 / 2–4 / 4+ hours); hover shows exact date + hours; scrollable by month.

### Epic C — Tasks **[REF]**
- As a user, I want a lightweight to-do list with To-Do/Done/Log tabs and a type tag per task, so I can track what I'm working on without leaving the app.
  - AC: Add task with title + type; check off moves it to Done; Log shows a timestamped history of completions.
- As a user, I want tasks optionally linked to a session, so completing a task can be tied to the time I spent on it.
  - AC: A task can reference zero or one active/most-recent session id.

### Epic D — Rooms & Ambient Focus **[REF]**
- As a user, I want a personal "My Room" with ambient background music/theme (Lofi/Ghibli-style presets, custom YouTube embed, volume control), so focus sessions feel less sterile.
  - AC: Theme + volume persist per user; custom YouTube URL playable inline.
- As a user (v2), I want to create a public room with a name, URL slug, description, and optional sprint deadline, so I can co-work alongside others.
  - AC: Room has a unique slug; shows live member count via presence; deadline displayed as countdown.
- As a user (v2), I want to see how many people are online in a room, so it feels alive.
  - AC: Presence count updates in real time (≤3s latency) via Supabase Realtime.

### Epic E — Freedom Project & Goal Tracking **[REF]**
- As a user, I want to define a monthly revenue goal ("Freedom Figure") and link one or more projects to it, so my timer sessions visibly serve a concrete income target.
  - AC: 3-step wizard: (1) monthly revenue goal, (2) project name + URL, (3) link session categories or tasks to this project as contributing work.
- As a user, I want to see progress toward my freedom figure (e.g., hours invested, or manually-logged revenue), so the goal isn't just decorative.
  - AC: Dashboard widget shows target vs. either (a) hours logged against linked categories, or (b) manually entered MRR/revenue-to-date (see Open Questions on whether revenue is tracked automatically or by hand).

### Epic F — Notes & Quick Copy **[NEW]**
- As a user, I want to jot a note during a session and copy it with one click, so I don't break focus digging through other apps.
  - AC: Note editor accessible via hotkey/side panel during an active session; each note has a one-click "Copy" button; toast confirms copy.
- As a user, I want notes organized by tag/project, so they don't become an unsearchable dump.
  - AC: Notes support tags and free-text search; filterable by tag and by linked project/category.

### Epic G — Clipboard History **[NEW]**
- As a user, I want a running history of things I've copied inside the app (notes, prompt outputs, task titles), so I can grab something I copied a few minutes ago without retyping it.
  - AC: Every in-app "Copy" action is appended to a clipboard history list (last 50 items, session-scoped by default); each entry re-copyable and deletable.
  - Note: true OS-level clipboard capture requires a browser extension or desktop wrapper — see Open Questions.

### Epic H — Prompt Library & Prompt Refiner **[NEW]**
- As a user, I want to save reusable prompts with a title, tags, and body, so I stop rewriting the same prompts from scratch.
  - AC: CRUD on prompts; tag filter; one-click copy; usage count tracked (nice-to-have).
- As a user, I want to paste a rough prompt and get a refined version back (via Claude), so I can turn a vague idea into a well-structured prompt fast.
  - AC: Input box + "Refine" button calls the Anthropic API server-side with a system prompt tuned for prompt engineering; returns refined text with a diff/before-after view; refined result savable directly to the Prompt Library.

### Epic I — Fun / Stress Relief **[NEW, stretch]**
- As a user, I want a couple of tiny games or easter eggs I can trigger during a break, so a 5-minute break doesn't turn into 20 minutes on Twitter.
  - AC: At minimum, a break-timer screen offers 1–2 embedded micro-games (see Phasing) that auto-close or nudge back to work when the break timer ends.

## Functional Requirements

**Timer & Sessions**
- FR-1: System shall support countdown (Pomodoro) and stopwatch (count-up) timer modes.
- FR-2: System shall let a user select a category before/while a session is active; categories are user-defined with a default seed set (Code, Market, Design, Admin).
- FR-3: System shall persist an in-progress session across page reloads (localStorage + server sync on reconnect).
- FR-4: System shall log every completed session with: start time, end time, duration, category, linked project (optional), linked task (optional).
- FR-5: System shall support configurable Pomodoro settings: work duration, short break duration, long break duration, cycles before long break; auto-transition phases and play a sound/notification on transition.

**Streaks & Heatmap**
- FR-6: System shall compute a daily streak based on total minutes logged that day exceeding a configurable minimum (default 15 min).
- FR-7: System shall render a 12-month contribution heatmap bucketed into 5 intensity levels based on total daily focused minutes.

**Tasks**
- FR-8: System shall support create/complete/delete of tasks with a title and a type tag.
- FR-9: System shall maintain a Log view listing completed tasks with completion timestamps.

**Rooms**
- FR-10: System shall provide one default private "My Room" per user with theme (preset or custom YouTube) and volume settings.
- FR-11 (v2): System shall allow creating a public room with name, slug, description, optional YouTube embed, optional avatar, optional deadline.
- FR-12 (v2): System shall track and broadcast live presence count per room via realtime channel.

**Freedom Project**
- FR-13: System shall support a 3-step goal-setup wizard capturing monthly revenue goal, project name, and project URL.
- FR-14: System shall allow linking session categories to a Freedom Project so hours-toward-goal can be aggregated and displayed.

**Notes & Clipboard**
- FR-15: System shall support CRUD on notes with tags and full-text search.
- FR-16: System shall provide a one-click copy action on notes, prompts, and clipboard entries using the Clipboard API.
- FR-17: System shall maintain an in-app clipboard history of the last 50 copy actions, viewable and re-copyable, clearable by the user.

**Prompt Library & Refiner**
- FR-18: System shall support CRUD on prompts with title, body, and tags.
- FR-19: System shall send a raw prompt to a server-side endpoint that calls the Anthropic API with a fixed prompt-engineering system prompt and returns a refined version.
- FR-20: System shall let the user save a refined prompt directly into the Prompt Library.

**Auth & Accounts**
- FR-21: System shall support Google OAuth and email magic-link sign-in.
- FR-22: All user data (sessions, notes, prompts, tasks, rooms owned) shall be scoped to the authenticated user via row-level security.

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Timer UI updates must feel instant (<100ms) client-side; timer state must NOT depend on a server round-trip to tick. Dashboard initial load target: <2s on a typical broadband connection. |
| Reliability | An in-progress timer session must survive a browser refresh or accidental tab close without losing elapsed time (reconstruct from a stored start timestamp, not a client-side countdown alone). |
| Data privacy | Single-tenant v1: all data private to the owning user via Postgres RLS. No data sold/shared. Prompt text sent to Anthropic API is subject to Anthropic's standard API data handling — flag this to Irdi if he ever puts client-confidential prompts through the refiner. |
| Scalability | v1 scale target: 1 user. v2 target: low hundreds of users on Supabase's free/Pro tier without architecture changes (RLS-based multi-tenancy already supports this). |
| Accessibility | Keyboard-operable timer controls (start/pause/complete) and sufficient color contrast in dark theme (WCAG AA) — reasonable default given no explicit requirement was stated. |
| Browser support | Latest Chrome/Edge/Firefox/Safari, desktop-first (matches the reference app and Irdi's workflow); mobile responsive but not the primary target for v1. |
| Compliance | No specific compliance regime (HIPAA/SOC2/GDPR) assumed. If v2 opens to EU users, GDPR basics (data export/delete) become a real requirement — flagged as an open question, not built into v1. |

## Data Model

| Table | Key Fields | Type | Notes |
|---|---|---|---|
| `users` | `id` (PK, uuid) | Supabase Auth | Managed by Supabase Auth; extended via `profiles`. |
| `profiles` | `user_id` (PK, FK→users), `display_name`, `avatar_url`, `timezone`, `pomodoro_settings` (jsonb) | | 1:1 with `users`. |
| `categories` | `id` (PK), `user_id` (FK), `name`, `color`, `is_default` | | User-defined tags for sessions (Code/Market/Design/etc.). |
| `sessions` | `id` (PK), `user_id` (FK), `category_id` (FK, nullable), `project_id` (FK, nullable), `task_id` (FK, nullable), `mode` (enum: countdown/stopwatch/pomodoro), `started_at`, `ended_at`, `duration_seconds`, `status` (enum: completed/cancelled) | | Core unit of everything: streaks, heatmap, and freedom-project progress all aggregate from here. |
| `tasks` | `id` (PK), `user_id` (FK), `title`, `type`, `status` (enum: todo/done), `completed_at`, `session_id` (FK, nullable) | | |
| `projects` | `id` (PK), `user_id` (FK), `name`, `url`, `freedom_goal_id` (FK, nullable) | | "Freedom Project" wizard step 2. |
| `freedom_goals` | `id` (PK), `user_id` (FK), `monthly_revenue_goal`, `currency`, `created_at` | | Step 1 of wizard; a user can have one active goal at a time (v1) or several (v2). |
| `project_categories` | `project_id` (FK), `category_id` (FK) | join table | Links which session categories "count toward" a project's freedom goal. |
| `notes` | `id` (PK), `user_id` (FK), `title`, `body` (text/markdown), `tags` (text[]), `project_id` (FK, nullable), `created_at`, `updated_at` | | |
| `clipboard_items` | `id` (PK), `user_id` (FK), `content`, `source` (enum: note/prompt/task/manual), `created_at` | | Ring-buffer behavior enforced at query time (keep latest 50 per user) or via a cron trim job. |
| `prompts` | `id` (PK), `user_id` (FK), `title`, `body`, `tags` (text[]), `usage_count`, `created_at`, `updated_at` | | |
| `prompt_refinements` | `id` (PK), `user_id` (FK), `original_prompt_id` (FK, nullable), `raw_input`, `refined_output`, `created_at` | | Audit trail of refinements; lets you build a "before/after" view and later fine-tune your own refinement system prompt. |
| `rooms` | `id` (PK), `owner_id` (FK), `name`, `slug` (unique), `description`, `youtube_url`, `avatar_url`, `deadline`, `is_public`, `created_at` | | v2. |
| `room_members` | `room_id` (FK), `user_id` (FK), `joined_at` | join table, v2 | Presence backed by Supabase Realtime, persisted membership optional. |
| `streaks` (materialized/derived) | `user_id` (FK), `date`, `total_minutes`, `streak_count` | | Can be a daily rollup table populated by a `pg_cron` job rather than computed live, to keep the heatmap fast. |

**Relationships summary**
- `users` 1—1 `profiles`
- `users` 1—N `sessions`, `tasks`, `projects`, `notes`, `prompts`, `clipboard_items`, `categories`, `freedom_goals`
- `sessions` N—1 `categories`, N—1 `projects` (nullable), N—1 `tasks` (nullable)
- `projects` N—1 `freedom_goals`; `projects` N—N `categories` via `project_categories`
- `prompts` 1—N `prompt_refinements` (a prompt can be refined multiple times)
- `rooms` 1—N `room_members` (N—N users↔rooms in effect)

## Architecture & API Notes

```
┌─────────────────────────────┐
│  Next.js App (Vercel)       │
│  - App Router pages/UI      │
│  - Zustand: timer/session   │
│    client state             │
│  - API routes (/api/*)      │
└───────────┬─────────────────┘
            │  supabase-js (auth, db, realtime)
            ▼
┌─────────────────────────────┐        ┌────────────────────────┐
│  Supabase                   │        │  Anthropic API          │
│  - Postgres (RLS per table) │◀──────▶│  (prompt refinement,    │
│  - Auth (Google/email)      │  API   │  called from a Next.js  │
│  - Realtime (presence, v2)  │  route │  /api/refine-prompt     │
│  - Storage (avatars)        │        │  route, server-side key)│
│  - pg_cron / Edge Functions │        └────────────────────────┘
│    (nightly streak rollup)  │
└─────────────────────────────┘
```

Key API routes (Next.js route handlers):

| Route | Method | Purpose |
|---|---|---|
| `/api/sessions` | POST | Start a session |
| `/api/sessions/:id` | PATCH | Update (pause/complete/cancel) a session |
| `/api/sessions` | GET | List sessions (filter by date range/category) for heatmap/history |
| `/api/tasks` | GET/POST | List/create tasks |
| `/api/tasks/:id` | PATCH/DELETE | Update/delete a task |
| `/api/notes` | GET/POST | List/create notes |
| `/api/prompts` | GET/POST | List/create prompts |
| `/api/refine-prompt` | POST | Body: `{ rawInput }` → calls Anthropic API server-side, returns `{ refined, rationale? }`; never exposes the Anthropic key to the client |
| `/api/freedom-goal` | GET/POST | Get or set the active freedom goal + linked project |
| `/api/rooms` | GET/POST | (v2) List public rooms / create a room |
| `/api/rooms/:slug/presence` | — | (v2) handled client-side via Supabase Realtime channel, not a REST call |

Suggested project structure:
```
/app
  /(dashboard)/page.tsx          -- main timer + widgets
  /(dashboard)/notes/page.tsx
  /(dashboard)/prompts/page.tsx
  /(dashboard)/rooms/[slug]/page.tsx   -- v2
  /api/...                       -- route handlers above
/components
  /timer, /tasks, /notes, /prompts, /heatmap, /rooms
/lib
  /supabase (client + server helpers)
  /anthropic (refine-prompt helper)
  /store (zustand slices: timer, session, ui)
/db
  /migrations (SQL, matches Data Model section)
```

## Phasing

**MVP (weeks 1–3) — the reverse-engineered core, solo-only**
- Auth (Google + email)
- Timer (stopwatch + Pomodoro), categories, session logging
- Tasks (To-Do/Done/Log)
- Streak counter + deep-work heatmap
- My Room (theme presets + custom YouTube, volume) — solo, no multiplayer
- Freedom Goal wizard + basic progress widget (hours-based, not revenue-based, for simplicity)
- Notes with tags, search, one-click copy
- Basic clipboard history (in-app copy actions only)

**v1.5 (weeks 4–5) — the differentiators**
- Prompt Library (CRUD, tags, copy)
- Prompt Refiner (Anthropic API integration, before/after view, save-to-library)
- Polish pass: keyboard shortcuts, sound/notification on Pomodoro phase change, empty states, mobile responsiveness

**v2 (weeks 6+) — multiplayer & public**
- Public rooms (create/join, slug URLs, live presence via Realtime, sprint deadlines)
- Room chat or simple reactions (optional)
- Manual revenue logging against Freedom Goal (not just hours)
- Shareable public profile (streak + heatmap) if Irdi wants a public accountability angle

**Stretch / Easter eggs (anytime after MVP, low-priority, high-fun)**
- Break-screen mini-games: a tiny "type-racer" using your own saved prompts as text, or a 60-second reaction-time/breathing exercise widget
- Konami-code or hidden click sequence that swaps the theme to a joke skin
- A "focus streak" milestone toast with confetti (7/30/100-day streaks)
- An idle/away detector that gently pauses the timer and shows a "still there?" nudge with a one-liner roast, tuned to not be annoying
- A "prompt of the day" surfaced from the library on the dashboard
- Ambient sound easter egg: hidden "rain + keyboard clacks" preset

## Open Questions & Assumptions

1. **Clipboard scope**: True OS-level clipboard monitoring needs a browser extension or Electron/Tauri wrapper. Assumption: v1 clipboard history is limited to actions taken inside the app. Flag if you actually want system-wide capture — that's a separate, larger build (browser extension).
2. **Freedom Goal progress metric**: Assumed v1 tracks hours logged against linked categories, not actual revenue (which would require manual entry or invoicing integration). Confirm if you want manual $ logging in v1 instead.
3. **Multiplayer timing**: Assumed rooms/presence are v2, not MVP, since they add real-time infra complexity you don't need to validate the core daily-use loop. Confirm this sequencing works for you.
4. **Public/multi-tenant timeline**: Assumed this stays a personal tool through MVP and v1.5, with "make it public" as a deliberate v2+ decision (naming, pricing, ToS, GDPR) rather than a day-1 requirement.
5. **Notifications**: Assumed in-app/sound only for v1 (no push notifications/email reminders) — confirm if you want a daily reminder to keep the streak alive.
6. **Name**: "LockIn" is a placeholder. Given your content/portfolio angle, this could double as a public case study later — worth a deliberate naming pass once MVP works, not before.

## Success Criteria

- You personally use it daily for focus sessions within the first week of MVP shipping (the real test — not feature count).
- Streak + heatmap accurately reflect logged sessions with zero data loss across refreshes/reconnects, verified by manual QA across 10+ sessions.
- Prompt refiner produces a usable refined prompt in under 5 seconds for a typical 1–2 sentence input.
- Full MVP feature set (per Phasing) built and deployed to a live Vercel URL within 3 weeks of start.

## For Claude Code (handoff)

Suggested build order:
1. `db/migrations`: create tables per Data Model, enable RLS, write per-user policies (`user_id = auth.uid()`).
2. Auth flow (Supabase Auth + Next.js middleware for protected routes).
3. Timer + sessions (client state in Zustand, persisted to `sessions` table on complete; reconstruct in-progress timer from a stored `started_at` timestamp, not a client-only countdown, to satisfy the reliability NFR).
4. Tasks CRUD, then Notes CRUD (these share a lot of UI patterns — build one, then adapt).
5. Streak + heatmap: build the daily rollup query first (can be a live aggregate query for MVP; add `pg_cron` rollup only if performance becomes an issue).
6. Freedom Goal wizard (3-step form) + dashboard progress widget.
7. My Room (theme presets, YouTube embed, volume) — no realtime/multiplayer yet.
8. Prompt Library CRUD, then `/api/refine-prompt` route wired to Anthropic API.
9. Explicitly out of scope until v2: public rooms, realtime presence, room membership, manual revenue tracking, push notifications, mini-games/easter eggs. Do not scaffold these in v1 beyond the `rooms`/`room_members` tables already defined (fine to create the tables now since they're cheap, but build zero UI for them until v2 starts).

Setup commands to start from:
```bash
npx create-next-app@latest lockin --typescript --tailwind --app
cd lockin
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr zustand @anthropic-ai/sdk framer-motion
```
