-- LockIn v1 schema. Run in the Supabase SQL editor, or via `supabase db push`.
-- Mirrors PRD "Data Model". Every user-owned table is RLS-scoped to auth.uid().

create extension if not exists pgcrypto;

-- =========================================================================
-- profiles
-- =========================================================================
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  pomodoro_settings jsonb not null default '{
    "work_minutes": 25,
    "short_break_minutes": 5,
    "long_break_minutes": 15,
    "cycles_before_long_break": 4
  }'::jsonb,
  room_settings jsonb not null default '{
    "theme": "tokyo-neon-rain-street",
    "youtube_url": null,
    "volume": 50
  }'::jsonb,
  min_session_minutes_for_streak integer not null default 15,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (user_id = auth.uid());
create policy "profiles: owner update" on public.profiles
  for update using (user_id = auth.uid());

-- Seed a profile + default categories the moment a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);

  insert into public.categories (user_id, name, color, is_default)
  values
    (new.id, 'Code', '#6366f1', true),
    (new.id, 'Market', '#10b981', true),
    (new.id, 'Design', '#f59e0b', true),
    (new.id, 'Admin', '#94a3b8', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- categories
-- =========================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;
create policy "categories: owner all" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index categories_user_id_idx on public.categories (user_id);

-- =========================================================================
-- freedom_goals
-- =========================================================================
create table public.freedom_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_revenue_goal numeric(12, 2) not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

alter table public.freedom_goals enable row level security;
create policy "freedom_goals: owner all" on public.freedom_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index freedom_goals_user_id_idx on public.freedom_goals (user_id, created_at desc);

-- =========================================================================
-- projects
-- =========================================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text,
  freedom_goal_id uuid references public.freedom_goals (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "projects: owner all" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index projects_user_id_idx on public.projects (user_id);

-- =========================================================================
-- project_categories (join table — links categories that count toward a
-- project's freedom goal). No user_id column, so RLS checks ownership of
-- the parent project.
-- =========================================================================
create table public.project_categories (
  project_id uuid not null references public.projects (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (project_id, category_id)
);

alter table public.project_categories enable row level security;
create policy "project_categories: owner all" on public.project_categories
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_categories.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_categories.project_id and p.user_id = auth.uid()
    )
  );

-- =========================================================================
-- tasks
-- =========================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null default 'General',
  status text not null default 'todo' check (status in ('todo', 'done')),
  completed_at timestamptz,
  session_id uuid,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "tasks: owner all" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index tasks_user_id_status_idx on public.tasks (user_id, status);

-- =========================================================================
-- sessions — the core unit everything else aggregates from.
-- Only completed/cancelled sessions are persisted; the in-progress timer
-- lives client-side (Zustand + localStorage), reconstructed from
-- started_at so a refresh never loses elapsed time.
-- =========================================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  mode text not null check (mode in ('countdown', 'stopwatch', 'pomodoro')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  status text not null check (status in ('completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
create policy "sessions: owner all" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index sessions_user_id_started_at_idx on public.sessions (user_id, started_at desc);
create index sessions_user_id_category_idx on public.sessions (user_id, category_id);

alter table public.tasks
  add constraint tasks_session_id_fkey
  foreign key (session_id) references public.sessions (id) on delete set null;

-- =========================================================================
-- notes
-- =========================================================================
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  body text not null default '',
  tags text[] not null default '{}',
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
create policy "notes: owner all" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index notes_user_id_idx on public.notes (user_id, updated_at desc);
create index notes_tags_idx on public.notes using gin (tags);

-- =========================================================================
-- clipboard_items — ring buffer of in-app copy actions (last 50/user,
-- trimmed at write time rather than by a cron job for MVP simplicity).
-- =========================================================================
create table public.clipboard_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  source text not null check (source in ('note', 'prompt', 'task', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.clipboard_items enable row level security;
create policy "clipboard_items: owner all" on public.clipboard_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index clipboard_items_user_id_idx on public.clipboard_items (user_id, created_at desc);

create function public.trim_clipboard_history()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.clipboard_items
  where user_id = new.user_id
    and id not in (
      select id from public.clipboard_items
      where user_id = new.user_id
      order by created_at desc
      limit 50
    );
  return new;
end;
$$;

create trigger trim_clipboard_history_trigger
  after insert on public.clipboard_items
  for each row execute function public.trim_clipboard_history();

-- =========================================================================
-- prompts + prompt_refinements
-- =========================================================================
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prompts enable row level security;
create policy "prompts: owner all" on public.prompts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index prompts_user_id_idx on public.prompts (user_id, updated_at desc);
create index prompts_tags_idx on public.prompts using gin (tags);

create table public.prompt_refinements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_prompt_id uuid references public.prompts (id) on delete set null,
  raw_input text not null,
  refined_output text not null,
  created_at timestamptz not null default now()
);

alter table public.prompt_refinements enable row level security;
create policy "prompt_refinements: owner all" on public.prompt_refinements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index prompt_refinements_user_id_idx on public.prompt_refinements (user_id, created_at desc);

-- =========================================================================
-- rooms + room_members — v2 (multiplayer). Tables created now per PRD
-- handoff notes since they're cheap; no UI ships against them until v2.
-- =========================================================================
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  youtube_url text,
  avatar_url text,
  deadline timestamptz,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
create policy "rooms: public read" on public.rooms
  for select using (is_public or owner_id = auth.uid());
create policy "rooms: owner write" on public.rooms
  for insert with check (owner_id = auth.uid());
create policy "rooms: owner update" on public.rooms
  for update using (owner_id = auth.uid());
create policy "rooms: owner delete" on public.rooms
  for delete using (owner_id = auth.uid());

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_members enable row level security;
create policy "room_members: member read" on public.room_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.rooms r where r.id = room_members.room_id and r.owner_id = auth.uid())
  );
create policy "room_members: self join" on public.room_members
  for insert with check (user_id = auth.uid());
create policy "room_members: self leave" on public.room_members
  for delete using (user_id = auth.uid());

-- =========================================================================
-- updated_at maintenance
-- =========================================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();
