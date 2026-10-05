-- Owner-only expense ledger and AI telemetry. No browser role can read or write these tables.
begin;
-- Historical mode cannot safely be inferred from today's provider configuration.
alter table public.survey_orders add column if not exists provider_environment text not null default 'unknown'
  check (provider_environment in ('production','sandbox','unknown'));
create table if not exists public.operating_expenses (
  id uuid primary key,
  provider text not null check (provider in ('Perplexity','Google Gemini','Vercel','Supabase','Resend','Polar','Tremendous','Trolley','Other')),
  kind text not null check (kind in ('expense','top_up')),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  currency text not null check (currency in ('USD','EUR','GBP','AZN')),
  paid_on date not null,
  description text not null check (length(description) between 1 and 500),
  reference text not null default '' check (length(reference) <= 120),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  voided_by uuid references public.profiles(id),
  voided_at timestamptz,
  check ((voided_by is null) = (voided_at is null))
);
create index if not exists operating_expenses_paid_on_idx on public.operating_expenses(paid_on desc);
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('Perplexity','Google Gemini')),
  model text not null,
  scope text not null check (scope in ('questions','report','evaluation')),
  outcome text not null check (outcome in ('ok','provider_error','network_error')),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  total_tokens integer check (total_tokens >= 0),
  cost_usd numeric(18,8) check (cost_usd >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_created_at_idx on public.ai_usage_events(created_at desc);
alter table public.operating_expenses enable row level security;
alter table public.ai_usage_events enable row level security;
revoke all on public.operating_expenses, public.ai_usage_events from public, anon, authenticated;
grant all on public.operating_expenses, public.ai_usage_events to service_role;
comment on table public.ai_usage_events is 'Usage metadata only. Never store prompts, answers, credentials or personal data. Null cost means unknown, not zero. Not an invoice ledger.';
commit;
