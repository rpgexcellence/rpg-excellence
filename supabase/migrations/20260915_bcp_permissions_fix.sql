-- Restore application access to the BCP tables without weakening tenant isolation.
-- RLS policies filter rows, but PostgreSQL table privileges must also be granted.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.bcp_site_profiles
  to authenticated;

grant select, insert, update, delete
  on table public.bcp_training_progress
  to authenticated;

alter table public.bcp_site_profiles enable row level security;
alter table public.bcp_training_progress enable row level security;

drop policy if exists "Users manage own BCP profiles"
  on public.bcp_site_profiles;

create policy "Users manage own BCP profiles"
  on public.bcp_site_profiles
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users manage own BCP training progress"
  on public.bcp_training_progress;

drop policy if exists "Users manage own BCP training"
  on public.bcp_training_progress;

create policy "Users manage own BCP training progress"
  on public.bcp_training_progress
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
