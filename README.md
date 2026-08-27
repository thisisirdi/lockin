# LockIn

A personal deep-work OS: start a timer, tag what you're doing, and watch the evidence pile
up. Built for one person, running on a desktop-style window manager instead of a normal
web app shell — floating windows for your timer, tasks, notes, and prompts, plus a
Claude-backed Companion that only ever acts on data you hand it.

## Features

- **Timer** — stopwatch or Pomodoro, tagged by category and (optionally) a linked task.
  Survives a refresh with zero drift: it never counts up from a client-side interval, it
  recomputes elapsed time from a stored start timestamp on every render.
- **Streak & heatmap** — a GitHub-style contribution grid living in the Clock window,
  driven by real session data.
- **Tasks, Notes, Prompt library** — each its own window; notes and prompts are one click
  from being copied anywhere, and every copy is logged to a Clipboard History window.
- **Freedom Goal** — set a monthly revenue target, link it to the categories you log
  against, and watch hours roll up toward it.
- **Ambient** — a wallpaper picker (the dock), a YouTube embed, and a volume control for
  background sound while you work.
- **Companion** — an AI panel with seven tabs: free-form chat, a day plan built from your
  actual open tasks, breaking a vague task into concrete first steps, a weekly review
  written from real session stats, Q&A over your notes, a prompt refiner, and a handful of
  anti-procrastination nudges ("Unstick"). It only sees what you explicitly attach — drag a
  window onto it, select text and click "Ask Companion," or use the attach picker — and
  it's instructed to never invent a fact or number it wasn't given.

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Zustand · Supabase (Postgres, Auth,
Row-Level Security) · Anthropic API (`@anthropic-ai/sdk`)

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then:
   - Open the SQL editor and run [`db/migrations/0001_init.sql`](db/migrations/0001_init.sql).
   - Under Authentication > URL Configuration, add `http://localhost:4210/auth/callback`
     as a redirect URL.
   - Email sign-in (magic link + password) is enabled by default — nothing else to do.
   - Google sign-in needs real OAuth credentials before the button works: create an OAuth
     Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
     add Supabase's callback URL (shown on Authentication > Providers > Google) as an
     authorized redirect URI, then paste the Client ID/Secret into that same Supabase
     screen and enable it. Until then, "Continue with Google" shows a clear "not
     configured" message — use the Password or Magic link tab on `/login` instead.

3. **Set your environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `ANTHROPIC_API_KEY` | Used server-side only, by every `/api/companion/*` route and `/api/refine-prompt`. Every one of those routes fails cleanly (no crash) if this is left blank. |
   | `PORT` / `NEXT_PUBLIC_SITE_URL` | Dev server defaults to port `4210` instead of `3000`. `next dev` reads `PORT` natively; keep `NEXT_PUBLIC_SITE_URL` in sync since it builds the OAuth/magic-link redirect. (`package.json`'s `dev` script also hardcodes `-p 4210`, which wins if the two disagree.) |

4. **Run it**
   ```bash
   npm run dev
   ```
   Open [http://localhost:4210](http://localhost:4210) — you'll land on `/login`.

## Architecture

### The window manager

The dashboard (`/`) isn't a routed page tree — it's one component, `Desktop.tsx`, that
mounts every feature as a floating window (`components/os/windows/*` and the Companion
panel). Dragging, resizing, minimizing, focus order, and four layout presets ("Everything,"
"Deep work," "Writing," "Planning") are all driven by `lib/store/os.ts`, a Zustand store
persisted to `localStorage` — window placement is entirely client-side, nothing about it
touches the database.

Every window is a thin UI layer over the same hooks and API routes a conventional page
would use — `lib/hooks/use-tasks.ts`, `use-notes.ts`, `use-prompts.ts`, and so on — so the
data layer doesn't know or care that it's being rendered inside a glass window instead of a
page.

### The timer

`lib/store/timer.ts` records a `startedAt` epoch timestamp on Start/Resume and banks
elapsed seconds on Pause. The number on screen is recomputed from that timestamp on every
render, not ticked from a `setInterval`. Combined with persisting the whole timer state to
`localStorage`, a refresh or a closed tab reconstructs the exact elapsed time — no server
round-trip required to keep time, and no drift possible from a paused tab's throttled
timers. A session only reaches Postgres when you hit **Complete**; cancelling discards it.

### Companion

`components/os/companion/` is the AI panel; `app/api/companion/*` are the six routes
behind its non-Refine tabs (Refine reuses `/api/refine-prompt`). Context reaches it three
ways — dragging a window onto it, selecting text and clicking "Ask Companion," or the
composer's attach button — and in every case what gets sent to Claude is real, freshly
fetched data (your actual open tasks, note bodies, session stats), never a placeholder.
The Review tab in particular only ever reports numbers computed server-side from your
`sessions` table; the prompt explicitly forbids inventing anything it wasn't given.

## Project structure

```
app/
  login/                  -- sign-in: Google OAuth, email+password, magic link
  auth/callback/          -- OAuth/magic-link code exchange
  (dashboard)/page.tsx    -- mounts <Desktop>; everything else lives inside it
  api/
    companion/            -- chat, plan, breakdown, review, ask-notes, unstick-smallest
    sessions/ tasks/ notes/ prompts/ freedom-goal/ stats/ clipboard/ categories/ profile/
    refine-prompt/        -- shared by the old prompt library and Companion's Refine tab
components/
  os/
    Desktop.tsx           -- the stage: wallpaper, theme, mounts every window
    Window.tsx            -- generic glass window chrome (drag/resize/minimize/drop-to-attach)
    Dock.tsx, popovers/    -- window toggles, layout/font/wallpaper pickers
    windows/               -- one component per feature (Clock, Timer, Tasks, Notes, ...)
    companion/             -- the Companion panel and its 7 tabs
  ui/                     -- the shadcn/ui primitives actually still in use
  timer/                  -- CategorySelect / TaskSelect, shared by the Timer window
  nav/                    -- UserMenu (sign-out), the only global chrome left
lib/
  store/os.ts              -- window positions/z-order/visibility/layout presets (persisted)
  store/companion.ts        -- Companion chat history + attached context (persisted)
  store/timer.ts             -- the timer state described above
  os/types.ts                -- window ids + the 4 layout preset definitions
  companion/                  -- server-side context helpers + client-side attach resolvers
  supabase/                  -- browser + server clients, the auth-refresh proxy
  anthropic/                  -- shared Anthropic client + the refine-prompt system prompt
  hooks/                      -- one data hook per resource (tasks, notes, prompts, ...)
db/migrations/0001_init.sql  -- full schema, RLS policies, triggers
proxy.ts                     -- Next 16's middleware replacement; guards everything behind auth
```

## Known limitations

- **Mobile is unhandled.** The window manager is desktop-first by design; there's a
  narrow-viewport fallback for the default layout, but it hasn't been tuned for touch.
- **Companion's data doesn't live-sync across open windows.** Adding steps via "Break
  down → Add all to Tasks" won't appear in an already-open Tasks window until it remounts.
- **Pomodoro durations aren't configurable from the UI** right now (defaults: 25/5/15
  minutes, 4 cycles) — it had a settings dialog before the window-manager rewrite; re-adding
  it to the Timer window is a small follow-up.
- **Public rooms and live presence** (the PRD's v2 scope) aren't built — the `rooms` and
  `room_members` tables exist in the migration but have no UI.
- **Revenue against the Freedom Goal is tracked by hours, not dollars** — manual revenue
  logging is PRD v2 scope, not yet built.

See [`PRD.md`](PRD.md) for the original product spec this was built from.
