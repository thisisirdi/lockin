# LockIn

Personal deep work OS: start a timer, tag what you're doing, watch the evidence pile up.
Built from [`PRD.md`](PRD.md) — see it for the original product spec. The UI has since moved
to a desktop-style window manager (see "The OS redesign" below), which supersedes the PRD's
sidebar-and-pages layout while keeping every underlying feature and API route.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · Zustand · Supabase (Postgres/Auth) · Anthropic API

## Setup

1. **Install dependencies** (already done if you just cloned this):
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run the migration:
   - Open the SQL editor in your Supabase project.
   - Paste and run [`db/migrations/0001_init.sql`](db/migrations/0001_init.sql).
   - In Authentication > URL Configuration, add `http://localhost:4210/auth/callback` as a redirect URL.
   - **Email** sign-in (magic link + password) is enabled by default — nothing to do.
   - **Google** sign-in needs real OAuth credentials before the button works: create an
     OAuth Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
     add Supabase's callback URL (Authentication > Providers > Google shows it) as an
     authorized redirect URI, then paste the Client ID/Secret into that same Supabase
     provider screen and toggle it on. Until then, clicking "Continue with Google" shows
     a "not configured" toast — use the **Password** tab on `/login` instead, or
     **Magic link** if you'd rather not set a password.

3. **Copy the env template** and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings > API.
   - `ANTHROPIC_API_KEY` — server-side only, used by every `/api/companion/*` route and
     `/api/refine-prompt`. Every one of those routes fails with a clean error (no crash,
     no half-broken UI) if this is left blank.
   - `PORT` — defaults to `4210` instead of Next's usual `3000`, since that port tends
     to already be taken by other projects. `next dev` reads `PORT` natively, so
     changing this one line is enough; keep `NEXT_PUBLIC_SITE_URL` in sync since it's
     used to build the OAuth/magic-link redirect. (The `dev` script in `package.json`
     also hardcodes `-p 4210`, which takes precedence — change both if you move ports.)

4. **Run the dev server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:4210](http://localhost:4210). You'll be redirected to `/login`.

## The OS redesign

The dashboard (`/`) is a single-screen, desktop-style window manager, not a sidebar with
routed pages. Every feature — Timer, Tasks, Notes, Prompts, Freedom Goal, Ambient, Clipboard,
and the Companion AI panel — is a floating glass window you drag, resize, minimize, and
reopen from the bottom dock. A wallpaper picker (the same room-background photos as before)
and a typeface picker live in the dock too, and four layout presets ("Everything," "Deep
work," "Writing," "Planning") rearrange the whole desktop in one click. All of this is
client-side state persisted to `localStorage` (`lib/store/os.ts`) — nothing about window
position is server-side.

**Companion** (`components/os/companion/`) is new: a Claude-backed assistant panel with seven
tabs — Chat, Plan my day, Break down, Review, Ask notes, Refine, and Unstick. It only acts on
data you explicitly hand it: drag any window onto Companion to attach its real content as
context, select text anywhere and click "Ask Companion," or use the composer's attach picker.
Every tab calls a real `/api/companion/*` route backed by real Supabase data (your actual
tasks, notes, and sessions) — none of it is scripted or fabricated. The one exception:
Companion never invents a data point that isn't in what you gave it or what the route
computed server-side (the Review tab, for instance, only ever reports numbers it actually
computed from your `sessions` rows).

## Project structure

```
app/
  login/                 -- sign-in (Google OAuth, email+password, magic link)
  auth/callback/         -- OAuth/magic-link code exchange
  (dashboard)/page.tsx    -- mounts <Desktop>, everything else lives inside it
  api/
    companion/           -- chat, plan, breakdown, review, ask-notes, unstick-smallest
    ...                   -- sessions, tasks, notes, prompts, freedom-goal, stats, etc.
components/
  os/
    Desktop.tsx          -- the stage: wallpaper, CSS-variable theme, mounts every window
    Window.tsx            -- generic glass window chrome (drag/resize/minimize/close/drop-to-attach)
    Dock.tsx, popovers/    -- window toggles, layout/font/wallpaper pickers
    windows/               -- one component per feature (Clock, Timer, Tasks, Notes, ...)
    companion/             -- the Companion panel and its 7 tabs
  ui/                    -- shadcn/ui primitives (still used inside a few windows)
  timer/                 -- CategorySelect/TaskSelect, reused by the Timer window
lib/
  store/os.ts             -- window positions/sizes/z-order/layout presets (persisted)
  store/companion.ts       -- Companion chat history + attached context chips (persisted)
  store/timer.ts           -- Zustand timer state (see below)
  os/types.ts              -- window ids + the 4 layout preset definitions
  companion/                -- server-side context helpers + client-side attach resolvers
  supabase/                -- browser + server clients, session-refresh proxy
  anthropic/                -- shared Anthropic client + the refine-prompt system prompt
db/migrations/0001_init.sql  -- full schema, RLS policies, triggers
proxy.ts                 -- Next 16's middleware replacement; guards /(dashboard)
```

## How the timer survives a refresh

The Zustand store (`lib/store/timer.ts`) never counts up on its own. It records a
`startedAt` epoch timestamp when you hit Start/Resume and banks elapsed seconds on
Pause; the on-screen number is recomputed from that timestamp every render. The whole
state is persisted to `localStorage`, so a refresh or closed tab reconstructs the exact
elapsed time instead of losing it — no server round-trip required to tick.

Sessions are only written to Postgres when you hit **Complete** (cancelling discards the
local state, nothing is logged). This keeps the timer NFR ("must not depend on a server
round-trip to tick") trivially true.

## What's not built yet

- Mobile is unhandled — the OS is desktop-first by design; there's a narrow-viewport
  compact fallback for the "Everything" layout, but it hasn't been tuned for touch.
- Public rooms, live presence, room membership (v2) — `rooms`/`room_members` tables
  exist in the migration but have no UI.
- Manual revenue logging against the Freedom Goal (v1 tracks hours only).
- Push/email notifications, break-screen mini-games, easter eggs.
- Pomodoro work/break-duration settings has no UI right now (defaults: 25/5/15, 4 cycles)
  — it had one before the OS redesign; re-adding it to the Timer window is a small follow-up.
