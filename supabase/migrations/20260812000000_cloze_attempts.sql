-- cloze_attempts: persisted Context Theater / FIFA goalpost spelling attempts
-- (one row per cloze answer submitted, right or wrong).

create table public.cloze_attempts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  word_id uuid not null,
  user_answer text not null,
  was_correct boolean not null,
  created_at timestamp with time zone null default now(),
  constraint cloze_attempts_pkey primary key (id),
  constraint cloze_attempts_user_id_fkey foreign key (user_id) references auth.users(id),
  constraint cloze_attempts_word_id_fkey foreign key (word_id) references public.words(id)
) tablespace pg_default;

create index if not exists cloze_attempts_user_created_idx
  on public.cloze_attempts (user_id, created_at desc);

create index if not exists cloze_attempts_word_idx
  on public.cloze_attempts (word_id);

alter table public.cloze_attempts enable row level security;

create policy "cloze_attempts: select own"
  on public.cloze_attempts
  for select
  using (auth.uid() = user_id);

create policy "cloze_attempts: insert own"
  on public.cloze_attempts
  for insert
  with check (auth.uid() = user_id);
