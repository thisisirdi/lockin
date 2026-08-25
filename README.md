# LockIn

Personal deep work OS: start a timer, tag what you're doing, watch the evidence pile up.
Built from [`PRD.md`](PRD.md) — see it for the full product spec, phasing, and open questions.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Zustand · Supabase (Postgres/Auth) · Anthropic API

## Setup

1. **Install dependencies** (already done if you just cloned this):
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run the migration:
   - Open the SQL editor in your Supabase project.
   - Paste and run [`db/migrations/0001_init.sql`](db/migrations/0001_init.sql).
   - In Authentication > Providers, enable **Google** and **Email** (magic link).
   - In Authentication > URL Configuration, add `http://localhost:4210/auth/callback` as a redirect URL.

3. **Copy the env template** and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings > API.
   - `ANTHROPIC_API_KEY` — used server-side only, by `/api/refine-prompt`. The refiner
     fails with a clean 500 (no crash) if this is left blank.
   - `PORT` — defaults to `4210` instead of Next's usual `3000`, since that port tends
     to already be taken by other projects. `next dev` reads `PORT` natively, so
     changing this one line is enough; keep `NEXT_PUBLIC_SITE_URL` in sync since it's
     used to build the OAuth/magic-link redirect.

4. **Run the dev server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:4210](http://localhost:4210). You'll be redirected to `/login`.

## Project structure

```
app/
  login/                 -- sign-in (Google OAuth + email magic link)
  auth/callback/         -- OAuth/magic-link code exchange
  (dashboard)/           -- everything behind auth, shares the sidebar layout
    page.tsx             -- timer + streak/heatmap + upcoming tasks
    tasks/                -- To-Do / Done / Log
    notes/                -- notes with tags, search, one-click copy
    prompts/              -- prompt library + Claude-powered refiner
    freedom/              -- Freedom Goal wizard + progress widget
    room/                 -- ambient theme, custom YouTube embed, volume
  api/                    -- route handlers backing all of the above
components/
  ui/                    -- shadcn/ui primitives
  timer/ nav/ notes/ prompts/ heatmap/
lib/
  supabase/              -- browser + server clients, session-refresh proxy
  store/timer.ts         -- Zustand timer state (see below)
  anthropic/             -- server-side Claude call for prompt refinement
  streak.ts              -- heatmap/streak aggregation
db/migrations/0001_init.sql  -- full schema, RLS policies, triggers
proxy.ts                 -- Next 16's middleware replacement; guards /(dashboard)
```

## How the timer survives a refresh

The Zustand store (`lib/store/timer.ts`) never counts up on its own. It records a
`startedAt` epoch timestamp when you hit Start/Resume and banks elapsed seconds on
Pause; the on-screen number is recomputed from that timestamp every render. The whole
state is persisted to `localStorage`, so a refresh or closed tab reconstructs the exact
elapsed time instead of losing it — no server round-trip required to tick.

Sessions are only written to Postgres when you hit **Complete** (or logged as
`cancelled` isn't persisted at all — cancel just discards the local state). This keeps
the timer NFR ("must not depend on a server round-trip to tick") trivially true.

## What's not built yet

Per the PRD's phasing, these are intentionally out of scope for this pass:
- Public rooms, live presence, room membership (v2) — `rooms`/`room_members` tables
  exist in the migration but have no UI.
- Manual revenue logging against the Freedom Goal (v1 tracks hours only).
- Push/email notifications, break-screen mini-games, easter eggs.
