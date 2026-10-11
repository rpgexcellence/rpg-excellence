-- Restore the verified RPG Excellence platform-owner account if its
-- portal_admins row was deleted, disabled or linked to an obsolete auth UUID.
-- The application also has a server-side owner recovery path so a future UUID
-- change cannot lock the owner out of administration.

insert into public.portal_admins (user_id, role, active)
select id, 'admin', true
from auth.users
where lower(email) = 'info@rpgexcellence.com'
on conflict (user_id) do update
set role = excluded.role,
    active = excluded.active;
