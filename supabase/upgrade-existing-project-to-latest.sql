-- MERGEN AI existing-project upgrade
-- Use this on an existing Supabase project that may be behind on SQL updates.
-- It upgrades profile storage, community launch geography, survey rollout tracking,
-- triggers, and RLS to match the current app.
--
-- Note:
-- Existing surveys that do not yet have rollout timestamps are backfilled from `created_at`.
-- If you want currently-published older surveys to restart their rollout from "now"
-- instead, update `distribution_started_at` and `distribution_expires_at` manually after this runs.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('client', 'community')),
  email text not null,
  first_name text,
  last_name text,
  phone_number text,
  appearance text not null default 'light' check (appearance in ('light', 'dark')),
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists appearance text;
alter table public.profiles add column if not exists two_factor_enabled boolean;
alter table public.profiles add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz default timezone('utc', now());

update public.profiles p
set
  role = coalesce(nullif(p.role, ''), coalesce(u.raw_user_meta_data ->> 'role', 'community')),
  email = coalesce(nullif(p.email, ''), coalesce(u.email, '')),
  first_name = coalesce(p.first_name, u.raw_user_meta_data ->> 'first_name'),
  last_name = coalesce(p.last_name, u.raw_user_meta_data ->> 'last_name'),
  phone_number = coalesce(p.phone_number, u.raw_user_meta_data ->> 'phone_number'),
  appearance = coalesce(nullif(p.appearance, ''), u.raw_user_meta_data ->> 'appearance', 'light'),
  two_factor_enabled = coalesce(p.two_factor_enabled, (u.raw_user_meta_data ->> 'two_factor_enabled')::boolean, false),
  created_at = coalesce(p.created_at, timezone('utc', now())),
  updated_at = coalesce(p.updated_at, timezone('utc', now()))
from auth.users u
where u.id = p.id;

update public.profiles
set role = 'community'
where role is null or btrim(role) = '';

update public.profiles
set role = 'community'
where role not in ('client', 'community');

update public.profiles
set email = ''
where email is null;

update public.profiles
set appearance = 'light'
where appearance is null or btrim(appearance) = '';

update public.profiles
set appearance = 'light'
where appearance not in ('light', 'dark');

update public.profiles
set two_factor_enabled = false
where two_factor_enabled is null;

update public.profiles
set created_at = timezone('utc', now())
where created_at is null;

update public.profiles
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.profiles alter column role set default 'community';
alter table public.profiles alter column role set not null;
alter table public.profiles alter column email set default '';
alter table public.profiles alter column email set not null;
alter table public.profiles alter column appearance set default 'light';
alter table public.profiles alter column appearance set not null;
alter table public.profiles alter column two_factor_enabled set default false;
alter table public.profiles alter column two_factor_enabled set not null;
alter table public.profiles alter column created_at set default timezone('utc', now());
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set default timezone('utc', now());
alter table public.profiles alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('client', 'community'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_appearance_check'
  ) then
    alter table public.profiles
      add constraint profiles_appearance_check check (appearance in ('light', 'dark'));
  end if;
end
$$;

create table if not exists public.client_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  country text,
  educational_institution text,
  position text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.client_profiles add column if not exists country text;
alter table public.client_profiles add column if not exists educational_institution text;
alter table public.client_profiles add column if not exists position text;
alter table public.client_profiles add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.client_profiles add column if not exists updated_at timestamptz default timezone('utc', now());

update public.client_profiles
set created_at = timezone('utc', now())
where created_at is null;

update public.client_profiles
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.client_profiles alter column created_at set default timezone('utc', now());
alter table public.client_profiles alter column created_at set not null;
alter table public.client_profiles alter column updated_at set default timezone('utc', now());
alter table public.client_profiles alter column updated_at set not null;

create table if not exists public.community_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  country text,
  age_span text,
  gender text,
  employment_status text,
  industry text,
  salary_range text,
  educational_level text,
  field_of_study text,
  language_skills text[] not null default '{}',
  english_proficiency text,
  place_of_residence text,
  family_status text,
  household_size text,
  children_count text,
  interests text[] not null default '{}',
  car_count text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.community_profiles add column if not exists country text;
alter table public.community_profiles add column if not exists age_span text;
alter table public.community_profiles add column if not exists gender text;
alter table public.community_profiles add column if not exists employment_status text;
alter table public.community_profiles add column if not exists industry text;
alter table public.community_profiles add column if not exists salary_range text;
alter table public.community_profiles add column if not exists educational_level text;
alter table public.community_profiles add column if not exists field_of_study text;
alter table public.community_profiles add column if not exists language_skills text[] not null default '{}';
alter table public.community_profiles add column if not exists english_proficiency text;
alter table public.community_profiles add column if not exists place_of_residence text;
alter table public.community_profiles add column if not exists family_status text;
alter table public.community_profiles add column if not exists household_size text;
alter table public.community_profiles add column if not exists children_count text;
alter table public.community_profiles add column if not exists interests text[] not null default '{}';
alter table public.community_profiles add column if not exists car_count text;
alter table public.community_profiles add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.community_profiles add column if not exists updated_at timestamptz default timezone('utc', now());

update public.community_profiles
set language_skills = '{}'::text[]
where language_skills is null;

update public.community_profiles
set interests = '{}'::text[]
where interests is null;

update public.community_profiles
set created_at = timezone('utc', now())
where created_at is null;

update public.community_profiles
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.community_profiles alter column language_skills set default '{}';
alter table public.community_profiles alter column language_skills set not null;
alter table public.community_profiles alter column interests set default '{}';
alter table public.community_profiles alter column interests set not null;
alter table public.community_profiles alter column created_at set default timezone('utc', now());
alter table public.community_profiles alter column created_at set not null;
alter table public.community_profiles alter column updated_at set default timezone('utc', now());
alter table public.community_profiles alter column updated_at set not null;

create table if not exists public.community_launch_regions (
  id text primary key,
  label text not null unique,
  target_members integer not null check (target_members > 0)
);

create table if not exists public.community_launch_countries (
  country text primary key,
  region_id text not null references public.community_launch_regions (id) on delete cascade
);

insert into public.community_launch_regions (id, label, target_members)
values
  ('north_america', 'North America', 1500),
  ('latin_america', 'Latin America', 1000),
  ('western_europe', 'Western Europe', 1000),
  ('eastern_europe', 'Eastern Europe', 900),
  ('northern_europe', 'Northern Europe', 500),
  ('western_asia', 'Western Asia', 700),
  ('central_asia', 'Central Asia', 300),
  ('south_asia', 'South Asia', 1200),
  ('southeast_asia', 'Southeast Asia', 1000),
  ('eastern_asia', 'Eastern Asia', 800),
  ('oceania', 'Oceania', 400),
  ('north_africa', 'North Africa', 300),
  ('west_africa', 'West Africa', 200),
  ('east_africa', 'East Africa', 200)
on conflict (id) do update set
  label = excluded.label,
  target_members = excluded.target_members;

insert into public.community_launch_countries (country, region_id)
values
  ('United States', 'north_america'),
  ('Canada', 'north_america'),
  ('Brazil', 'latin_america'),
  ('Mexico', 'latin_america'),
  ('Argentina', 'latin_america'),
  ('Chile', 'latin_america'),
  ('Uruguay', 'latin_america'),
  ('Colombia', 'latin_america'),
  ('United Kingdom', 'western_europe'),
  ('Germany', 'western_europe'),
  ('France', 'western_europe'),
  ('Netherlands', 'western_europe'),
  ('Belgium', 'western_europe'),
  ('Poland', 'eastern_europe'),
  ('Czech Republic', 'eastern_europe'),
  ('Hungary', 'eastern_europe'),
  ('Romania', 'eastern_europe'),
  ('Slovenia', 'eastern_europe'),
  ('Serbia', 'eastern_europe'),
  ('Ukraine', 'eastern_europe'),
  ('Sweden', 'northern_europe'),
  ('Norway', 'northern_europe'),
  ('Denmark', 'northern_europe'),
  ('Finland', 'northern_europe'),
  ('Turkey', 'western_asia'),
  ('Azerbaijan', 'western_asia'),
  ('Georgia', 'western_asia'),
  ('Armenia', 'western_asia'),
  ('Saudi Arabia', 'western_asia'),
  ('United Arab Emirates', 'western_asia'),
  ('Israel', 'western_asia'),
  ('Jordan', 'western_asia'),
  ('Lebanon', 'western_asia'),
  ('Iraq', 'western_asia'),
  ('Iran', 'western_asia'),
  ('Kazakhstan', 'central_asia'),
  ('Uzbekistan', 'central_asia'),
  ('Kyrgyzstan', 'central_asia'),
  ('India', 'south_asia'),
  ('Pakistan', 'south_asia'),
  ('Bangladesh', 'south_asia'),
  ('Indonesia', 'southeast_asia'),
  ('Malaysia', 'southeast_asia'),
  ('Singapore', 'southeast_asia'),
  ('Thailand', 'southeast_asia'),
  ('Vietnam', 'southeast_asia'),
  ('Philippines', 'southeast_asia'),
  ('Japan', 'eastern_asia'),
  ('South Korea', 'eastern_asia'),
  ('Taiwan', 'eastern_asia'),
  ('Hong Kong', 'eastern_asia'),
  ('Australia', 'oceania'),
  ('New Zealand', 'oceania'),
  ('Egypt', 'north_africa'),
  ('Morocco', 'north_africa'),
  ('Algeria', 'north_africa'),
  ('Nigeria', 'west_africa'),
  ('Ghana', 'west_africa'),
  ('Senegal', 'west_africa'),
  ('Kenya', 'east_africa'),
  ('Tanzania', 'east_africa'),
  ('Ethiopia', 'east_africa')
on conflict (country) do update set
  region_id = excluded.region_id;

create index if not exists community_profiles_country_idx on public.community_profiles (country);
create unique index if not exists community_launch_countries_country_lower_idx on public.community_launch_countries (lower(country));

create table if not exists public.surveys (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  target_responses integer not null check (target_responses > 0),
  days_remaining integer not null default 3 check (days_remaining >= 0),
  description text not null default '',
  question_count integer,
  audience jsonb,
  questions jsonb not null default '[]'::jsonb,
  research_description text,
  research_scope text,
  hypothesis text,
  include_detailed_ai boolean not null default false,
  attachments jsonb,
  distribution_stage integer not null default 0 check (distribution_stage between 0 and 4),
  distribution_started_at timestamptz not null default timezone('utc', now()),
  distribution_last_sent_at timestamptz,
  distribution_completed_at timestamptz,
  distribution_window_days integer not null default 3 check (distribution_window_days > 0),
  distribution_expires_at timestamptz not null default timezone('utc', now()) + interval '3 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.surveys add column if not exists name text;
alter table public.surveys add column if not exists status text default 'published';
alter table public.surveys add column if not exists target_responses integer;
alter table public.surveys add column if not exists days_remaining integer default 3;
alter table public.surveys add column if not exists description text default '';
alter table public.surveys add column if not exists question_count integer;
alter table public.surveys add column if not exists audience jsonb;
alter table public.surveys add column if not exists questions jsonb default '[]'::jsonb;
alter table public.surveys add column if not exists research_description text;
alter table public.surveys add column if not exists research_scope text;
alter table public.surveys add column if not exists hypothesis text;
alter table public.surveys add column if not exists include_detailed_ai boolean default false;
alter table public.surveys add column if not exists attachments jsonb;
alter table public.surveys add column if not exists distribution_stage integer;
alter table public.surveys add column if not exists distribution_started_at timestamptz;
alter table public.surveys add column if not exists distribution_last_sent_at timestamptz;
alter table public.surveys add column if not exists distribution_completed_at timestamptz;
alter table public.surveys add column if not exists distribution_window_days integer;
alter table public.surveys add column if not exists distribution_expires_at timestamptz;
alter table public.surveys add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.surveys add column if not exists updated_at timestamptz default timezone('utc', now());

update public.surveys
set
  status = coalesce(nullif(status, ''), 'published'),
  days_remaining = coalesce(days_remaining, 3),
  description = coalesce(description, ''),
  questions = coalesce(questions, '[]'::jsonb),
  include_detailed_ai = coalesce(include_detailed_ai, false),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  status is null
  or days_remaining is null
  or description is null
  or questions is null
  or include_detailed_ai is null
  or created_at is null
  or updated_at is null;

update public.surveys
set status = 'published'
where status not in ('draft', 'published', 'archived');

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

alter table public.surveys alter column status set default 'published';
alter table public.surveys alter column days_remaining set default 3;
alter table public.surveys alter column description set default '';
alter table public.surveys alter column questions set default '[]'::jsonb;
alter table public.surveys alter column include_detailed_ai set default false;
alter table public.surveys alter column distribution_stage set default 0;
alter table public.surveys alter column distribution_started_at set default timezone('utc', now());
alter table public.surveys alter column distribution_window_days set default 3;
alter table public.surveys alter column distribution_expires_at set default timezone('utc', now()) + interval '3 days';
alter table public.surveys alter column created_at set default timezone('utc', now());
alter table public.surveys alter column updated_at set default timezone('utc', now());

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'status'
  ) then
    begin
      alter table public.surveys alter column status set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'days_remaining'
  ) then
    begin
      alter table public.surveys alter column days_remaining set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'description'
  ) then
    begin
      alter table public.surveys alter column description set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'questions'
  ) then
    begin
      alter table public.surveys alter column questions set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'include_detailed_ai'
  ) then
    begin
      alter table public.surveys alter column include_detailed_ai set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'distribution_stage'
  ) then
    begin
      alter table public.surveys alter column distribution_stage set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'distribution_started_at'
  ) then
    begin
      alter table public.surveys alter column distribution_started_at set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'distribution_window_days'
  ) then
    begin
      alter table public.surveys alter column distribution_window_days set not null;
    exception when others then
      null;
    end;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'surveys' and column_name = 'distribution_expires_at'
  ) then
    begin
      alter table public.surveys alter column distribution_expires_at set not null;
    exception when others then
      null;
    end;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'surveys_status_check'
  ) then
    alter table public.surveys
      add constraint surveys_status_check check (status in ('draft', 'published', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'surveys_target_responses_check'
  ) then
    alter table public.surveys
      add constraint surveys_target_responses_check check (target_responses > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'surveys_days_remaining_check'
  ) then
    alter table public.surveys
      add constraint surveys_days_remaining_check check (days_remaining >= 0);
  end if;

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

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id bigint not null references public.surveys (id) on delete cascade,
  respondent_id uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  completion_time_seconds integer not null check (completion_time_seconds > 0),
  trust_score integer not null check (trust_score between 0 and 100),
  earned_credits integer not null check (earned_credits >= 0),
  summary text not null default '',
  answers jsonb not null default '[]'::jsonb,
  unique (survey_id, respondent_id)
);

alter table public.survey_responses add column if not exists submitted_at timestamptz default timezone('utc', now());
alter table public.survey_responses add column if not exists completion_time_seconds integer;
alter table public.survey_responses add column if not exists trust_score integer;
alter table public.survey_responses add column if not exists earned_credits integer;
alter table public.survey_responses add column if not exists summary text default '';
alter table public.survey_responses add column if not exists answers jsonb default '[]'::jsonb;

update public.survey_responses
set
  summary = coalesce(summary, ''),
  answers = coalesce(answers, '[]'::jsonb),
  submitted_at = coalesce(submitted_at, timezone('utc', now()))
where summary is null or answers is null or submitted_at is null;

alter table public.survey_responses alter column submitted_at set default timezone('utc', now());
alter table public.survey_responses alter column summary set default '';
alter table public.survey_responses alter column answers set default '[]'::jsonb;

create table if not exists public.welcome_survey_completions (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null unique references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  completion_time_seconds integer not null check (completion_time_seconds > 0),
  earned_credits integer not null default 50 check (earned_credits = 50),
  summary text not null default '',
  answers jsonb not null default '[]'::jsonb
);

alter table public.welcome_survey_completions add column if not exists submitted_at timestamptz default timezone('utc', now());
alter table public.welcome_survey_completions add column if not exists completion_time_seconds integer;
alter table public.welcome_survey_completions add column if not exists earned_credits integer;
alter table public.welcome_survey_completions add column if not exists summary text default '';
alter table public.welcome_survey_completions add column if not exists answers jsonb default '[]'::jsonb;

alter table public.welcome_survey_completions drop constraint if exists welcome_survey_completions_earned_credits_check;

update public.welcome_survey_completions
set
  earned_credits = 50,
  summary = coalesce(summary, ''),
  answers = coalesce(answers, '[]'::jsonb),
  submitted_at = coalesce(submitted_at, timezone('utc', now()))
where earned_credits is distinct from 50 or summary is null or answers is null or submitted_at is null;

alter table public.welcome_survey_completions alter column submitted_at set default timezone('utc', now());
alter table public.welcome_survey_completions alter column earned_credits set default 50;
alter table public.welcome_survey_completions alter column summary set default '';
alter table public.welcome_survey_completions alter column answers set default '[]'::jsonb;
alter table public.welcome_survey_completions
  add constraint welcome_survey_completions_earned_credits_check check (earned_credits = 50);

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

create table if not exists public.telegram_notification_subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone_number text not null,
  phone_number_normalized text not null,
  telegram_chat_id text not null unique,
  telegram_user_id text,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  notifications_enabled boolean not null default true,
  linked_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz not null default timezone('utc', now()),
  last_notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.telegram_notification_subscriptions add column if not exists phone_number text;
alter table public.telegram_notification_subscriptions add column if not exists phone_number_normalized text;
alter table public.telegram_notification_subscriptions add column if not exists telegram_chat_id text;
alter table public.telegram_notification_subscriptions add column if not exists telegram_user_id text;
alter table public.telegram_notification_subscriptions add column if not exists telegram_username text;
alter table public.telegram_notification_subscriptions add column if not exists telegram_first_name text;
alter table public.telegram_notification_subscriptions add column if not exists telegram_last_name text;
alter table public.telegram_notification_subscriptions add column if not exists notifications_enabled boolean default true;
alter table public.telegram_notification_subscriptions add column if not exists linked_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions add column if not exists verified_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions add column if not exists last_notified_at timestamptz;
alter table public.telegram_notification_subscriptions add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions add column if not exists updated_at timestamptz default timezone('utc', now());

update public.telegram_notification_subscriptions
set phone_number_normalized = case
  when coalesce(phone_number, '') = '' then ''
  when regexp_replace(phone_number, '\D', '', 'g') like '00%' then substring(regexp_replace(phone_number, '\D', '', 'g') from 3)
  else regexp_replace(phone_number, '\D', '', 'g')
end
where phone_number_normalized is null or btrim(phone_number_normalized) = '';

update public.telegram_notification_subscriptions
set notifications_enabled = true
where notifications_enabled is null;

update public.telegram_notification_subscriptions
set linked_at = coalesce(linked_at, verified_at, created_at, timezone('utc', now()))
where linked_at is null;

update public.telegram_notification_subscriptions
set verified_at = coalesce(verified_at, linked_at, created_at, timezone('utc', now()))
where verified_at is null;

update public.telegram_notification_subscriptions
set created_at = timezone('utc', now())
where created_at is null;

update public.telegram_notification_subscriptions
set updated_at = timezone('utc', now())
where updated_at is null;

alter table public.telegram_notification_subscriptions alter column notifications_enabled set default true;
alter table public.telegram_notification_subscriptions alter column linked_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions alter column verified_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions alter column created_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions alter column updated_at set default timezone('utc', now());

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  phone_number text not null,
  phone_number_normalized text not null,
  telegram_chat_id text,
  telegram_user_id text,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

alter table public.telegram_link_tokens add column if not exists user_id uuid;
alter table public.telegram_link_tokens add column if not exists phone_number text;
alter table public.telegram_link_tokens add column if not exists phone_number_normalized text;
alter table public.telegram_link_tokens add column if not exists telegram_chat_id text;
alter table public.telegram_link_tokens add column if not exists telegram_user_id text;
alter table public.telegram_link_tokens add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.telegram_link_tokens add column if not exists expires_at timestamptz;
alter table public.telegram_link_tokens add column if not exists consumed_at timestamptz;

update public.telegram_link_tokens
set created_at = timezone('utc', now())
where created_at is null;

alter table public.telegram_link_tokens alter column created_at set default timezone('utc', now());

create index if not exists surveys_distribution_expires_at_idx on public.surveys (status, distribution_expires_at);
create index if not exists survey_notifications_survey_id_idx on public.survey_notifications (survey_id);
create index if not exists survey_notifications_recipient_id_idx on public.survey_notifications (recipient_id);
create unique index if not exists telegram_notification_subscriptions_chat_id_idx on public.telegram_notification_subscriptions (telegram_chat_id);
create index if not exists telegram_link_tokens_user_id_idx on public.telegram_link_tokens (user_id);
create index if not exists telegram_link_tokens_chat_id_idx on public.telegram_link_tokens (telegram_chat_id);
create index if not exists telegram_link_tokens_expires_at_idx on public.telegram_link_tokens (expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.enforce_community_launch_country()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_country text;
  canonical_country text;
  matched_region_id text;
  matched_region_label text;
  matched_region_target integer;
  current_region_members integer;
begin
  normalized_country := nullif(btrim(new.country), '');

  if normalized_country is null then
    return new;
  end if;

  select
    clc.country,
    clr.id,
    clr.label,
    clr.target_members
  into
    canonical_country,
    matched_region_id,
    matched_region_label,
    matched_region_target
  from public.community_launch_countries clc
  join public.community_launch_regions clr
    on clr.id = clc.region_id
  where lower(clc.country) = lower(normalized_country)
  limit 1;

  if matched_region_id is null then
    raise exception 'Community sign-up is currently limited to the first-stage launch countries.';
  end if;

  select count(*)
  into current_region_members
  from public.community_profiles cp
  join public.community_launch_countries clc
    on lower(clc.country) = lower(cp.country)
  where clc.region_id = matched_region_id
    and cp.id <> new.id;

  if current_region_members >= matched_region_target then
    raise exception 'Community allocation is full for %.', matched_region_label;
  end if;

  new.country := canonical_country;
  return new;
end;
$$;

create or replace function public.enforce_survey_audience_countries()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  audience_country text;
begin
  if new.audience is null or coalesce(jsonb_typeof(new.audience -> 'countries'), '') <> 'array' then
    return new;
  end if;

  for audience_country in
    select jsonb_array_elements_text(new.audience -> 'countries')
  loop
    if nullif(btrim(audience_country), '') is null then
      continue;
    end if;

    if not exists (
      select 1
      from public.community_launch_countries
      where lower(country) = lower(audience_country)
    ) then
      raise exception 'Survey audience countries must stay within the first-stage community rollout.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_profiles_updated_at on public.client_profiles;
create trigger set_client_profiles_updated_at
before update on public.client_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_community_profiles_updated_at on public.community_profiles;
create trigger set_community_profiles_updated_at
before update on public.community_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_surveys_updated_at on public.surveys;
create trigger set_surveys_updated_at
before update on public.surveys
for each row
execute function public.set_updated_at();

drop trigger if exists set_telegram_notification_subscriptions_updated_at on public.telegram_notification_subscriptions;
create trigger set_telegram_notification_subscriptions_updated_at
before update on public.telegram_notification_subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists enforce_community_launch_country on public.community_profiles;
create trigger enforce_community_launch_country
before insert or update of country on public.community_profiles
for each row
execute function public.enforce_community_launch_country();

drop trigger if exists enforce_survey_audience_countries on public.surveys;
create trigger enforce_survey_audience_countries
before insert or update of audience on public.surveys
for each row
execute function public.enforce_survey_audience_countries();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_interests text[];
  user_language_skills text[];
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'community');
  user_interests :=
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'interests') = 'array' then
        array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'interests'))
      else
        '{}'::text[]
    end;
  user_language_skills :=
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'language_skills') = 'array' then
        array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'language_skills'))
      else
        '{}'::text[]
    end;

  insert into public.profiles (
    id,
    role,
    email,
    first_name,
    last_name,
    phone_number,
    appearance,
    two_factor_enabled
  )
  values (
    new.id,
    user_role,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone_number',
    coalesce(new.raw_user_meta_data ->> 'appearance', 'light'),
    coalesce((new.raw_user_meta_data ->> 'two_factor_enabled')::boolean, false)
  )
  on conflict (id) do update set
    role = excluded.role,
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone_number = excluded.phone_number,
    appearance = excluded.appearance,
    two_factor_enabled = excluded.two_factor_enabled;

  if user_role = 'client' then
    insert into public.client_profiles (
      id,
      country,
      educational_institution,
      position
    )
    values (
      new.id,
      new.raw_user_meta_data ->> 'country',
      new.raw_user_meta_data ->> 'educational_institution',
      new.raw_user_meta_data ->> 'position'
    )
    on conflict (id) do update set
      country = excluded.country,
      educational_institution = excluded.educational_institution,
      position = excluded.position;
  else
    insert into public.community_profiles (
      id,
      country,
      age_span,
      gender,
      employment_status,
      industry,
      salary_range,
      educational_level,
      field_of_study,
      language_skills,
      english_proficiency,
      place_of_residence,
      family_status,
      household_size,
      children_count,
      interests,
      car_count
    )
    values (
      new.id,
      new.raw_user_meta_data ->> 'country',
      new.raw_user_meta_data ->> 'age_span',
      new.raw_user_meta_data ->> 'gender',
      new.raw_user_meta_data ->> 'employment_status',
      new.raw_user_meta_data ->> 'industry',
      new.raw_user_meta_data ->> 'salary_range',
      new.raw_user_meta_data ->> 'educational_level',
      new.raw_user_meta_data ->> 'field_of_study',
      user_language_skills,
      new.raw_user_meta_data ->> 'english_proficiency',
      new.raw_user_meta_data ->> 'place_of_residence',
      new.raw_user_meta_data ->> 'family_status',
      new.raw_user_meta_data ->> 'household_size',
      new.raw_user_meta_data ->> 'children_count',
      user_interests,
      new.raw_user_meta_data ->> 'car_count'
    )
    on conflict (id) do update set
      country = excluded.country,
      age_span = excluded.age_span,
      gender = excluded.gender,
      employment_status = excluded.employment_status,
      industry = excluded.industry,
      salary_range = excluded.salary_range,
      educational_level = excluded.educational_level,
      field_of_study = excluded.field_of_study,
      language_skills = excluded.language_skills,
      english_proficiency = excluded.english_proficiency,
      place_of_residence = excluded.place_of_residence,
      family_status = excluded.family_status,
      household_size = excluded.household_size,
      children_count = excluded.children_count,
      interests = excluded.interests,
      car_count = excluded.car_count;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  role,
  email,
  first_name,
  last_name,
  phone_number,
  appearance,
  two_factor_enabled,
  created_at,
  updated_at
)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'role', 'community'),
  coalesce(u.email, ''),
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'phone_number',
  coalesce(u.raw_user_meta_data ->> 'appearance', 'light'),
  coalesce((u.raw_user_meta_data ->> 'two_factor_enabled')::boolean, false),
  coalesce(u.created_at, timezone('utc', now())),
  timezone('utc', now())
from auth.users u
on conflict (id) do update set
  role = coalesce(nullif(public.profiles.role, ''), excluded.role),
  email = case when excluded.email <> '' then excluded.email else public.profiles.email end,
  first_name = coalesce(public.profiles.first_name, excluded.first_name),
  last_name = coalesce(public.profiles.last_name, excluded.last_name),
  phone_number = coalesce(public.profiles.phone_number, excluded.phone_number),
  appearance = coalesce(nullif(public.profiles.appearance, ''), excluded.appearance),
  two_factor_enabled = coalesce(public.profiles.two_factor_enabled, excluded.two_factor_enabled),
  updated_at = timezone('utc', now());

insert into public.client_profiles (
  id,
  country,
  educational_institution,
  position
)
select
  source.id,
  nullif(source.profile_json ->> 'country', ''),
  nullif(source.profile_json ->> 'educational_institution', ''),
  nullif(source.profile_json ->> 'position', '')
from (
  select p.id, p.role, to_jsonb(p) as profile_json
  from public.profiles p
) as source
where source.role = 'client'
on conflict (id) do update set
  country = coalesce(public.client_profiles.country, excluded.country),
  educational_institution = coalesce(public.client_profiles.educational_institution, excluded.educational_institution),
  position = coalesce(public.client_profiles.position, excluded.position);

insert into public.community_profiles (
  id,
  country,
  age_span,
  gender,
  employment_status,
  industry,
  salary_range,
  educational_level,
  field_of_study,
  language_skills,
  english_proficiency,
  place_of_residence,
  family_status,
  household_size,
  children_count,
  interests,
  car_count
)
select
  source.id,
  nullif(source.profile_json ->> 'country', ''),
  nullif(source.profile_json ->> 'age_span', ''),
  nullif(source.profile_json ->> 'gender', ''),
  nullif(source.profile_json ->> 'employment_status', ''),
  nullif(source.profile_json ->> 'industry', ''),
  nullif(source.profile_json ->> 'salary_range', ''),
  nullif(source.profile_json ->> 'educational_level', ''),
  nullif(source.profile_json ->> 'field_of_study', ''),
  case
    when jsonb_typeof(source.profile_json -> 'language_skills') = 'array' then
      array(select jsonb_array_elements_text(source.profile_json -> 'language_skills'))
    else
      '{}'::text[]
  end,
  nullif(source.profile_json ->> 'english_proficiency', ''),
  nullif(source.profile_json ->> 'place_of_residence', ''),
  nullif(source.profile_json ->> 'family_status', ''),
  nullif(source.profile_json ->> 'household_size', ''),
  nullif(source.profile_json ->> 'children_count', ''),
  case
    when jsonb_typeof(source.profile_json -> 'interests') = 'array' then
      array(select jsonb_array_elements_text(source.profile_json -> 'interests'))
    else
      '{}'::text[]
  end,
  nullif(source.profile_json ->> 'car_count', '')
from (
  select p.id, p.role, to_jsonb(p) as profile_json
  from public.profiles p
) as source
where source.role = 'community'
on conflict (id) do update set
  country = coalesce(public.community_profiles.country, excluded.country),
  age_span = coalesce(public.community_profiles.age_span, excluded.age_span),
  gender = coalesce(public.community_profiles.gender, excluded.gender),
  employment_status = coalesce(public.community_profiles.employment_status, excluded.employment_status),
  industry = coalesce(public.community_profiles.industry, excluded.industry),
  salary_range = coalesce(public.community_profiles.salary_range, excluded.salary_range),
  educational_level = coalesce(public.community_profiles.educational_level, excluded.educational_level),
  field_of_study = coalesce(public.community_profiles.field_of_study, excluded.field_of_study),
  language_skills = case
    when coalesce(array_length(public.community_profiles.language_skills, 1), 0) > 0 then public.community_profiles.language_skills
    else excluded.language_skills
  end,
  english_proficiency = coalesce(public.community_profiles.english_proficiency, excluded.english_proficiency),
  place_of_residence = coalesce(public.community_profiles.place_of_residence, excluded.place_of_residence),
  family_status = coalesce(public.community_profiles.family_status, excluded.family_status),
  household_size = coalesce(public.community_profiles.household_size, excluded.household_size),
  children_count = coalesce(public.community_profiles.children_count, excluded.children_count),
  interests = case
    when coalesce(array_length(public.community_profiles.interests, 1), 0) > 0 then public.community_profiles.interests
    else excluded.interests
  end,
  car_count = coalesce(public.community_profiles.car_count, excluded.car_count);

alter table public.profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_launch_regions enable row level security;
alter table public.community_launch_countries enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;
alter table public.welcome_survey_completions enable row level security;
alter table public.survey_notifications enable row level security;
alter table public.telegram_notification_subscriptions enable row level security;
alter table public.telegram_link_tokens enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view their own client profile" on public.client_profiles;
create policy "Users can view their own client profile"
on public.client_profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own client profile" on public.client_profiles;
create policy "Users can insert their own client profile"
on public.client_profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own client profile" on public.client_profiles;
create policy "Users can update their own client profile"
on public.client_profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can view their own community profile" on public.community_profiles;
create policy "Users can view their own community profile"
on public.community_profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert their own community profile" on public.community_profiles;
create policy "Users can insert their own community profile"
on public.community_profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own community profile" on public.community_profiles;
create policy "Users can update their own community profile"
on public.community_profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Anyone can view community launch regions" on public.community_launch_regions;
create policy "Anyone can view community launch regions"
on public.community_launch_regions
for select
using (true);

drop policy if exists "Anyone can view community launch countries" on public.community_launch_countries;
create policy "Anyone can view community launch countries"
on public.community_launch_countries
for select
using (true);

drop policy if exists "Users can view their own telegram subscription" on public.telegram_notification_subscriptions;
create policy "Users can view their own telegram subscription"
on public.telegram_notification_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Clients can view their own surveys" on public.surveys;
create policy "Clients can view their own surveys"
on public.surveys
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'client'
  )
);

drop policy if exists "Clients can create their own surveys" on public.surveys;
create policy "Clients can create their own surveys"
on public.surveys
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'client'
  )
);

drop policy if exists "Clients can update their own surveys" on public.surveys;
create policy "Clients can update their own surveys"
on public.surveys
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'client'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'client'
  )
);

drop policy if exists "Clients can delete their own surveys" on public.surveys;

drop policy if exists "Community members can view published surveys" on public.surveys;
create policy "Community members can view published surveys"
on public.surveys
for select
using (
  status = 'published'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'community'
  )
);

drop policy if exists "Survey owners can view survey responses" on public.survey_responses;
create policy "Survey owners can view survey responses"
on public.survey_responses
for select
using (
  respondent_id = auth.uid()
  or exists (
    select 1
    from public.surveys
    where id = survey_id and user_id = auth.uid()
  )
);

drop policy if exists "Community members can submit survey responses" on public.survey_responses;
create policy "Community members can submit survey responses"
on public.survey_responses
for insert
with check (
  respondent_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'community'
  )
  and exists (
    select 1
    from public.surveys
    where id = survey_id and status = 'published'
  )
);

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
