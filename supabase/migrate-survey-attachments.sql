alter table public.surveys
add column if not exists attachments jsonb;
