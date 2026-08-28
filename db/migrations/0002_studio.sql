-- LockIn Studio schema. Run in the Supabase SQL editor, or via `supabase db push`,
-- after 0001_init.sql. Mirrors PRD-STUDIO.md §5. Every new user-owned table is
-- RLS-scoped to auth.uid() in this same migration.

-- =========================================================================
-- frameworks — seeded, read-only reference data. Not user-owned: RLS is
-- enabled but only a select policy exists, so writes are blocked for everyone
-- except migrations run with the service role.
-- =========================================================================
create table public.frameworks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  acronym_expansion text not null,
  slot_map jsonb not null,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.frameworks enable row level security;
create policy "frameworks: read all" on public.frameworks
  for select using (true);

-- =========================================================================
-- prompts — extend the v1 table. `current_version_id` is added after
-- prompt_versions exists below, since the two tables reference each other.
-- =========================================================================
alter table public.prompts
  add column deliverable_type text,
  add column framework_id uuid references public.frameworks (id) on delete set null,
  add column description text,
  add column is_starter boolean not null default false,
  add column forked_from_id uuid references public.prompts (id) on delete set null,
  add column public_slug text unique,
  add column archived_at timestamptz;

-- user_id is required by the v1 schema; starter prompts are system-owned, so
-- it has to become nullable before is_starter rows can exist.
alter table public.prompts alter column user_id drop not null;
alter table public.prompts
  add constraint prompts_user_id_or_starter check (user_id is not null or is_starter);

-- The v1 "prompts: owner all" policy is `user_id = auth.uid()`, which is never
-- true for a starter row (user_id is null there) — add a second permissive
-- select policy so starters stay visible. Postgres ORs permissive policies
-- for the same command, so this doesn't loosen anything the owner policy grants.
create policy "prompts: read starters" on public.prompts
  for select using (is_starter);

create index prompts_public_slug_idx on public.prompts (public_slug) where public_slug is not null;

-- =========================================================================
-- prompt_versions — immutable snapshot of a prompt's blocks + variables.
-- `created_from_run_id` is declared without a FK here (prompt_runs doesn't
-- exist yet) and constrained further down once it does.
-- =========================================================================
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  version_no integer not null,
  blocks jsonb not null default '[]'::jsonb,
  variables jsonb not null default '[]'::jsonb,
  change_note text,
  created_from_run_id uuid,
  created_at timestamptz not null default now(),
  unique (prompt_id, version_no)
);

alter table public.prompt_versions enable row level security;
create policy "prompt_versions: owner all" on public.prompt_versions
  for all using (
    exists (select 1 from public.prompts p where p.id = prompt_versions.prompt_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.prompts p where p.id = prompt_versions.prompt_id and p.user_id = auth.uid())
  );

-- Mirrors "prompts: read starters" — a starter prompt's user_id is null, so
-- the owner policy above never matches it.
create policy "prompt_versions: read starters" on public.prompt_versions
  for select using (
    exists (select 1 from public.prompts p where p.id = prompt_versions.prompt_id and p.is_starter)
  );

create index prompt_versions_prompt_id_idx on public.prompt_versions (prompt_id, version_no desc);

alter table public.prompts
  add column current_version_id uuid references public.prompt_versions (id) on delete set null;

-- =========================================================================
-- context_blocks — reusable pieces of the user's world, attached to many
-- prompt versions via prompt_version_contexts.
-- =========================================================================
create table public.context_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('company', 'product', 'customer', 'stack', 'audience', 'voice', 'glossary', 'snippet')),
  name text not null,
  body text not null default '',
  token_estimate integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.context_blocks enable row level security;
create policy "context_blocks: owner all" on public.context_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index context_blocks_user_id_kind_idx on public.context_blocks (user_id, kind);

create trigger context_blocks_set_updated_at
  before update on public.context_blocks
  for each row execute function public.set_updated_at();

-- =========================================================================
-- prompt_version_contexts — join table, no user_id column. RLS checks
-- ownership of the parent version, following the project_categories pattern.
-- =========================================================================
create table public.prompt_version_contexts (
  prompt_version_id uuid not null references public.prompt_versions (id) on delete cascade,
  context_block_id uuid not null references public.context_blocks (id) on delete cascade,
  position integer not null default 0,
  primary key (prompt_version_id, context_block_id)
);

alter table public.prompt_version_contexts enable row level security;
create policy "prompt_version_contexts: owner all" on public.prompt_version_contexts
  for all using (
    exists (
      select 1 from public.prompt_versions v
      where v.id = prompt_version_contexts.prompt_version_id
        and exists (select 1 from public.prompts p where p.id = v.prompt_id and p.user_id = auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.prompt_versions v
      where v.id = prompt_version_contexts.prompt_version_id
        and exists (select 1 from public.prompts p where p.id = v.prompt_id and p.user_id = auth.uid())
    )
  );

-- =========================================================================
-- prompt_runs — one use of a resolved prompt: variable values, output,
-- rating, critique tags. `output` stays null until the user pastes it back.
-- =========================================================================
create table public.prompt_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_version_id uuid not null references public.prompt_versions (id) on delete cascade,
  provider text not null default 'anthropic',
  model text,
  variable_values jsonb not null default '{}'::jsonb,
  resolved_prompt text not null,
  output text,
  rating smallint check (rating between 1 and 5),
  critique_tags text[] not null default '{}',
  latency_ms integer,
  created_at timestamptz not null default now()
);

alter table public.prompt_runs enable row level security;
create policy "prompt_runs: owner all" on public.prompt_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index prompt_runs_prompt_version_id_idx on public.prompt_runs (prompt_version_id, created_at desc);
create index prompt_runs_user_id_idx on public.prompt_runs (user_id, created_at desc);

alter table public.prompt_versions
  add constraint prompt_versions_created_from_run_id_fkey
  foreign key (created_from_run_id) references public.prompt_runs (id) on delete set null;

-- =========================================================================
-- critique_mappings — seeded reference: tag -> target block + patch
-- instruction. Referenced by tag string from prompt_runs.critique_tags with
-- no FK, so removing a mapping never orphans history.
-- =========================================================================
create table public.critique_mappings (
  tag text primary key,
  label text not null,
  target_block_type text not null,
  patch_instruction text not null,
  static_hint text
);

alter table public.critique_mappings enable row level security;
create policy "critique_mappings: read all" on public.critique_mappings
  for select using (true);

-- =========================================================================
-- prompt_block_refinements — what prompt_refinements should have been:
-- logged per block, not per whole-prompt paste.
-- =========================================================================
create table public.prompt_block_refinements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid references public.prompts (id) on delete set null,
  block_type text not null,
  before text not null,
  after text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.prompt_block_refinements enable row level security;
create policy "prompt_block_refinements: owner all" on public.prompt_block_refinements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index prompt_block_refinements_user_id_idx on public.prompt_block_refinements (user_id, created_at desc);

-- =========================================================================
-- prompt_refinements is write-only (nothing ever reads it back) and is
-- superseded by prompt_block_refinements above. Keep the historical rows
-- under a new name; the app stops writing to it as of this release.
-- =========================================================================
alter table public.prompt_refinements rename to prompt_refinements_legacy;

-- =========================================================================
-- rooms / room_members — v2 multiplayer tables with no application code
-- against them. `rooms` carries a public-read policy on an otherwise-unused
-- table, which is a liability rather than an asset. Drop both.
-- =========================================================================
drop table if exists public.room_members;
drop table if exists public.rooms;

-- =========================================================================
-- prompts search index, for the library
-- =========================================================================
create index prompts_search_idx on public.prompts
  using gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

-- =========================================================================
-- seed: frameworks (§4.4)
-- =========================================================================
insert into public.frameworks (key, name, acronym_expansion, source_url, slot_map) values
(
  'create',
  'CREATE',
  'Character, Request, Example, Adjustment, Type of output, Extras',
  'https://www.classcentral.com/report/prompt-engineering-frameworks/',
  '[
    {"slot": "character", "label": "Character", "block_type": "role", "required": true},
    {"slot": "request", "label": "Request", "block_type": "task", "required": true},
    {"slot": "example", "label": "Example", "block_type": "examples", "required": false},
    {"slot": "adjustment", "label": "Adjustment", "block_type": "constraints", "required": false},
    {"slot": "type_of_output", "label": "Type of output", "block_type": "format", "required": true},
    {"slot": "extras", "label": "Extras", "block_type": "guardrails", "required": false}
  ]'::jsonb
),
(
  'co-star',
  'CO-STAR',
  'Context, Objective, Style, Tone, Audience, Response',
  'https://towardsdatascience.com/how-i-won-singapores-gpt-4-prompt-engineering-competition-34c195a93d41',
  '[
    {"slot": "context", "label": "Context", "block_type": "context", "required": true},
    {"slot": "objective", "label": "Objective", "block_type": "task", "required": true},
    {"slot": "style", "label": "Style", "block_type": "constraints", "required": false},
    {"slot": "tone", "label": "Tone", "block_type": "guardrails", "required": false},
    {"slot": "audience", "label": "Audience", "block_type": "role", "required": false},
    {"slot": "response", "label": "Response", "block_type": "format", "required": true}
  ]'::jsonb
),
(
  'kernel',
  'KERNEL',
  'Knowledge, Engagement, Relevance, Nuance, Execution, Learning',
  'https://www.linkedin.com/pulse/kernel-framework-prompt-engineering',
  '[
    {"slot": "knowledge", "label": "Knowledge", "block_type": "context", "required": true},
    {"slot": "engagement", "label": "Engagement", "block_type": "role", "required": false},
    {"slot": "relevance", "label": "Relevance", "block_type": "task", "required": true},
    {"slot": "nuance", "label": "Nuance", "block_type": "constraints", "required": false},
    {"slot": "execution", "label": "Execution", "block_type": "format", "required": true},
    {"slot": "learning", "label": "Learning", "block_type": "guardrails", "required": false}
  ]'::jsonb
),
(
  'rtf',
  'RTF',
  'Role, Task, Format',
  'https://www.godofprompt.ai/blog/rtf-prompt-framework',
  '[
    {"slot": "role", "label": "Role", "block_type": "role", "required": true},
    {"slot": "task", "label": "Task", "block_type": "task", "required": true},
    {"slot": "format", "label": "Format", "block_type": "format", "required": true}
  ]'::jsonb
);

-- =========================================================================
-- seed: critique_mappings (§4.3)
-- =========================================================================
insert into public.critique_mappings (tag, label, target_block_type, patch_instruction, static_hint) values
('too_long', 'Too long', 'constraints', 'Add or tighten a length constraint so the output is materially shorter.', 'State a hard length limit — a word count or number of sections.'),
('too_generic', 'Too generic', 'context', 'Add concrete, specific detail from the user''s actual context; remove generic filler.', 'Add a specific example or real detail the model can anchor to.'),
('wrong_audience', 'Wrong audience', 'context', 'Restate who the output is for and adjust vocabulary and assumed knowledge accordingly.', 'Name the audience explicitly and their level of familiarity with the subject.'),
('missed_constraint', 'Missed a constraint', 'constraints', 'Add the missing constraint explicitly and make it unambiguous.', 'Constraints that are implied rather than stated get dropped — spell them out.'),
('wrong_format', 'Wrong format', 'format', 'Specify the exact output format required, with a concrete structure or example.', 'Name the format precisely: bullet list, table, JSON shape, heading structure.'),
('invented_facts', 'Invented facts', 'guardrails', 'Add an explicit instruction to only use facts given in context and to say so when information is missing.', 'Add a guardrail forbidding invention of facts not present in context.'),
('wrong_tone', 'Wrong tone', 'role', 'Adjust the role or voice description so the tone matches what was needed.', 'Describe the desired tone directly — formal, casual, terse, warm.');

-- =========================================================================
-- backfill: every existing prompt becomes a v1 version with a single task
-- block, so `body` keeps working as an alias for `current_version_id` for
-- one release. `is_starter` prompts don't exist yet, so this covers all rows.
-- =========================================================================
with backfilled as (
  insert into public.prompt_versions (prompt_id, version_no, blocks, variables, change_note)
  select
    id,
    1,
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'block_type', 'task',
        'framework_slot', null,
        'body', body,
        'state', 'locked',
        'order', 0
      )
    ),
    '[]'::jsonb,
    'Backfilled from the pre-Studio prompt body.'
  from public.prompts
  returning id, prompt_id
)
update public.prompts p
set current_version_id = b.id
from backfilled b
where b.prompt_id = p.id;
