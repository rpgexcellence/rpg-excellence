-- Preserve the verified RPG Excellence platform-administrator accounts.
--
-- This migration is intentionally additive. It does not remove, downgrade or
-- replace any existing portal administrator. If either protected account was
-- deleted from portal_admins, disabled, or linked to an obsolete auth UUID,
-- the row for the account's current auth.users UUID is restored as active.

insert into public.portal_admins (
  user_id,
  role,
  active
)
select
  users.id,
  'admin',
  true
from auth.users as users
where lower(users.email) in (
  'r.pereszczako@sky.com',
  'info@rpgexcellence.com'
)
on conflict (user_id) do update
set role = excluded.role,
    active = excluded.active;
