create table if not exists public.bcp_site_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_reference text not null unique, status text not null default 'draft' check(status in ('draft','ready_for_review','approved','archived')),
  region text, location_name text not null, country text, address text, headcount integer,
  site_leader text not null, site_leader_email text, regional_facilitator text, local_facilitator text not null,
  operational_description text not null, critical_products_services text, operating_hours text,
  value_chain_processes jsonb not null default '[]'::jsonb, support_processes jsonb not null default '[]'::jsonb,
  site_dependencies jsonb not null default '{}'::jsonb, interested_parties jsonb not null default '[]'::jsonb,
  infosec_description text, remote_support text, training_participants jsonb not null default '[]'::jsonb,
  completion_percent integer not null default 0, review_due_date date, approved_by text, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists bcp_site_profiles_org_idx on public.bcp_site_profiles(organization_id,updated_at desc);
alter table public.bcp_site_profiles enable row level security;
drop policy if exists "Users manage own BCP profiles" on public.bcp_site_profiles;
create policy "Users manage own BCP profiles" on public.bcp_site_profiles for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create table if not exists public.bcp_training_progress (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phase_code text not null, score integer not null default 0, status text not null default 'not_started' check(status in ('not_started','in_progress','complete')),
  completed_at timestamptz, evidence jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  unique(owner_id,organization_id,phase_code)
);
alter table public.bcp_training_progress enable row level security;
drop policy if exists "Users manage own BCP training" on public.bcp_training_progress;
create policy "Users manage own BCP training" on public.bcp_training_progress for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
