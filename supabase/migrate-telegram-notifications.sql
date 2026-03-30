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

alter table public.telegram_notification_subscriptions
  add column if not exists phone_number text;
alter table public.telegram_notification_subscriptions
  add column if not exists phone_number_normalized text;
alter table public.telegram_notification_subscriptions
  add column if not exists telegram_chat_id text;
alter table public.telegram_notification_subscriptions
  add column if not exists telegram_user_id text;
alter table public.telegram_notification_subscriptions
  add column if not exists telegram_username text;
alter table public.telegram_notification_subscriptions
  add column if not exists telegram_first_name text;
alter table public.telegram_notification_subscriptions
  add column if not exists telegram_last_name text;
alter table public.telegram_notification_subscriptions
  add column if not exists notifications_enabled boolean default true;
alter table public.telegram_notification_subscriptions
  add column if not exists linked_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  add column if not exists verified_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  add column if not exists last_notified_at timestamptz;
alter table public.telegram_notification_subscriptions
  add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  add column if not exists updated_at timestamptz default timezone('utc', now());

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

alter table public.telegram_notification_subscriptions
  alter column notifications_enabled set default true;
alter table public.telegram_notification_subscriptions
  alter column linked_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  alter column verified_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  alter column created_at set default timezone('utc', now());
alter table public.telegram_notification_subscriptions
  alter column updated_at set default timezone('utc', now());

create unique index if not exists telegram_notification_subscriptions_chat_id_idx
  on public.telegram_notification_subscriptions (telegram_chat_id);

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

alter table public.telegram_link_tokens
  add column if not exists user_id uuid;
alter table public.telegram_link_tokens
  add column if not exists phone_number text;
alter table public.telegram_link_tokens
  add column if not exists phone_number_normalized text;
alter table public.telegram_link_tokens
  add column if not exists telegram_chat_id text;
alter table public.telegram_link_tokens
  add column if not exists telegram_user_id text;
alter table public.telegram_link_tokens
  add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.telegram_link_tokens
  add column if not exists expires_at timestamptz;
alter table public.telegram_link_tokens
  add column if not exists consumed_at timestamptz;

update public.telegram_link_tokens
set created_at = timezone('utc', now())
where created_at is null;

alter table public.telegram_link_tokens
  alter column created_at set default timezone('utc', now());

create index if not exists telegram_link_tokens_user_id_idx
  on public.telegram_link_tokens (user_id);
create index if not exists telegram_link_tokens_chat_id_idx
  on public.telegram_link_tokens (telegram_chat_id);
create index if not exists telegram_link_tokens_expires_at_idx
  on public.telegram_link_tokens (expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_telegram_notification_subscriptions_updated_at
on public.telegram_notification_subscriptions;
create trigger set_telegram_notification_subscriptions_updated_at
before update on public.telegram_notification_subscriptions
for each row
execute function public.set_updated_at();

alter table public.telegram_notification_subscriptions enable row level security;
alter table public.telegram_link_tokens enable row level security;

drop policy if exists "Users can view their own telegram subscription"
on public.telegram_notification_subscriptions;
create policy "Users can view their own telegram subscription"
on public.telegram_notification_subscriptions
for select
using (auth.uid() = user_id);
