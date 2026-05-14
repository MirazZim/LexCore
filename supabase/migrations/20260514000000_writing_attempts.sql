-- writing_attempts: persisted CREI drill submissions (one row per graded attempt).
--
-- This DDL was applied out-of-band via the Supabase dashboard before this
-- migration file existed. After linking the remote project, run:
--   supabase migration repair --status applied 20260514000000
-- so the migration tracker reflects reality and this file isn't replayed.

create table public.writing_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  drill_type text not null default 'crei',
  prompt text not null,
  prompt_meta jsonb null,
  user_text text not null,
  word_count integer null,
  band_task_response numeric(3,1) null check (band_task_response is null or band_task_response between 0 and 9),
  band_coherence    numeric(3,1) null check (band_coherence    is null or band_coherence    between 0 and 9),
  band_lexical      numeric(3,1) null check (band_lexical      is null or band_lexical      between 0 and 9),
  band_grammar      numeric(3,1) null check (band_grammar      is null or band_grammar      between 0 and 9),
  band_overall      numeric(3,1) null check (band_overall      is null or band_overall      between 0 and 9),
  feedback jsonb null,
  flagged_issues text[] null,
  created_at timestamp with time zone null default now(),
  constraint writing_attempts_pkey primary key (id),
  constraint writing_attempts_user_id_fkey foreign key (user_id) references auth.users(id)
) tablespace pg_default;

create index if not exists writing_attempts_user_created_idx
  on public.writing_attempts (user_id, created_at desc);

alter table public.writing_attempts enable row level security;

create policy "writing_attempts: select own"
  on public.writing_attempts
  for select
  using (auth.uid() = user_id);

create policy "writing_attempts: insert own"
  on public.writing_attempts
  for insert
  with check (auth.uid() = user_id);
