create table if not exists public.reward_activations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  reward_id text not null,
  reward_company text not null,
  reward_subtitle text not null,
  activation_email text not null,
  credits integer not null check (credits > 0),
  status text not null default 'activated' check (status in ('activated', 'fulfilled', 'cancelled')),
  activated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists reward_activations_member_id_idx on public.reward_activations (member_id);
create index if not exists reward_activations_activated_at_idx on public.reward_activations (activated_at desc);
create index if not exists reward_activations_status_idx on public.reward_activations (status);

drop trigger if exists set_reward_activations_updated_at on public.reward_activations;
create trigger set_reward_activations_updated_at
before update on public.reward_activations
for each row
execute function public.set_updated_at();

alter table public.reward_activations enable row level security;

drop policy if exists "Community members can view their own reward activations" on public.reward_activations;
create policy "Community members can view their own reward activations"
on public.reward_activations
for select
using (auth.uid() = member_id);

drop policy if exists "Community members can create their own reward activations" on public.reward_activations;
create policy "Community members can create their own reward activations"
on public.reward_activations
for insert
with check (
  member_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'community'
  )
);
