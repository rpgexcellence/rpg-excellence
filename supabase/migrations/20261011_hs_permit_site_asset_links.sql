begin;

create table if not exists public.organization_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_reference text not null,
  asset_name text not null,
  asset_type text not null default 'plant',
  site_location_id text,
  site_location_label text,
  area_department text,
  description text,
  operational_status text not null default 'active' check (operational_status in ('active','out_of_service','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,asset_reference)
);

alter table public.hs_permits
  add column if not exists administration_location_id text,
  add column if not exists organization_asset_id uuid references public.organization_assets(id) on delete set null,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists site_location_snapshot text,
  add column if not exists asset_snapshot jsonb,
  add column if not exists supplier_snapshot jsonb;

create index if not exists organization_assets_org_site_idx
  on public.organization_assets(organization_id,site_location_id,operational_status);
create index if not exists hs_permits_admin_location_idx
  on public.hs_permits(organization_id,administration_location_id);
create index if not exists hs_permits_org_asset_idx
  on public.hs_permits(organization_id,organization_asset_id);
create index if not exists hs_permits_supplier_idx
  on public.hs_permits(organization_id,supplier_id);

alter table public.organization_assets enable row level security;

drop policy if exists "Company users view active assets" on public.organization_assets;
create policy "Company users view active assets"
on public.organization_assets for select to authenticated
using (
  public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','view')
);

drop policy if exists "Company contributors manage assets" on public.organization_assets;
create policy "Company contributors manage assets"
on public.organization_assets for all to authenticated
using (
  owner_id=auth.uid()
  or public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','contribute')
)
with check (
  owner_id=auth.uid()
  or public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','contribute')
);

grant select,insert,update,delete on public.organization_assets to authenticated;
grant all privileges on public.organization_assets to service_role;

comment on table public.organization_assets is
  'Controlled company plant, equipment, rooms and systems selectable by risk and permit modules.';

commit;
