begin;

alter table public.organization_assets
  add column if not exists asset_owner_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists manufacturer text,
  add column if not exists model text,
  add column if not exists serial_number text,
  add column if not exists criticality text not null default 'medium',
  add column if not exists ppm_required boolean not null default false,
  add column if not exists ppm_frequency_value integer,
  add column if not exists ppm_frequency_unit text,
  add column if not exists last_maintenance_date date,
  add column if not exists next_maintenance_date date,
  add column if not exists maintenance_provider text,
  add column if not exists maintenance_notes text,
  add column if not exists change_control_required boolean not null default true;

do $$ begin
  alter table public.organization_assets
    add constraint organization_assets_criticality_check
    check (criticality in ('low','medium','high','critical'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.organization_assets
    add constraint organization_assets_ppm_frequency_check
    check (
      (ppm_required=false)
      or (
        ppm_frequency_value is not null and ppm_frequency_value > 0
        and ppm_frequency_unit in ('days','weeks','months','years')
        and next_maintenance_date is not null
      )
    );
exception when duplicate_object then null; end $$;

create or replace function public.generate_asset_reference()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if nullif(trim(new.asset_reference),'') is null then
    loop
      new.asset_reference := 'AST-' || extract(year from now())::text || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
      exit when not exists (
        select 1 from public.organization_assets
        where organization_id=new.organization_id and asset_reference=new.asset_reference
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists organization_assets_generate_reference on public.organization_assets;
create trigger organization_assets_generate_reference
before insert on public.organization_assets
for each row execute function public.generate_asset_reference();

create table if not exists public.organization_asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.organization_assets(id) on delete cascade,
  maintenance_reference text not null,
  maintenance_type text not null default 'planned',
  scheduled_date date not null,
  completed_date date,
  performed_by text,
  work_completed text,
  evidence_reference text,
  status text not null default 'planned',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,maintenance_reference),
  constraint organization_asset_maintenance_type_check check (maintenance_type in ('planned','inspection','calibration','statutory','repair','breakdown','other')),
  constraint organization_asset_maintenance_status_check check (status in ('planned','due','overdue','in_progress','completed','cancelled'))
);

alter table public.hs_moc_changes
  add column if not exists organization_asset_id uuid references public.organization_assets(id) on delete set null,
  add column if not exists asset_snapshot jsonb;

create index if not exists organization_assets_owner_idx
  on public.organization_assets(organization_id,asset_owner_person_id);
create index if not exists organization_assets_ppm_due_idx
  on public.organization_assets(organization_id,next_maintenance_date)
  where ppm_required=true and operational_status='active';
create index if not exists organization_asset_maintenance_asset_idx
  on public.organization_asset_maintenance(asset_id,scheduled_date desc);
create index if not exists hs_moc_changes_asset_idx
  on public.hs_moc_changes(organization_id,organization_asset_id);

alter table public.organization_asset_maintenance enable row level security;

drop policy if exists "Company users view asset maintenance" on public.organization_asset_maintenance;
create policy "Company users view asset maintenance"
on public.organization_asset_maintenance for select to authenticated
using (
  owner_id=auth.uid()
  or public.is_organization_people_admin(organization_id)
  or public.has_organization_module_access(organization_id,'risk_management','view')
);

drop policy if exists "Company contributors manage asset maintenance" on public.organization_asset_maintenance;
create policy "Company contributors manage asset maintenance"
on public.organization_asset_maintenance for all to authenticated
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

grant select,insert,update,delete on public.organization_asset_maintenance to authenticated;
grant all privileges on public.organization_asset_maintenance to service_role;

comment on column public.organization_assets.asset_owner_person_id is
  'Accountable asset owner selected from the active Company User directory.';
comment on column public.organization_assets.next_maintenance_date is
  'Calculated or confirmed PPM due date used by the maintenance dashboard.';
comment on column public.hs_moc_changes.organization_asset_id is
  'Controlled relational link from Management of Change to the affected company asset.';

commit;
