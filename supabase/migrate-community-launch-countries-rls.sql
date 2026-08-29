-- These lookup tables are exposed through PostgREST during community signup.
-- Keep them publicly readable, but protect every write operation with RLS.
alter table public.community_launch_regions enable row level security;
alter table public.community_launch_countries enable row level security;

drop policy if exists "Anyone can view community launch regions" on public.community_launch_regions;
create policy "Anyone can view community launch regions"
on public.community_launch_regions
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can view community launch countries" on public.community_launch_countries;
create policy "Anyone can view community launch countries"
on public.community_launch_countries
for select
to anon, authenticated
using (true);
