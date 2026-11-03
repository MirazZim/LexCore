-- Lets learners wipe what the coach remembers about them (Progress page →
-- "What your coach knows" → Clear).

create policy "learner_notes: delete own"
  on public.learner_notes
  for delete
  using (auth.uid() = user_id);

create policy "learner_profiles: delete own"
  on public.learner_profiles
  for delete
  using (auth.uid() = user_id);
