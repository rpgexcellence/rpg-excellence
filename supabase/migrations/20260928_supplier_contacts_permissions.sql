-- Restore application access to supplier contacts.
-- Row-level security policies remain responsible for deciding which rows an
-- authenticated user may access. The service role is used by controlled
-- server actions to validate supplier contacts before saving linked records.

begin;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
  on table public.supplier_contacts
  to authenticated;

grant all privileges
  on table public.supplier_contacts
  to service_role;

commit;
