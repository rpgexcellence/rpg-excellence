create table if not exists public.bcp_strategy_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bia_assessment_id uuid not null references public.bcp_bia_assessments(id) on delete restrict,
  hazard_assessment_id uuid references public.bcp_hazard_assessments(id) on delete set null,
  outsourced_assessment_id uuid references public.bcp_outsourced_process_assessments(id) on delete set null,
  source_versions jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  assessment_reference text not null unique,
  assessment_title text not null,
  strategy_assessments jsonb not null default '[]'::jsonb,
  resource_requirements jsonb not null default '[]'::jsonb,
  implementation_actions jsonb not null default '[]'::jsonb,
  feasibility_summary jsonb not null default '{}'::jsonb,
  methodology jsonb not null default '{}'::jsonb,
  review_frequency text not null default 'Every 6 months',
  next_review_date date,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft','ready_for_review','changes_required','approved','archived')),
  version integer not null default 1,
  prepared_by text, reviewed_by text, reviewed_at timestamptz, review_comment text,
  approved_by text, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.bcp_strategy_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.bcp_strategy_assessments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null, status text not null, snapshot jsonb not null,
  change_reason text, created_at timestamptz not null default now(),
  unique (assessment_id, version)
);

create index if not exists bcp_strategy_assessments_org_idx on public.bcp_strategy_assessments(organization_id, updated_at desc);
alter table public.bcp_strategy_assessments enable row level security;
alter table public.bcp_strategy_assessment_versions enable row level security;
drop policy if exists "Users manage own BCP strategy assessments" on public.bcp_strategy_assessments;
create policy "Users manage own BCP strategy assessments" on public.bcp_strategy_assessments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Users manage own BCP strategy versions" on public.bcp_strategy_assessment_versions;
create policy "Users manage own BCP strategy versions" on public.bcp_strategy_assessment_versions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
notify pgrst, 'reload schema';
