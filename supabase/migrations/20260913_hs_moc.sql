begin;

create table if not exists public.hs_moc_changes (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade, moc_reference text not null unique,
  title text not null, requestor_name text not null, department text not null, date_requested date not null default current_date,
  change_description text not null, change_type text not null, duration_type text not null check (duration_type in ('temporary','permanent')),
  temporary_end_date date, affected_area text not null, equipment_id text, new_chemical boolean not null default false,
  screening_answers jsonb not null default '[]'::jsonb, pathway text not null check (pathway in ('lite','full')),
  hse_gate_status text not null default 'pending' check (hse_gate_status in ('pending','verified','returned')),
  hse_gate_reviewer text, hse_gate_comments text, hse_gate_at timestamptz, path_answers jsonb not null default '[]'::jsonb,
  impact_areas jsonb not null default '[]'::jsonb, risk_level text check (risk_level in ('low','medium','high')),
  linked_assessment_id uuid references public.hs_risk_assessments(id) on delete set null,
  hazard_analysis_required boolean not null default false, hazard_analysis_type text,
  pssr_required boolean not null default false, pssr_complete boolean not null default false,
  implementation_plan text, target_date date not null, approvals jsonb not null default '{}'::jsonb,
  actual_date date, post_implementation_review text, closure_approver text, closure_comments text,
  status text not null default 'draft' check (status in ('draft','screening_complete','hse_gate','risk_review','approval','approved','implementation','verification','closed','returned','rejected','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), closed_at timestamptz,
  constraint hs_moc_temporary_end check (duration_type='permanent' or temporary_end_date is not null)
);

create table if not exists public.hs_moc_actions (
  id uuid primary key default gen_random_uuid(), moc_id uuid not null references public.hs_moc_changes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, action_required text not null, responsible_name text not null,
  target_date date not null, status text not null default 'open' check (status in ('open','complete','verified','cancelled')),
  evidence text, completed_at timestamptz, created_at timestamptz not null default now()
);

create index if not exists hs_moc_owner_updated_idx on public.hs_moc_changes(owner_id,updated_at desc);
create index if not exists hs_moc_org_status_idx on public.hs_moc_changes(organization_id,status);
create index if not exists hs_moc_actions_moc_idx on public.hs_moc_actions(moc_id,status);
alter table public.hs_moc_changes enable row level security; alter table public.hs_moc_actions enable row level security;
drop policy if exists "Owners manage MOC" on public.hs_moc_changes;
create policy "Owners manage MOC" on public.hs_moc_changes for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Owners manage MOC actions" on public.hs_moc_actions;
create policy "Owners manage MOC actions" on public.hs_moc_actions for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select,insert,update,delete on public.hs_moc_changes,public.hs_moc_actions to authenticated;
grant all privileges on public.hs_moc_changes,public.hs_moc_actions to service_role;
commit;
