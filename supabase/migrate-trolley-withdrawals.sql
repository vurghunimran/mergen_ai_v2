-- Apply after migrate-prelaunch-security.sql. Cash and gift rewards share one credit ledger.
begin;
create table if not exists public.cash_withdrawals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id),
  activation_id uuid not null unique references public.reward_activations(id),
  request_key uuid not null,
  credits integer not null check (credits between 920 and 920000 and credits % 920 = 0),
  amount_cents integer not null check (amount_cents = credits / 920 * 1000),
  currency text not null default 'USD' check(currency = 'USD'),
  recipient_id text not null,
  status text not null default 'queued' check(status in ('queued','submitting','review','processing','processed','failed','returned')),
  batch_id text unique,
  payment_id text unique,
  provider_updated_at timestamptz,
  target_amount text,
  target_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id,request_key)
);
create index if not exists cash_withdrawals_member_idx on public.cash_withdrawals(member_id,created_at desc);
alter table public.cash_withdrawals enable row level security;
revoke all on public.cash_withdrawals from public,anon,authenticated;
grant select on public.cash_withdrawals to authenticated;
grant all on public.cash_withdrawals to service_role;
drop policy if exists "Members read own withdrawals" on public.cash_withdrawals;
create policy "Members read own withdrawals" on public.cash_withdrawals for select to authenticated using(auth.uid()=member_id);

create or replace function public.reserve_cash_withdrawal(p_member uuid,p_request uuid,p_credits integer,p_recipient text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare member public.profiles; existing public.cash_withdrawals; activation uuid; balance bigint;
begin
  select * into member from public.profiles where id=p_member and role='community' for update;
  if not found or p_request is null then raise exception 'Invalid member' using errcode='42501'; end if;
  if not exists(select 1 from public.community_profiles where id=p_member and age_span in ('18-24','25-34','35-44','45-54','55-64','65+')) then
    raise exception 'Adult member required' using errcode='42501'; end if;
  select * into existing from public.cash_withdrawals where member_id=p_member and request_key=p_request;
  if found then
    if existing.credits<>p_credits then raise exception 'Request key conflict' using errcode='23505'; end if;
    return to_jsonb(existing);
  end if;
  if p_credits is null or p_credits<920 or p_credits>920000 or p_credits%920<>0 or p_recipient is null or p_recipient not like 'R-%' then
    raise exception 'Invalid withdrawal' using errcode='23514'; end if;
  select coalesce((select sum(earned_credits) from public.survey_responses where respondent_id=p_member),0)
       + coalesce((select sum(earned_credits) from public.welcome_survey_completions where respondent_id=p_member),0)
       - coalesce((select sum(credits) from public.reward_activations where member_id=p_member and status<>'cancelled'),0) into balance;
  if balance<p_credits then raise exception 'Insufficient credits' using errcode='23514'; end if;
  insert into public.reward_activations(member_id,reward_id,reward_company,reward_subtitle,activation_email,credits,status,idempotency_key)
  values(p_member,'withdraw-cash','Cash Withdraw','Trolley bank payout',member.email,p_credits,'activated',p_request) returning id into activation;
  insert into public.cash_withdrawals(member_id,activation_id,request_key,credits,amount_cents,recipient_id)
  values(p_member,activation,p_request,p_credits,p_credits/920*1000,p_recipient) returning * into existing;
  return to_jsonb(existing);
end $$;

-- Only the winner may create a batch. Interrupted/ambiguous submissions stay reserved for review.
create or replace function public.claim_cash_withdrawal(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare row public.cash_withdrawals;
begin
  update public.cash_withdrawals set status='submitting',updated_at=now() where id=p_id and status='queued' returning * into row;
  return to_jsonb(row);
end $$;

create or replace function public.settle_cash_withdrawal(p_id uuid,p_payment text,p_status text,p_updated timestamptz,p_target_amount text,p_target_currency text)
returns void language plpgsql security definer set search_path=public as $$
declare row public.cash_withdrawals; member uuid;
begin
  -- Use the same lock order as reservation and gift-card redemption.
  select member_id into member from public.cash_withdrawals where id=p_id;
  perform 1 from public.profiles where id=member for update;
  select * into row from public.cash_withdrawals where id=p_id for update;
  if not found or row.payment_id is distinct from p_payment then raise exception 'Unknown payment' using errcode='23514'; end if;
  if p_status not in ('pending','processing','processed','failed','returned') or p_updated is null then
    raise exception 'Invalid provider state' using errcode='23514'; end if;
  if row.provider_updated_at is not null and p_updated<row.provider_updated_at then return; end if;
  if row.status in ('failed','returned') then return; end if;
  if row.status='processed' and p_status<>'returned' then return; end if;
  update public.cash_withdrawals set status=case when p_status='pending' then 'processing' else p_status end,
    provider_updated_at=p_updated,target_amount=p_target_amount,target_currency=p_target_currency,updated_at=now() where id=p_id;
  update public.reward_activations set status=case when p_status in ('failed','returned') then 'cancelled'
    when p_status='processed' then 'fulfilled' else 'activated' end,updated_at=now() where id=row.activation_id;
end $$;

revoke all on function public.reserve_cash_withdrawal(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.claim_cash_withdrawal(uuid) from public,anon,authenticated;
revoke all on function public.settle_cash_withdrawal(uuid,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.reserve_cash_withdrawal(uuid,uuid,integer,text) to service_role;
grant execute on function public.claim_cash_withdrawal(uuid) to service_role;
grant execute on function public.settle_cash_withdrawal(uuid,text,text,timestamptz,text,text) to service_role;

-- Called only after Trolley confirms deletion of an open (unprocessed) batch.
create or replace function public.cancel_deleted_cash_withdrawal(p_id uuid,p_batch text)
returns void language plpgsql security definer set search_path=public as $$
declare row public.cash_withdrawals; member uuid;
begin
  select member_id into member from public.cash_withdrawals where id=p_id;
  perform 1 from public.profiles where id=member for update;
  select * into row from public.cash_withdrawals where id=p_id for update;
  if not found or p_batch is null or row.batch_id is distinct from p_batch then
    raise exception 'Unknown batch' using errcode='23514'; end if;
  if row.status='failed' then return; end if;
  if row.status not in ('submitting','review','processing') then raise exception 'Cannot cancel completed payout' using errcode='23514'; end if;
  update public.cash_withdrawals set status='failed',updated_at=now() where id=p_id;
  update public.reward_activations set status='cancelled',updated_at=now() where id=row.activation_id;
end $$;
revoke all on function public.cancel_deleted_cash_withdrawal(uuid,text) from public,anon,authenticated;
grant execute on function public.cancel_deleted_cash_withdrawal(uuid,text) to service_role;
commit;
