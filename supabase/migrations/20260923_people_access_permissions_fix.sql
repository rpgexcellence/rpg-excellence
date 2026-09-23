begin;

-- The API roles need PostgreSQL privileges before RLS policies are evaluated.
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table public.organization_people to authenticated;
grant select, insert, update, delete on table public.organization_person_permissions to authenticated;
grant select, insert, update, delete on table public.organization_person_authorizations to authenticated;
grant select, insert, update, delete on table public.organization_invitations to authenticated;
grant select, insert on table public.organization_access_events to authenticated;

grant all privileges on table public.organization_people to service_role;
grant all privileges on table public.organization_person_permissions to service_role;
grant all privileges on table public.organization_person_authorizations to service_role;
grant all privileges on table public.organization_invitations to service_role;
grant all privileges on table public.organization_access_events to service_role;

grant execute on function public.is_organization_people_admin(uuid) to authenticated, service_role;
grant execute on function public.has_organization_module_access(uuid, text, text) to authenticated, service_role;

revoke all privileges on table public.organization_people from anon;
revoke all privileges on table public.organization_person_permissions from anon;
revoke all privileges on table public.organization_person_authorizations from anon;
revoke all privileges on table public.organization_invitations from anon;
revoke all privileges on table public.organization_access_events from anon;

drop policy if exists organization_events_admin_insert on public.organization_access_events;
create policy organization_events_admin_insert
on public.organization_access_events
for insert
to authenticated
with check (public.is_organization_people_admin(organization_id));

commit;
