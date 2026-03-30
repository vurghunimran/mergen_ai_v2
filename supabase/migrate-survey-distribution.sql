alter table public.surveys add column if not exists distribution_stage integer;
alter table public.surveys add column if not exists distribution_started_at timestamptz;
alter table public.surveys add column if not exists distribution_last_sent_at timestamptz;
alter table public.surveys add column if not exists distribution_completed_at timestamptz;
alter table public.surveys add column if not exists distribution_window_days integer;
alter table public.surveys add column if not exists distribution_expires_at timestamptz;

update public.surveys
set distribution_window_days = case
  when target_responses >= 1000 then 7
  when target_responses >= 500 then 5
  else 3
end
where distribution_window_days is null;

update public.surveys
set distribution_stage = 0
where distribution_stage is null;

update public.surveys
set distribution_started_at = created_at
where distribution_started_at is null;

update public.surveys
set distribution_expires_at = distribution_started_at + make_interval(days => distribution_window_days)
where distribution_expires_at is null;

alter table public.surveys alter column distribution_stage set default 0;
alter table public.surveys alter column distribution_stage set not null;
alter table public.surveys alter column distribution_started_at set default timezone('utc', now());
alter table public.surveys alter column distribution_started_at set not null;
alter table public.surveys alter column distribution_window_days set default 3;
alter table public.surveys alter column distribution_window_days set not null;
alter table public.surveys alter column distribution_expires_at set default timezone('utc', now()) + interval '3 days';
alter table public.surveys alter column distribution_expires_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'surveys_distribution_stage_check'
  ) then
    alter table public.surveys
      add constraint surveys_distribution_stage_check check (distribution_stage between 0 and 4);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'surveys_distribution_window_days_check'
  ) then
    alter table public.surveys
      add constraint surveys_distribution_window_days_check check (distribution_window_days > 0);
  end if;
end
$$;

create table if not exists public.survey_notifications (
  id uuid primary key default gen_random_uuid(),
  survey_id bigint not null references public.surveys (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  recipient_email text not null,
  stage integer not null check (stage between 1 and 4),
  sent_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (survey_id, recipient_id)
);

create index if not exists surveys_distribution_expires_at_idx on public.surveys (status, distribution_expires_at);
create index if not exists survey_notifications_survey_id_idx on public.survey_notifications (survey_id);
create index if not exists survey_notifications_recipient_id_idx on public.survey_notifications (recipient_id);

alter table public.survey_notifications enable row level security;
