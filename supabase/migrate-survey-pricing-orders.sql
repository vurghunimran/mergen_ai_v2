-- Run before using formula pricing. Existing surveys and provider invoices are not repriced.
begin;
create table if not exists public.survey_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  checkout_id text unique,
  currency text not null check (currency = 'USD'),
  total_cents integer not null check (total_cents > 0),
  question_count integer not null check (question_count between 5 and 25),
  response_count integer not null check (response_count in (50,100,250,500,1000)),
  include_detailed_report boolean not null,
  pricing_version text not null,
  requires_review boolean not null default false,
  pricing jsonb not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now()
);
alter table public.survey_orders enable row level security;
revoke all on public.survey_orders from anon, authenticated;
grant select on public.survey_orders to authenticated;
grant all on public.survey_orders to service_role;
drop policy if exists "Clients can read their own survey orders" on public.survey_orders;
create policy "Clients can read their own survey orders" on public.survey_orders
for select to authenticated using (user_id = auth.uid());
alter table public.surveys add column if not exists pricing_order_id uuid references public.survey_orders(id);
create unique index if not exists surveys_pricing_order_id_key on public.surveys(pricing_order_id);

-- Prevent direct database writes from bypassing the server's payment/allowance checks.
create or replace function public.enforce_survey_paid_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare purchased public.survey_orders;
begin
  if TG_OP = 'UPDATE' and OLD.pricing_order_id is null then
    if NEW.pricing_order_id is not null then raise exception 'Historical orders cannot be reassigned'; end if;
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and NEW.pricing_order_id is distinct from OLD.pricing_order_id then
    raise exception 'Purchased order cannot be changed';
  end if;
  select * into purchased from public.survey_orders where id = NEW.pricing_order_id;
  if not found or purchased.status <> 'paid' or purchased.requires_review or purchased.user_id is distinct from NEW.user_id then
    raise exception 'A verified paid order owned by this client is required';
  end if;
  if NEW.question_count is distinct from purchased.question_count or NEW.target_responses is distinct from purchased.response_count
     or NEW.include_detailed_ai is distinct from purchased.include_detailed_report
     or NEW.questions is null or jsonb_typeof(NEW.questions) <> 'array' or jsonb_array_length(NEW.questions) < 5
     or jsonb_array_length(NEW.questions) > purchased.question_count then
    raise exception 'Survey exceeds or differs from its purchased allowance';
  end if;
  return NEW;
end $$;
drop trigger if exists enforce_survey_paid_order on public.surveys;
create trigger enforce_survey_paid_order before insert or update of pricing_order_id, user_id, question_count, target_responses, include_detailed_ai, questions
on public.surveys for each row execute function public.enforce_survey_paid_order();
commit;
