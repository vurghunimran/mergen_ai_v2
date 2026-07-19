alter table public.community_launch_countries enable row level security;

drop policy if exists "Anyone can view community launch countries" on public.community_launch_countries;
create policy "Anyone can view community launch countries"
on public.community_launch_countries
for select
using (true);
