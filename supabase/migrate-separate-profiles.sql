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
  salary_range text,
  educational_level text,
  place_of_residence text,
  family_status text,
  interests text[] not null default '{}',
  car_count text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_interests text[];
begin
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'community');
  user_interests :=
    case
      when jsonb_typeof(new.raw_user_meta_data -> 'interests') = 'array' then
        array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'interests'))
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
      salary_range,
      educational_level,
      place_of_residence,
      family_status,
      interests,
      car_count
    )
    values (
      new.id,
      new.raw_user_meta_data ->> 'country',
      new.raw_user_meta_data ->> 'age_span',
      new.raw_user_meta_data ->> 'gender',
      new.raw_user_meta_data ->> 'salary_range',
      new.raw_user_meta_data ->> 'educational_level',
      new.raw_user_meta_data ->> 'place_of_residence',
      new.raw_user_meta_data ->> 'family_status',
      user_interests,
      new.raw_user_meta_data ->> 'car_count'
    )
    on conflict (id) do update set
      country = excluded.country,
      age_span = excluded.age_span,
      gender = excluded.gender,
      salary_range = excluded.salary_range,
      educational_level = excluded.educational_level,
      place_of_residence = excluded.place_of_residence,
      family_status = excluded.family_status,
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
  salary_range,
  educational_level,
  place_of_residence,
  family_status,
  interests,
  car_count
)
select
  id,
  country,
  age_span,
  gender,
  salary_range,
  educational_level,
  place_of_residence,
  family_status,
  coalesce(interests, '{}'::text[]),
  car_count
from public.profiles
where role = 'community'
on conflict (id) do update set
  country = excluded.country,
  age_span = excluded.age_span,
  gender = excluded.gender,
  salary_range = excluded.salary_range,
  educational_level = excluded.educational_level,
  place_of_residence = excluded.place_of_residence,
  family_status = excluded.family_status,
  interests = excluded.interests,
  car_count = excluded.car_count;

alter table public.client_profiles enable row level security;
alter table public.community_profiles enable row level security;

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
