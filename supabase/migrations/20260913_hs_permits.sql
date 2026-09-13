begin;

create table if not exists public.hs_permits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  permit_reference text not null unique,
  permit_type text not null check (permit_type in ('hot_work','confined_space','electrical','work_at_height','excavation','lifting','general')),
  task_description text not null,
  site_location text not null,
  work_area text,
  equipment_asset text,
  contractor_company text,
  linked_assessment_id uuid references public.hs_risk_assessments(id) on delete set null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  hazards jsonb not null default '[]'::jsonb,
  precautions jsonb not null default '[]'::jsonb,
  isolations text,
  emergency_arrangements text not null,
  issuer_name text not null,
  receiver_name text not null,
  issuer_declaration boolean not null default false,
  receiver_declaration boolean not null default false,
  status text not null default 'draft' check (status in ('draft','issued','suspended','expired','closed','cancelled')),
  issued_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  closed_at timestamptz,
  closeout_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hs_permits_valid_period check (valid_until > valid_from)
);

create index if not exists hs_permits_owner_updated_idx on public.hs_permits(owner_id, updated_at desc);
create index if not exists hs_permits_organisation_status_idx on public.hs_permits(organization_id, status);
create index if not exists hs_permits_valid_until_idx on public.hs_permits(valid_until);

alter table public.hs_permits enable row level security;
drop policy if exists "Owners manage permits" on public.hs_permits;
create policy "Owners manage permits" on public.hs_permits for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on public.hs_permits to authenticated;
grant all privileges on public.hs_permits to service_role;

commit;
