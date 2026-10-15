-- Administration Site Profile is the authoritative company location register.
-- BCP site profiles remain separate continuity assessments and reference a site here.

create table if not exists public.organization_sites (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  site_reference text not null,
  site_name text not null,

  site_type text not null default 'operational_site'
    check (
      site_type in (
        'registered_office',
        'operational_site',
        'office',
        'warehouse',
        'laboratory',
        'remote_site',
        'client_site',
        'other'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'inactive',
        'archived'
      )
    ),

  is_primary boolean not null default false,

  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country text,
  timezone text,

  main_phone text,
  general_email text,

  site_owner_person_id uuid
    references public.organization_people(id)
    on delete set null,

  site_manager_person_id uuid
    references public.organization_people(id)
    on delete set null,

  hse_contact_person_id uuid
    references public.organization_people(id)
    on delete set null,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    organization_id,
    site_reference
  )
);

create unique index if not exists organization_sites_one_primary_idx
  on public.organization_sites(organization_id)
  where is_primary
    and status <> 'archived';

create index if not exists organization_sites_lookup_idx
  on public.organization_sites(
    organization_id,
    status,
    site_name
  );

alter table public.organization_sites
  enable row level security;

drop policy if exists organization_sites_company_read
  on public.organization_sites;

create policy organization_sites_company_read
  on public.organization_sites
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organizations o
      where o.id = organization_sites.organization_id
        and o.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.organization_people p
      where p.organization_id = organization_sites.organization_id
        and p.user_id = auth.uid()
        and p.account_status = 'active'
    )
  );

drop policy if exists organization_sites_admin_manage
  on public.organization_sites;

create policy organization_sites_admin_manage
  on public.organization_sites
  for all
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_organization_people_admin(organization_id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_organization_people_admin(organization_id)
  );

grant select, insert, update, delete
  on public.organization_sites
  to authenticated;

grant all
  on public.organization_sites
  to service_role;

-- Create a primary Administration site from the registered
-- address currently held in Business Profile.

insert into public.organization_sites (
  organization_id,
  owner_id,
  site_reference,
  site_name,
  site_type,
  is_primary,
  address_line_1,
  address_line_2,
  city,
  region,
  postal_code,
  country,
  created_by,
  updated_by
)
select
  o.id,
  o.owner_id,
  'SITE-001',
  coalesce(
    nullif(o.name, ''),
    'Primary site'
  ),
  'registered_office',
  true,
  o.address_line_1,
  o.address_line_2,
  o.city,
  o.region,
  o.postal_code,
  o.country,
  o.owner_id,
  o.owner_id
from public.organizations o
where not exists (
  select 1
  from public.organization_sites s
  where s.organization_id = o.id
)
on conflict (
  organization_id,
  site_reference
)
do nothing;

-- Convert legacy additional Business Profile addresses
-- into controlled Administration Site Profiles.

insert into public.organization_sites (
  organization_id,
  owner_id,
  site_reference,
  site_name,
  site_type,
  is_primary,
  address_line_1,
  address_line_2,
  city,
  region,
  postal_code,
  country,
  created_by,
  updated_by
)
select
  o.id,
  o.owner_id,
  'SITE-' || lpad(
    (legacy.ordinality + 1)::text,
    3,
    '0'
  ),
  coalesce(
    nullif(
      legacy.site ->> 'site_name',
      ''
    ),
    'Site ' || (legacy.ordinality + 1)
  ),
  'operational_site',
  false,
  legacy.site ->> 'address_line_1',
  legacy.site ->> 'address_line_2',
  legacy.site ->> 'city',
  legacy.site ->> 'region',
  legacy.site ->> 'postal_code',
  legacy.site ->> 'country',
  o.owner_id,
  o.owner_id
from public.organizations o
cross join lateral jsonb_array_elements(
  coalesce(
    o.business_additional_sites,
    '[]'::jsonb
  )
) with ordinality as legacy(
  site,
  ordinality
)
where o.business_site_mode = 'multiple'
on conflict (
  organization_id,
  site_reference
)
do nothing;

-- Link each BCP continuity assessment to its corresponding
-- controlled Administration Site Profile.

alter table public.bcp_site_profiles
  add column if not exists organization_site_id uuid
  references public.organization_sites(id)
  on delete restrict;

-- First attempt to match the existing BCP location name.

update public.bcp_site_profiles b
set organization_site_id = s.id
from public.organization_sites s
where b.organization_site_id is null
  and s.organization_id = b.organization_id
  and lower(s.site_name) = lower(b.location_name);

-- If an exact match is unavailable, preserve the existing
-- BCP record by linking it to the organisation's primary site.

update public.bcp_site_profiles b
set organization_site_id = s.id
from public.organization_sites s
where b.organization_site_id is null
  and s.organization_id = b.organization_id
  and s.is_primary;

alter table public.bcp_site_profiles
  alter column organization_site_id
  set not null;

create index if not exists bcp_site_profiles_organization_site_idx
  on public.bcp_site_profiles(
    organization_id,
    organization_site_id,
    status
  );

comment on table public.organization_sites is
  'Authoritative Administration Site Profile used by audits, assets, H&S, permits, MOC and BCP.';

comment on column public.bcp_site_profiles.organization_site_id is
  'Controlled Administration site assessed for business continuity; not a second site master record.';
