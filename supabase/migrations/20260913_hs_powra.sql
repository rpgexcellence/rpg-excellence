begin;

create table if not exists public.hs_powra_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  powra_reference text not null unique,
  task text not null,
  site_location text,
  work_area text,
  completed_by text not null,
  team_members text,
  assessment_date date not null default current_date,
  linked_assessment_id uuid references public.hs_risk_assessments(id) on delete set null,
  linked_permit_reference text,
  prestart_checks jsonb not null default '[]'::jsonb,
  hazards jsonb not null default '[]'::jsonb,
  other_hazard text,
  additional_controls jsonb not null default '[]'::jsonb,
  decision text not null check (decision in ('safe_to_start','supervisor_review','stop_work')),
  decision_reason text,
  supervisor_name text,
  supervisor_approved_at timestamptz,
  end_review jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','supervisor_review','stopped','closed','cancelled')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hs_powra_owner_updated_idx on public.hs_powra_assessments(owner_id, updated_at desc);
create index if not exists hs_powra_organisation_status_idx on public.hs_powra_assessments(organization_id, status);
create index if not exists hs_powra_linked_assessment_idx on public.hs_powra_assessments(linked_assessment_id);

alter table public.hs_powra_assessments enable row level security;
drop policy if exists "Owners manage POWRA" on public.hs_powra_assessments;
create policy "Owners manage POWRA" on public.hs_powra_assessments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.hs_powra_assessments to authenticated;
grant all privileges on public.hs_powra_assessments to service_role;

commit;
