create extension if not exists pgcrypto;

create table if not exists public.client_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  country text,
  educational_institution text,
  position text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

alter table public.community_profiles add column if not exists employment_status text;
alter table public.community_profiles add column if not exists industry text;
alter table public.community_profiles add column if not exists field_of_study text;
alter table public.community_profiles add column if not exists language_skills text[] not null default '{}';
alter table public.community_profiles add column if not exists english_proficiency text;
alter table public.community_profiles add column if not exists household_size text;
alter table public.community_profiles add column if not exists children_count text;

alter table public.profiles add column if not exists employment_status text;
alter table public.profiles add column if not exists industry text;
alter table public.profiles add column if not exists field_of_study text;
alter table public.profiles add column if not exists language_skills text[] not null default '{}';
alter table public.profiles add column if not exists english_proficiency text;
alter table public.profiles add column if not exists household_size text;
alter table public.profiles add column if not exists children_count text;

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
  days_remaining integer not null default 14 check (days_remaining >= 0),
  description text not null default '',
  question_count integer,
  audience jsonb,
  questions jsonb not null default '[]'::jsonb,
  research_description text,
  research_scope text,
  hypothesis text,
  include_detailed_ai boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

  update public.profiles
  set
    role = user_role,
    email = coalesce(new.email, ''),
    first_name = new.raw_user_meta_data ->> 'first_name',
    last_name = new.raw_user_meta_data ->> 'last_name',
    phone_number = new.raw_user_meta_data ->> 'phone_number',
    appearance = coalesce(new.raw_user_meta_data ->> 'appearance', 'light'),
    two_factor_enabled = coalesce((new.raw_user_meta_data ->> 'two_factor_enabled')::boolean, false)
  where id = new.id;

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

insert into public.client_profiles (
  id,
  country,
  educational_institution,
  position
)
select
  id,
  country,
  educational_institution,
  position
from public.profiles
where role = 'client'
on conflict (id) do update set
  country = excluded.country,
  educational_institution = excluded.educational_institution,
  position = excluded.position;

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
  id,
  country,
  age_span,
  gender,
  employment_status,
  industry,
  salary_range,
  educational_level,
  field_of_study,
  coalesce(language_skills, '{}'::text[]),
  english_proficiency,
  place_of_residence,
  family_status,
  household_size,
  children_count,
  coalesce(interests, '{}'::text[]),
  car_count
from public.profiles
where role = 'community'
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

alter table public.client_profiles enable row level security;
alter table public.community_profiles enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

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
create policy "Clients can delete their own surveys"
on public.surveys
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'client'
  )
);

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
