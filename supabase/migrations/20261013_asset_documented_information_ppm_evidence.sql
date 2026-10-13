begin;

alter table public.organization_assets
  add column if not exists maintenance_owner_type text,
  add column if not exists maintenance_owner_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists maintenance_supplier_id uuid references public.suppliers(id) on delete set null;

do $$ begin
  alter table public.organization_assets
    add constraint organization_assets_maintenance_owner_type_check
    check (maintenance_owner_type is null or maintenance_owner_type in ('internal','supplier'));
exception when duplicate_object then null; end $$;

alter table public.organization_asset_maintenance
  add column if not exists maintenance_owner_type text,
  add column if not exists responsible_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists evidence_storage_path text,
  add column if not exists evidence_file_name text,
  add column if not exists evidence_mime_type text,
  add column if not exists evidence_size_bytes bigint;

do $$ begin
  alter table public.organization_asset_maintenance
    add constraint organization_asset_maintenance_owner_type_check
    check (maintenance_owner_type is null or maintenance_owner_type in ('internal','supplier'));
exception when duplicate_object then null; end $$;

create table if not exists public.organization_asset_document_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.organization_assets(id) on delete cascade,
  controlled_document_id uuid not null references public.controlled_documents(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (asset_id,controlled_document_id)
);

create index if not exists organization_asset_document_links_asset_idx
  on public.organization_asset_document_links(organization_id,asset_id);
create index if not exists organization_assets_maintenance_person_idx
  on public.organization_assets(organization_id,maintenance_owner_person_id);
create index if not exists organization_assets_maintenance_supplier_idx
  on public.organization_assets(organization_id,maintenance_supplier_id);

alter table public.organization_asset_document_links enable row level security;

drop policy if exists "Company users view asset document links" on public.organization_asset_document_links;
create policy "Company users view asset document links"
on public.organization_asset_document_links for select to authenticated
using (
  owner_id=auth.uid()
  or public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','view')
);

drop policy if exists "Company contributors manage asset document links" on public.organization_asset_document_links;
create policy "Company contributors manage asset document links"
on public.organization_asset_document_links for all to authenticated
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

grant select,insert,update,delete on public.organization_asset_document_links to authenticated;
grant all privileges on public.organization_asset_document_links to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'asset-maintenance-evidence','asset-maintenance-evidence',false,10485760,
  array[
    'application/pdf','image/png','image/jpeg','text/plain','text/csv',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Company users read asset maintenance evidence" on storage.objects;
create policy "Company users read asset maintenance evidence"
on storage.objects for select to authenticated
using (
  bucket_id='asset-maintenance-evidence'
  and exists (
    select 1 from public.organizations o
    where o.id::text=(storage.foldername(name))[1]
      and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))
  )
);

drop policy if exists "Company admins upload asset maintenance evidence" on storage.objects;
create policy "Company admins upload asset maintenance evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id='asset-maintenance-evidence'
  and exists (
    select 1 from public.organizations o
    where o.id::text=(storage.foldername(name))[1]
      and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))
  )
);

comment on table public.organization_asset_document_links is
  'Controlled links from company assets to current work instructions, operating manuals and other documented information.';
comment on column public.organization_assets.maintenance_owner_type is
  'Identifies whether PPM delivery is internal or performed by an approved supplier.';
comment on column public.organization_assets.maintenance_owner_person_id is
  'Internal Company User accountable for maintenance coordination and completion.';

commit;
