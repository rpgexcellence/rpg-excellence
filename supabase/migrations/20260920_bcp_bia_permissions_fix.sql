-- Allow authenticated portal users to use the BIA tables.
-- Row-level security remains enabled and limits access to records owned by auth.uid().

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.bcp_bia_assessments
to authenticated;

grant select, insert, update, delete
on table public.bcp_bia_assessment_versions
to authenticated;

-- Recreate the owner policies defensively in case the original migration
-- was applied before permissions were granted.
alter table public.bcp_bia_assessments enable row level security;
alter table public.bcp_bia_assessment_versions enable row level security;

drop policy if exists "Owners manage BIA assessments"
on public.bcp_bia_assessments;

create policy "Owners manage BIA assessments"
on public.bcp_bia_assessments
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners manage BIA versions"
on public.bcp_bia_assessment_versions;

create policy "Owners manage BIA versions"
on public.bcp_bia_assessment_versions
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

