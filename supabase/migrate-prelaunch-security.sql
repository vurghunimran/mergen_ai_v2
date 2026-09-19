-- Apply AFTER schema/aggregate upgrades and migrate-survey-pricing-orders.sql.
-- This migration closes direct client writes; deploy together with the new server handlers.
begin;

revoke insert, update on public.profiles from anon, authenticated;
grant update(first_name,last_name,phone_number,appearance,two_factor_enabled) on public.profiles to authenticated;
alter table public.profiles add column if not exists adult_confirmed_at timestamptz;
alter table public.profiles add column if not exists consent_version text;
alter table public.profiles add column if not exists privacy_consent_version text;
update public.profiles p set email=coalesce(u.email,'') from auth.users u where p.id=u.id and p.email is distinct from coalesce(u.email,'');

create or replace function public.validate_adult_signup() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.raw_user_meta_data->>'adult_confirmed' is distinct from 'true'
     or new.raw_user_meta_data->>'terms_version' is distinct from '2026-03-27'
     or new.raw_user_meta_data->>'privacy_policy_version' is distinct from '2026-03-27' then
    raise exception 'Adult eligibility and consent are required' using errcode='23514';
  end if;
  if coalesce(new.raw_user_meta_data->>'role','community') = 'community' and
     (coalesce(new.raw_user_meta_data->>'age_span','') !~ '^[0-9]{2}' or
      substring(new.raw_user_meta_data->>'age_span' from '^[0-9]+')::integer < 18) then
    raise exception 'Community members must be adults' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists validate_adult_signup on auth.users;
create trigger validate_adult_signup before insert on auth.users for each row execute function public.validate_adult_signup();

create or replace function public.capture_signup_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set adult_confirmed_at=now(), consent_version=new.raw_user_meta_data->>'terms_version', privacy_consent_version=new.raw_user_meta_data->>'privacy_policy_version' where id=new.id;
  return new;
end $$;
drop trigger if exists z_capture_signup_consent on auth.users;
create trigger z_capture_signup_consent after insert on auth.users for each row execute function public.capture_signup_consent();

create or replace function public.sync_verified_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin update public.profiles set email=coalesce(new.email,'') where id=new.id; return new; end $$;
drop trigger if exists sync_verified_profile_email on auth.users;
create trigger sync_verified_profile_email after update of email on auth.users for each row execute function public.sync_verified_profile_email();

create or replace function public.enforce_adult_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP='UPDATE' and new.age_span is not distinct from old.age_span then return new; end if;
  if coalesce(new.age_span,'') !~ '^[0-9]{2}' or substring(new.age_span from '^[0-9]+')::integer < 18 then
    raise exception 'Community members must be adults' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists enforce_adult_profile on public.community_profiles;
create trigger enforce_adult_profile before insert or update of age_span on public.community_profiles for each row execute function public.enforce_adult_profile();

create table if not exists public.survey_attempts (
 member_id uuid not null references public.profiles(id) on delete cascade,
 survey_id bigint not null references public.surveys(id) on delete cascade,
 started_at timestamptz not null default now(), primary key(member_id,survey_id)
);
alter table public.survey_attempts enable row level security;
revoke all on public.survey_attempts from anon,authenticated;
grant all on public.survey_attempts to service_role;

-- Financial facts are writable only by trusted server transactions.
revoke insert,update,delete on public.survey_responses,public.welcome_survey_completions,public.reward_activations from anon,authenticated;
drop policy if exists "Community members can submit survey responses" on public.survey_responses;
drop policy if exists "Community members can submit their own welcome survey completion" on public.welcome_survey_completions;
drop policy if exists "Community members can create their own reward activations" on public.reward_activations;
alter table public.survey_responses add column if not exists evaluation_source text;
alter table public.reward_activations add column if not exists idempotency_key uuid;
create unique index if not exists reward_activation_request_key on public.reward_activations(member_id,idempotency_key);
create table if not exists public.reward_catalog (
 id text primary key, company text not null, subtitle text not null, credits integer not null check(credits>0), active boolean not null default true
);
alter table public.reward_catalog enable row level security;
revoke all on public.reward_catalog from anon,authenticated;
grant all on public.reward_catalog to service_role;

create or replace function public.redeem_reward(p_member uuid,p_reward text,p_request uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare member public.profiles; item public.reward_catalog; activation public.reward_activations; balance bigint;
begin
  select * into member from public.profiles where id=p_member and role='community' for update;
  if not found or p_request is null then raise exception 'Invalid redemption' using errcode='42501'; end if;
  select * into activation from public.reward_activations where member_id=p_member and idempotency_key=p_request;
  select coalesce((select sum(earned_credits) from public.survey_responses where respondent_id=p_member),0)
       + coalesce((select sum(earned_credits) from public.welcome_survey_completions where respondent_id=p_member),0)
       - coalesce((select sum(credits) from public.reward_activations where member_id=p_member and status<>'cancelled'),0) into balance;
  if activation.id is not null then
    if activation.reward_id<>p_reward then raise exception 'Idempotency key conflict' using errcode='23505'; end if;
    return jsonb_build_object('activation',to_jsonb(activation),'remainingCredits',balance);
  end if;
  select * into item from public.reward_catalog where id=p_reward and active;
  if not found then raise exception 'Invalid reward' using errcode='23514'; end if;
  if balance<item.credits then raise exception 'Insufficient credits' using errcode='23514'; end if;
  insert into public.reward_activations(member_id,reward_id,reward_company,reward_subtitle,activation_email,credits,status,idempotency_key)
  values(p_member,item.id,item.company,item.subtitle,member.email,item.credits,'activated',p_request) returning * into activation;
  return jsonb_build_object('activation',to_jsonb(activation),'remainingCredits',balance-item.credits);
end $$;
revoke all on function public.redeem_reward(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.redeem_reward(uuid,text,uuid) to service_role;

create or replace function public.submit_verified_response(
 p_member uuid,p_survey bigint,p_survey_version timestamptz,p_member_version timestamptz,
 p_seconds integer,p_score integer,p_credits integer,p_summary text,p_answers jsonb,p_source text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare survey public.surveys; member public.community_profiles; response public.survey_responses; count_responses bigint;
begin
  -- Consistent lock order for submissions/redemptions; serialize capacity on the survey row.
  perform 1 from public.profiles where id=p_member and role='community' for update;
  if not found then raise exception 'Invalid member' using errcode='42501'; end if;
  select * into member from public.community_profiles where id=p_member for update;
  if not found then raise exception 'Invalid member' using errcode='42501'; end if;
  select * into survey from public.surveys where id=p_survey for update;
  if not found then raise exception 'Invalid survey' using errcode='42501'; end if;
  select * into response from public.survey_responses where survey_id=p_survey and respondent_id=p_member;
  if found then
    if response.answers is distinct from p_answers then raise exception 'Already submitted' using errcode='23505'; end if;
    return to_jsonb(response);
  end if;
  if survey.updated_at is distinct from p_survey_version or member.updated_at is distinct from p_member_version then
    raise exception 'Survey or audience profile changed; retry' using errcode='40001';
  end if;
  if survey.status<>'published' or survey.days_remaining<=0 or survey.distribution_expires_at<=now() then
    raise exception 'Survey closed' using errcode='23514';
  end if;
  select count(*) into count_responses from public.survey_responses where survey_id=p_survey;
  if count_responses>=survey.target_responses then raise exception 'Survey full' using errcode='23514'; end if;
  if p_score is null or p_score not between 0 and 100 or p_credits is null or p_credits not between 20 and 70
     or p_credits <> 20+round(p_score::numeric/2)
     or p_seconds is null or p_seconds not between 1 and 86400 or p_source is null or p_source not in ('gemini','fallback')
     or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>jsonb_array_length(survey.questions) then
    raise exception 'Invalid verified response' using errcode='23514';
  end if;
  insert into public.survey_responses(survey_id,respondent_id,completion_time_seconds,trust_score,earned_credits,summary,answers,evaluation_source)
  values(p_survey,p_member,p_seconds,p_score,p_credits,p_summary,p_answers,p_source) returning * into response;
  if count_responses+1>=survey.target_responses then
    update public.surveys set status='archived',days_remaining=0,distribution_completed_at=now() where id=p_survey;
  end if;
  return to_jsonb(response);
end $$;
revoke all on function public.submit_verified_response(uuid,bigint,timestamptz,timestamptz,integer,integer,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_verified_response(uuid,bigint,timestamptz,timestamptz,integer,integer,integer,text,jsonb,text) to service_role;

-- Immutable historical entitlements: preserve prices, do not grant new allowances.
create or replace function public.protect_historical_survey() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.pricing_order_id is null and (
    new.user_id is distinct from old.user_id or new.target_responses is distinct from old.target_responses or
    new.question_count is distinct from old.question_count or new.include_detailed_ai is distinct from old.include_detailed_ai or
    new.questions is distinct from old.questions or new.audience is distinct from old.audience or
    new.distribution_expires_at is distinct from old.distribution_expires_at or
    (old.status='archived' and new.status<>'archived') or new.days_remaining>old.days_remaining
  ) then raise exception 'Historical entitlements cannot be changed'; end if;
  return new;
end $$;
drop trigger if exists protect_historical_survey on public.surveys;
create trigger protect_historical_survey before update on public.surveys for each row execute function public.protect_historical_survey();

-- Durable request budgets and short leases shared across all application instances.
create table if not exists public.ai_request_budget (
 bucket text primary key, started_at timestamptz not null default now(), uses integer not null default 0
);
create table if not exists public.ai_request_leases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, expires_at timestamptz not null
);
alter table public.ai_request_budget enable row level security;
alter table public.ai_request_leases enable row level security;
revoke all on public.ai_request_budget,public.ai_request_leases from anon,authenticated;
grant all on public.ai_request_budget,public.ai_request_leases to service_role;
create or replace function public.acquire_ai_request(p_user uuid,p_scope text) returns uuid
language plpgsql security definer set search_path=public as $$
declare lease uuid; key text; n integer;
begin
  if p_scope not in ('questions','report','evaluation') then raise exception 'Invalid AI scope'; end if;
  -- Fixed server limits: at most 1,000 total provider requests/day and 30 per user/day.
  foreach key in array array['global:'||to_char(now() at time zone 'UTC','YYYY-MM-DD'),p_user::text||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD')] loop
    insert into public.ai_request_budget(bucket,uses) values(key,1)
      on conflict(bucket) do update set uses=ai_request_budget.uses+1 returning uses into n;
    if n > (case when key like 'global:%' then 1000 else 30 end) then raise exception 'AI request limit reached' using errcode='P0001'; end if;
  end loop;
  delete from public.ai_request_leases where expires_at<now();
  select count(*) into n from public.ai_request_leases where user_id=p_user;
  if n>=2 then raise exception 'AI concurrency limit reached' using errcode='P0001'; end if;
  insert into public.ai_request_leases(user_id,expires_at) values(p_user,now()+interval '60 seconds') returning id into lease;
  delete from public.ai_request_budget where started_at<now()-interval '2 days';
  return lease;
end $$;
revoke all on function public.acquire_ai_request(uuid,text) from public,anon,authenticated;
grant execute on function public.acquire_ai_request(uuid,text) to service_role;
-- Keep server catalog aligned with the displayed catalog.
insert into public.reward_catalog(id,company,subtitle,credits) values
('withdraw-cash','Cash Withdraw','Bank transfer payout',920),
('notion','Notion','Workspace credit',560),
('grammarly','Grammarly','Premium writing tools',580),
('canva','Canva','Design subscription credit',600),
('google','Google','Google One, Workspace discounts',650),
('spotify','Spotify','Premium music reward',620),
('netflix','Netflix','Streaming subscription reward',670),
('youtube-premium','YouTube','YouTube Premium reward',610),
('amazon','Amazon','Gift cards',700),
('microsoft','Microsoft','Software and account credits',720),
('adobe','Adobe','Creative Cloud reward',740),
('figma','Figma','Design collaboration credit',690),
('zoom','Zoom','Meeting and productivity credit',730),
('openai-chatgpt','OpenAI','ChatGPT reward',750),
('anthropic-claude','Anthropic','Claude reward',800),
('starbucks','Starbucks','Coffee and drinks card',620),
('uber','Uber','Ride and delivery credit',730),
('airbnb','Airbnb','Travel stay reward',830),
('booking-com','Booking.com','Travel booking reward',870),
('coursera','Coursera','Course access reward',730),
('udemy','Udemy','Learning credit',700),
('duolingo','Duolingo','Language learning reward',720),
('steam','Steam','Game wallet credit',780),
('playstation','PlayStation','Store reward',890),
('epic-games','Epic Games','Game store reward',860)
on conflict(id) do update set company=excluded.company,subtitle=excluded.subtitle,credits=excluded.credits;

alter table public.survey_orders add column if not exists draft_payload jsonb;
alter table public.survey_orders add column if not exists refund_status text;
create table if not exists public.payment_webhook_events (
 id text primary key, event_type text not null, processed_at timestamptz not null default now()
);
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon,authenticated;
grant all on public.payment_webhook_events to service_role;
create or replace function public.record_survey_refund(p_checkout text) returns void
language plpgsql security definer set search_path=public as $$
declare order_id uuid;
begin
 select id into order_id from public.survey_orders where checkout_id=p_checkout for update;
 if not found then raise exception 'Unknown checkout'; end if;
 update public.survey_orders set refund_status='refunded',requires_review=true where id=order_id;
 update public.surveys set status='archived',days_remaining=0,distribution_completed_at=now() where pricing_order_id=order_id;
end $$;
revoke all on function public.record_survey_refund(text) from public,anon,authenticated;
grant execute on function public.record_survey_refund(text) to service_role;
create or replace function public.enforce_refund_boundary() returns trigger
language plpgsql security definer set search_path=public as $$
declare refunded text;
begin
 if new.pricing_order_id is not null then
   select refund_status into refunded from public.survey_orders where id=new.pricing_order_id for update;
   if refunded is not null and new.status<>'archived' then raise exception 'Refunded survey cannot be published'; end if;
 end if;
 return new;
end $$;
drop trigger if exists enforce_refund_boundary on public.surveys;
create trigger enforce_refund_boundary before insert or update on public.surveys for each row execute function public.enforce_refund_boundary();

commit;
