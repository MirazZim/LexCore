-- Learner memory for the AI coach.
--
-- learner_notes: one-line observations the scoring tasks make about the
-- learner ("drops 'the' before institutions"). Written by the llm-proxy edge
-- function with the learner's own token, so the usual own-row policies apply.
-- learner_profiles: the running summary those notes are merged into every
-- ten notes; it is what later prompts read instead of the raw notes.
-- words.memory_technique: which memory-trick technique a word was saved with,
-- so the coach can learn which techniques actually stick for this learner.

create table public.learner_notes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  -- 'sentence' (Generation Lab scoring) or 'writing' (Writing Lab grading)
  source text not null,
  -- Target word the note is about, when there is one
  word text null,
  note text not null,
  -- Set once the note has been merged into learner_profiles.summary
  compacted boolean not null default false,
  created_at timestamp with time zone null default now(),
  constraint learner_notes_pkey primary key (id),
  constraint learner_notes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
) tablespace pg_default;

create index if not exists learner_notes_user_created_idx
  on public.learner_notes (user_id, created_at desc);

alter table public.learner_notes enable row level security;

create policy "learner_notes: select own"
  on public.learner_notes
  for select
  using (auth.uid() = user_id);

create policy "learner_notes: insert own"
  on public.learner_notes
  for insert
  with check (auth.uid() = user_id);

create policy "learner_notes: update own"
  on public.learner_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.learner_profiles (
  user_id uuid not null,
  summary text not null,
  updated_at timestamp with time zone null default now(),
  constraint learner_profiles_pkey primary key (user_id),
  constraint learner_profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
) tablespace pg_default;

alter table public.learner_profiles enable row level security;

create policy "learner_profiles: select own"
  on public.learner_profiles
  for select
  using (auth.uid() = user_id);

create policy "learner_profiles: insert own"
  on public.learner_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "learner_profiles: update own"
  on public.learner_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.words add column if not exists memory_technique text null;
