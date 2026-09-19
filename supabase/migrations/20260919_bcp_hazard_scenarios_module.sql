create table if not exists public.bcp_hazard_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_profile_id uuid references public.bcp_site_profiles(id) on delete set null,
  context_assessment_id uuid references public.bcp_context_assessments(id) on delete set null,
  role_assessment_id uuid references public.bcp_role_assessments(id) on delete set null,
  site_profile_version integer,
  context_assessment_version integer,
  role_assessment_version integer,
  source_snapshot jsonb not null default '{}'::jsonb,
  assessment_reference text not null unique,
  assessment_title text not null,
  participants jsonb not null default '[]'::jsonb,
  operational_description text,
  scenario_screening jsonb not null default '[]'::jsonb,
  scenario_assessments jsonb not null default '[]'::jsonb,
  methodology jsonb not null default '{}'::jsonb,
  review_frequency text not null default 'Semi-annually',
  next_review_date date,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft','ready_for_review','changes_required','approved','archived')),
  version integer not null default 1,
  prepared_by text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_comment text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bcp_hazard_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.bcp_hazard_assessments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (assessment_id, version)
);

create index if not exists bcp_hazard_assessments_org_idx on public.bcp_hazard_assessments(organization_id, updated_at desc);
create index if not exists bcp_hazard_assessments_profile_idx on public.bcp_hazard_assessments(site_profile_id);
alter table public.bcp_hazard_assessments enable row level security;
alter table public.bcp_hazard_assessment_versions enable row level security;

drop policy if exists "Owners manage hazard assessments" on public.bcp_hazard_assessments;
create policy "Owners manage hazard assessments" on public.bcp_hazard_assessments for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Owners manage hazard versions" on public.bcp_hazard_assessment_versions;
create policy "Owners manage hazard versions" on public.bcp_hazard_assessment_versions for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

