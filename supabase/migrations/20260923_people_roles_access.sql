create table if not exists public.organization_people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  position text,
  department text,
  site text,
  employee_reference text,
  manager_person_id uuid references public.organization_people(id) on delete set null,
  functional_manager_person_id uuid references public.organization_people(id) on delete set null,
  deputy_person_id uuid references public.organization_people(id) on delete set null,
  account_type text not null default 'directory' check (account_type in ('directory','system')),
  account_status text not null default 'directory' check (account_status in ('directory','invited','active','suspended','closed')),
  comments text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists organization_people_org_email_uidx on public.organization_people(organization_id, lower(email));
create index if not exists organization_people_org_status_idx on public.organization_people(organization_id, account_status);
create index if not exists organization_people_user_idx on public.organization_people(user_id);

create table if not exists public.organization_person_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.organization_people(id) on delete cascade,
  module_key text not null,
  access_level text not null default 'none' check (access_level in ('none','view','contribute','review','approve','admin')),
  scope_type text not null default 'organisation' check (scope_type in ('organisation','site','department','assigned_records')),
  scope_values jsonb not null default '[]'::jsonb,
  granted_by uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  unique(person_id,module_key)
);
create index if not exists organization_person_permissions_org_idx on public.organization_person_permissions(organization_id,module_key,access_level);

create table if not exists public.organization_person_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.organization_people(id) on delete cascade,
  function_key text not null,
  status text not null default 'proposed' check (status in ('proposed','authorised','suspended','expired','withdrawn')),
  standards_scope text[] not null default '{}',
  competence_evidence text,
  authorised_by uuid not null references auth.users(id) on delete restrict,
  authorised_at timestamptz,
  expires_at date,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id,function_key)
);
create index if not exists organization_person_authorizations_org_idx on public.organization_person_authorizations(organization_id,function_key,status);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.organization_people(id) on delete cascade,
  invitation_reference text not null unique,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active','accepted','expired','revoked')),
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists organization_invitations_org_status_idx on public.organization_invitations(organization_id,status,expires_at);

create table if not exists public.organization_access_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid references public.organization_people(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_summary text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists organization_access_events_org_idx on public.organization_access_events(organization_id,created_at desc);

alter table public.organization_people enable row level security;
alter table public.organization_person_permissions enable row level security;
alter table public.organization_person_authorizations enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_access_events enable row level security;

create or replace function public.is_organization_people_admin(target_organization uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.organizations o where o.id=target_organization and o.owner_id=auth.uid())
  or exists(
    select 1 from public.organization_people p
    join public.organization_person_authorizations a on a.person_id=p.id
    join public.organization_person_permissions m on m.person_id=p.id
    where p.organization_id=target_organization and p.user_id=auth.uid() and p.account_status='active'
      and a.function_key='company_administrator' and a.status='authorised'
      and (a.expires_at is null or a.expires_at>=current_date)
      and m.module_key='people_access' and m.access_level='admin'
  );
$$;

create or replace function public.has_organization_module_access(target_organization uuid,target_module text,minimum_level text default 'view')
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_organization_people_admin(target_organization)
  or exists(
    select 1 from public.organization_people p
    join public.organization_person_permissions m on m.person_id=p.id
    where p.organization_id=target_organization and p.user_id=auth.uid() and p.account_status='active'
      and m.module_key=target_module
      and array_position(array['none','view','contribute','review','approve','admin'],m.access_level)
          >= array_position(array['none','view','contribute','review','approve','admin'],minimum_level)
  );
$$;
grant execute on function public.is_organization_people_admin(uuid) to authenticated;
grant execute on function public.has_organization_module_access(uuid,text,text) to authenticated;

drop policy if exists organization_people_admin_all on public.organization_people;
create policy organization_people_admin_all on public.organization_people for all to authenticated
using (public.is_organization_people_admin(organization_id)) with check (public.is_organization_people_admin(organization_id));
drop policy if exists organization_people_self_read on public.organization_people;
create policy organization_people_self_read on public.organization_people for select to authenticated using (user_id=auth.uid());

drop policy if exists organization_permissions_admin_all on public.organization_person_permissions;
create policy organization_permissions_admin_all on public.organization_person_permissions for all to authenticated
using (public.is_organization_people_admin(organization_id)) with check (public.is_organization_people_admin(organization_id));
drop policy if exists organization_permissions_self_read on public.organization_person_permissions;
create policy organization_permissions_self_read on public.organization_person_permissions for select to authenticated
using (exists(select 1 from public.organization_people p where p.id=person_id and p.user_id=auth.uid()));

drop policy if exists organization_authorizations_admin_all on public.organization_person_authorizations;
create policy organization_authorizations_admin_all on public.organization_person_authorizations for all to authenticated
using (public.is_organization_people_admin(organization_id)) with check (public.is_organization_people_admin(organization_id));
drop policy if exists organization_authorizations_self_read on public.organization_person_authorizations;
create policy organization_authorizations_self_read on public.organization_person_authorizations for select to authenticated
using (exists(select 1 from public.organization_people p where p.id=person_id and p.user_id=auth.uid()));

drop policy if exists organization_invitations_admin_all on public.organization_invitations;
create policy organization_invitations_admin_all on public.organization_invitations for all to authenticated
using (public.is_organization_people_admin(organization_id)) with check (public.is_organization_people_admin(organization_id));
drop policy if exists organization_events_admin_read on public.organization_access_events;
create policy organization_events_admin_read on public.organization_access_events for select to authenticated
using (public.is_organization_people_admin(organization_id));
