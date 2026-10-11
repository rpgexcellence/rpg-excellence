begin;

-- Security-definer helpers prevent policy recursion while preserving organisation boundaries.
create or replace function public.current_organization_person_id(target_organization uuid)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select p.id
  from public.organization_people p
  where p.organization_id=target_organization
    and p.user_id=auth.uid()
    and p.account_status='active'
  limit 1
$$;

create or replace function public.can_view_hs_permit(target_permit uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.hs_permits permit
    where permit.id=target_permit
      and (
        permit.owner_id=auth.uid()
        or public.is_organization_people_admin(permit.organization_id)
        or public.has_organization_module_access(permit.organization_id,'risk_management','view')
        or permit.issuer_person_id=public.current_organization_person_id(permit.organization_id)
        or permit.receiver_person_id=public.current_organization_person_id(permit.organization_id)
      )
  )
$$;

create or replace function public.can_contribute_hs_permit(target_permit uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.hs_permits permit
    where permit.id=target_permit
      and (
        permit.owner_id=auth.uid()
        or public.is_organization_people_admin(permit.organization_id)
        or public.has_organization_module_access(permit.organization_id,'risk_management','contribute')
        or permit.issuer_person_id=public.current_organization_person_id(permit.organization_id)
        or permit.receiver_person_id=public.current_organization_person_id(permit.organization_id)
      )
  )
$$;

grant execute on function public.current_organization_person_id(uuid) to authenticated,service_role;
grant execute on function public.can_view_hs_permit(uuid) to authenticated,service_role;
grant execute on function public.can_contribute_hs_permit(uuid) to authenticated,service_role;

-- Preserve the original owner policy and add organisation-scoped access alongside it.
drop policy if exists "Company users view assigned permits" on public.hs_permits;
create policy "Company users view assigned permits"
on public.hs_permits for select to authenticated
using (
  public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','view')
  or issuer_person_id=public.current_organization_person_id(organization_id)
  or receiver_person_id=public.current_organization_person_id(organization_id)
);

drop policy if exists "Company users update assigned permits" on public.hs_permits;
create policy "Company users update assigned permits"
on public.hs_permits for update to authenticated
using (
  public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','contribute')
  or issuer_person_id=public.current_organization_person_id(organization_id)
  or receiver_person_id=public.current_organization_person_id(organization_id)
)
with check (
  public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','contribute')
  or issuer_person_id=public.current_organization_person_id(organization_id)
  or receiver_person_id=public.current_organization_person_id(organization_id)
);

drop policy if exists "Company contributors create permits" on public.hs_permits;
create policy "Company contributors create permits"
on public.hs_permits for insert to authenticated
with check (
  owner_id=auth.uid()
  or public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','contribute')
);

drop policy if exists "Company administrators delete permits" on public.hs_permits;
create policy "Company administrators delete permits"
on public.hs_permits for delete to authenticated
using (public.is_organization_people_admin(organization_id));

drop policy if exists "Permit users manage isolations" on public.hs_permit_isolations;
create policy "Permit users manage isolations"
on public.hs_permit_isolations for all to authenticated
using (public.can_contribute_hs_permit(permit_id))
with check (public.can_contribute_hs_permit(permit_id));

drop policy if exists "Permit users manage atmosphere tests" on public.hs_permit_atmosphere_tests;
create policy "Permit users manage atmosphere tests"
on public.hs_permit_atmosphere_tests for all to authenticated
using (public.can_contribute_hs_permit(permit_id))
with check (public.can_contribute_hs_permit(permit_id));

drop policy if exists "Permit users manage handovers" on public.hs_permit_handovers;
create policy "Permit users manage handovers"
on public.hs_permit_handovers for all to authenticated
using (public.can_contribute_hs_permit(permit_id))
with check (public.can_contribute_hs_permit(permit_id));

drop policy if exists "Permit users view events" on public.hs_permit_events;
create policy "Permit users view events"
on public.hs_permit_events for select to authenticated
using (public.can_view_hs_permit(permit_id));

drop policy if exists "Permit users add events" on public.hs_permit_events;
create policy "Permit users add events"
on public.hs_permit_events for insert to authenticated
with check (public.can_contribute_hs_permit(permit_id));

revoke delete on public.hs_permit_events from authenticated;
revoke update on public.hs_permit_events from authenticated;

commit;
