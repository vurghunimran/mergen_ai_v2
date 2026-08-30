create table if not exists public.telegram_survey_sessions (
  token_hash text primary key,
  survey_id bigint not null references public.surveys (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  telegram_chat_id text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'revoked')),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (survey_id, user_id)
);

create index if not exists telegram_survey_sessions_expiry_idx
  on public.telegram_survey_sessions (status, expires_at);

alter table public.telegram_survey_sessions enable row level security;

drop trigger if exists set_telegram_survey_sessions_updated_at on public.telegram_survey_sessions;
create trigger set_telegram_survey_sessions_updated_at
before update on public.telegram_survey_sessions
for each row execute function public.set_updated_at();
