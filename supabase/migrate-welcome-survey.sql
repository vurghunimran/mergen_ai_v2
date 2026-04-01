create table if not exists public.welcome_survey_completions (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null unique references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  completion_time_seconds integer not null check (completion_time_seconds > 0),
  earned_credits integer not null default 50 check (earned_credits = 50),
  summary text not null default '',
  answers jsonb not null default '[]'::jsonb
);

alter table public.welcome_survey_completions drop constraint if exists welcome_survey_completions_earned_credits_check;

update public.welcome_survey_completions
set earned_credits = 50
where earned_credits is distinct from 50;

alter table public.welcome_survey_completions alter column earned_credits set default 50;
alter table public.welcome_survey_completions
  add constraint welcome_survey_completions_earned_credits_check check (earned_credits = 50);

alter table public.welcome_survey_completions enable row level security;

drop policy if exists "Community members can view their own welcome survey completion" on public.welcome_survey_completions;
create policy "Community members can view their own welcome survey completion"
on public.welcome_survey_completions
for select
using (respondent_id = auth.uid());

drop policy if exists "Community members can submit their own welcome survey completion" on public.welcome_survey_completions;
create policy "Community members can submit their own welcome survey completion"
on public.welcome_survey_completions
for insert
with check (
  respondent_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'community'
  )
);
