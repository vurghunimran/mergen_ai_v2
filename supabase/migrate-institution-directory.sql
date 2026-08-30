create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('hipo', 'ror', 'mergen')),
  external_id text not null,
  category text not null check (category in ('university', 'institution')),
  name text not null,
  country_name text not null,
  country_code text,
  website text,
  organization_types text[] not null default '{}',
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source, external_id)
);

create table if not exists public.institution_aliases (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  alias text not null,
  language_code text,
  primary key (institution_id, alias)
);

create table if not exists public.institution_domains (
  institution_id uuid not null references public.institutions (id) on delete cascade,
  domain text not null,
  source text not null check (source in ('hipo', 'ror', 'mergen')),
  verified boolean not null default false,
  primary key (institution_id, domain)
);

create index if not exists institutions_country_category_name_idx
on public.institutions (country_name, category, name);

create index if not exists institutions_country_code_category_idx
on public.institutions (country_code, category);

create index if not exists institution_aliases_alias_idx
on public.institution_aliases (alias);

create index if not exists institution_domains_domain_idx
on public.institution_domains (domain);

alter table public.client_profiles
add column if not exists affiliation_type text not null default 'university'
check (affiliation_type in ('university', 'institution'));

alter table public.client_profiles
add column if not exists institution_id uuid references public.institutions (id) on delete set null;

create or replace function public.sync_client_affiliation_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'client' then
    update public.client_profiles
    set
      affiliation_type = coalesce(new.raw_user_meta_data ->> 'affiliation_type', 'university'),
      institution_id = nullif(new.raw_user_meta_data ->> 'institution_id', '')::uuid
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_client_affiliation_metadata on auth.users;
create trigger sync_client_affiliation_metadata
after insert or update of raw_user_meta_data on auth.users
for each row
execute function public.sync_client_affiliation_metadata();

alter table public.institutions enable row level security;
alter table public.institution_aliases enable row level security;
alter table public.institution_domains enable row level security;

drop policy if exists "Anyone can view active institutions" on public.institutions;
create policy "Anyone can view active institutions"
on public.institutions
for select
to anon, authenticated
using (active = true);

drop policy if exists "Anyone can view institution aliases" on public.institution_aliases;
create policy "Anyone can view institution aliases"
on public.institution_aliases
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.institutions
    where institutions.id = institution_aliases.institution_id
      and institutions.active = true
  )
);

-- Domains are intentionally not exposed to anonymous clients. Server-side
-- eligibility checks and directory synchronization use the service role.

drop trigger if exists set_institutions_updated_at on public.institutions;
create trigger set_institutions_updated_at
before update on public.institutions
for each row
execute function public.set_updated_at();
