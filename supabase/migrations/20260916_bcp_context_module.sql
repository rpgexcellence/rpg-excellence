create table if not exists public.bcp_context_assessments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_profile_id uuid references public.bcp_site_profiles(id) on delete set null,
  assessment_reference text not null unique,
  status text not null default 'draft' check (status in ('draft','ready_for_review','approved','archived')),
  assessment_title text not null default 'Organisational context and interested parties', participants text,
  risk_appetite integer not null default 3 check (risk_appetite between 1 and 5),
  external_context jsonb not null default '[]'::jsonb, internal_context jsonb not null default '[]'::jsonb,
  interested_parties jsonb not null default '[]'::jsonb, objectives jsonb not null default '[]'::jsonb,
  risks_opportunities jsonb not null default '[]'::jsonb, scope_data jsonb not null default '{}'::jsonb,
  completion_percent integer not null default 0, review_due_date date, approved_by text, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bcp_context_org_idx on public.bcp_context_assessments(organization_id,updated_at desc);
create index if not exists bcp_context_profile_idx on public.bcp_context_assessments(site_profile_id);
alter table public.bcp_context_assessments enable row level security;
grant select, insert, update, delete on table public.bcp_context_assessments to authenticated;
drop policy if exists "Users manage own BCP context assessments" on public.bcp_context_assessments;
create policy "Users manage own BCP context assessments" on public.bcp_context_assessments for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
