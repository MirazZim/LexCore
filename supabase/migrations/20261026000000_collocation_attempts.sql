-- collocation_attempts: one row per Collocation Forge challenge solved.
-- was_correct = solved on the FIRST pick. Drives which phrases resurface first
-- ("missed last time") and whether mature words need a repair round at all.

create table public.collocation_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  word_id uuid not null,
  collocation_id uuid not null,
  was_correct boolean not null,
  -- First wrong option picked, if any (useful for spotting confusions like make/do)
  wrong_pick text null,
  created_at timestamp with time zone null default now(),
  constraint collocation_attempts_pkey primary key (id),
  constraint collocation_attempts_user_id_fkey foreign key (user_id) references auth.users(id),
  constraint collocation_attempts_word_id_fkey foreign key (word_id) references public.words(id) on delete cascade,
  constraint collocation_attempts_collocation_id_fkey foreign key (collocation_id) references public.word_collocations(id) on delete cascade
) tablespace pg_default;

create index if not exists collocation_attempts_user_word_idx
  on public.collocation_attempts (user_id, word_id, created_at desc);

alter table public.collocation_attempts enable row level security;

create policy "collocation_attempts: select own"
  on public.collocation_attempts
  for select
  using (auth.uid() = user_id);

create policy "collocation_attempts: insert own"
  on public.collocation_attempts
  for insert
  with check (auth.uid() = user_id);
