create table if not exists public.bcp_role_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_profile_id uuid references public.bcp_site_profiles(id) on delete set null,
  context_assessment_id uuid references public.bcp_context_assessments(id) on delete set null,
  assessment_reference text not null unique,
  assessment_title text not null default 'BCMS roles and responsibilities',
  status text not null default 'draft' check(status in ('draft','ready_for_review','changes_required','approved','archived')),
  version integer not null default 1,
  site_profile_version integer,
  context_assessment_version integer,
  source_snapshot jsonb not null default '{}'::jsonb,
  roles jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  notes text,
  distribution text,
  completion_percent integer not null default 0 check(completion_percent between 0 and 100),
  review_due_date date,
  prepared_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_comment text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bcp_roles_org_idx on public.bcp_role_assessments(organization_id,updated_at desc);
create index if not exists bcp_roles_profile_idx on public.bcp_role_assessments(site_profile_id);
alter table public.bcp_role_assessments enable row level security;
grant select,insert,update,delete on table public.bcp_role_assessments to authenticated;
drop policy if exists "Users manage own BCP role assessments" on public.bcp_role_assessments;
create policy "Users manage own BCP role assessments" on public.bcp_role_assessments for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create table if not exists public.bcp_role_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.bcp_role_assessments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null default '{}'::jsonb,
  change_reason text,
  created_at timestamptz not null default now(),
  unique(assessment_id,version)
);
create index if not exists bcp_roles_versions_idx on public.bcp_role_assessment_versions(assessment_id,version desc);
alter table public.bcp_role_assessment_versions enable row level security;
grant select,insert,update,delete on table public.bcp_role_assessment_versions to authenticated;
drop policy if exists "Users manage own BCP role versions" on public.bcp_role_assessment_versions;
create policy "Users manage own BCP role versions" on public.bcp_role_assessment_versions for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
