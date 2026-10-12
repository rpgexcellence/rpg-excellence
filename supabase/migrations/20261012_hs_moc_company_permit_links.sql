begin;

alter table public.hs_moc_changes
  add column if not exists administration_location_id text,
  add column if not exists administration_location_snapshot text,
  add column if not exists requestor_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists change_owner_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists hse_reviewer_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists closure_approver_person_id uuid references public.organization_people(id) on delete set null;

alter table public.hs_moc_actions
  add column if not exists responsible_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists verifier_person_id uuid references public.organization_people(id) on delete set null;

create table if not exists public.hs_moc_permits (
  moc_id uuid not null references public.hs_moc_changes(id) on delete cascade,
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  relationship_type text not null default 'required_for_change'
    check (relationship_type in ('required_for_change','implementation','isolation','commissioning','related')),
  created_at timestamptz not null default now(),
  primary key (moc_id,permit_id)
);

create table if not exists public.hs_moc_risk_assessments (
  moc_id uuid not null references public.hs_moc_changes(id) on delete cascade,
  assessment_id uuid not null references public.hs_risk_assessments(id) on delete cascade,
  relationship_type text not null default 'change_risk'
    check (relationship_type in ('change_risk','task_risk','commissioning','environmental','related')),
  created_at timestamptz not null default now(),
  primary key (moc_id,assessment_id)
);

create index if not exists hs_moc_location_idx
  on public.hs_moc_changes(organization_id,administration_location_id);
create index if not exists hs_moc_requestor_idx
  on public.hs_moc_changes(organization_id,requestor_person_id);
create index if not exists hs_moc_change_owner_idx
  on public.hs_moc_changes(organization_id,change_owner_person_id);
create index if not exists hs_moc_permits_permit_idx on public.hs_moc_permits(permit_id);
create index if not exists hs_moc_risk_assessments_assessment_idx on public.hs_moc_risk_assessments(assessment_id);

alter table public.hs_moc_permits enable row level security;
alter table public.hs_moc_risk_assessments enable row level security;
drop policy if exists "MOC participants view linked permits" on public.hs_moc_permits;
create policy "MOC participants view linked permits"
on public.hs_moc_permits for select to authenticated
using (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_permits.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','view')
  )
));

drop policy if exists "MOC contributors manage linked permits" on public.hs_moc_permits;
create policy "MOC contributors manage linked permits"
on public.hs_moc_permits for all to authenticated
using (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_permits.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','contribute')
  )
))
with check (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_permits.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','contribute')
  )
));

grant select,insert,update,delete on public.hs_moc_permits to authenticated;
grant all privileges on public.hs_moc_permits to service_role;

drop policy if exists "MOC participants view linked assessments" on public.hs_moc_risk_assessments;
create policy "MOC participants view linked assessments"
on public.hs_moc_risk_assessments for select to authenticated
using (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_risk_assessments.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','view')
  )
));

drop policy if exists "MOC contributors manage linked assessments" on public.hs_moc_risk_assessments;
create policy "MOC contributors manage linked assessments"
on public.hs_moc_risk_assessments for all to authenticated
using (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_risk_assessments.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','contribute')
  )
))
with check (exists (
  select 1 from public.hs_moc_changes moc
  where moc.id=hs_moc_risk_assessments.moc_id
  and (
    moc.owner_id=auth.uid()
    or public.is_organization_people_admin(moc.organization_id)
    or public.has_organization_module_access(moc.organization_id,'risk_management','contribute')
  )
));

grant select,insert,update,delete on public.hs_moc_risk_assessments to authenticated;
grant all privileges on public.hs_moc_risk_assessments to service_role;

comment on table public.hs_moc_permits is
  'Controlled many-to-many relationship between Management of Change records and Permit to Work records.';
comment on table public.hs_moc_risk_assessments is
  'Controlled many-to-many relationship between Management of Change records and approved risk assessments.';
comment on column public.hs_moc_changes.administration_location_id is
  'Controlled Administration Business Profile location identifier.';
comment on column public.hs_moc_changes.change_owner_person_id is
  'Accountable change owner selected from active Company Users.';

commit;
