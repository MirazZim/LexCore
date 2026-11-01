-- daily_clears: one row per day the user cleared every due word. Each row is
-- a trophy on the Achievements page; the quote is stored so a trophy keeps
-- the words it was awarded with.

create table public.daily_clears (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  -- Local calendar day of the clear (YYYY-MM-DD, see lib/streak dateKey)
  day text not null,
  words_cleared integer not null,
  accuracy integer not null,
  quote text not null,
  quote_author text not null,
  created_at timestamp with time zone null default now(),
  constraint daily_clears_pkey primary key (id),
  constraint daily_clears_user_id_fkey foreign key (user_id) references auth.users(id),
  constraint daily_clears_user_day_key unique (user_id, day)
) tablespace pg_default;

alter table public.daily_clears enable row level security;

create policy "daily_clears: select own"
  on public.daily_clears
  for select
  using (auth.uid() = user_id);

create policy "daily_clears: insert own"
  on public.daily_clears
  for insert
  with check (auth.uid() = user_id);
