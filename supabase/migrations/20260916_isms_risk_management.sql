create table if not exists public.isms_risk_methodologies (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null default 'ISMS 5×5 methodology', version text not null default '1.0', status text not null default 'approved' check(status in ('draft','approved','retired')),
  likelihood_criteria jsonb not null default '[{"score":1,"label":"Rare"},{"score":2,"label":"Unlikely"},{"score":3,"label":"Possible"},{"score":4,"label":"Likely"},{"score":5,"label":"Almost certain"}]'::jsonb,
  impact_criteria jsonb not null default '[{"score":1,"label":"Insignificant"},{"score":2,"label":"Minor"},{"score":3,"label":"Moderate"},{"score":4,"label":"Major"},{"score":5,"label":"Severe"}]'::jsonb,
  risk_bands jsonb not null default '[{"min":1,"max":4,"label":"Low"},{"min":5,"max":9,"label":"Moderate"},{"min":10,"max":14,"label":"High"},{"min":15,"max":19,"label":"Very high"},{"min":20,"max":25,"label":"Critical"}]'::jsonb,
  appetite_score integer not null default 9 check(appetite_score between 1 and 25), impact_rule text not null default 'highest_credible', approved_by text, approved_at timestamptz default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,version)
);

create table if not exists public.isms_assets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade, asset_reference text not null,
  asset_name text not null, asset_type text not null default 'information', description text, business_owner text,
  confidentiality integer check(confidentiality between 1 and 5), integrity integer check(integrity between 1 and 5), availability integer check(availability between 1 and 5),
  classification text, status text not null default 'active' check(status in ('active','retired')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,asset_reference)
);

create table if not exists public.isms_risks (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  methodology_id uuid references public.isms_risk_methodologies(id) on delete set null,
  soa_assessment_id uuid references public.assessments(id) on delete set null,
  risk_reference text not null unique, title text not null, cause text not null, event text not null, consequence text not null,
  risk_owner text not null, source text, scope text, cia_properties text[] not null default '{}', affected_processes text[] not null default '{}',
  status text not null default 'draft' check(status in ('draft','assessed','treatment_required','treatment_in_progress','acceptance_pending','approved','review_due','closed','archived')),
  treatment_decision text check(treatment_decision in ('modify','avoid','share','retain')),
  inherent_likelihood integer not null check(inherent_likelihood between 1 and 5), inherent_impact integer not null check(inherent_impact between 1 and 5), inherent_score integer generated always as (inherent_likelihood*inherent_impact) stored,
  residual_likelihood integer not null check(residual_likelihood between 1 and 5), residual_impact integer not null check(residual_impact between 1 and 5), residual_score integer generated always as (residual_likelihood*residual_impact) stored,
  target_likelihood integer check(target_likelihood between 1 and 5), target_impact integer check(target_impact between 1 and 5), target_score integer generated always as (case when target_likelihood is null or target_impact is null then null else target_likelihood*target_impact end) stored,
  impact_dimensions jsonb not null default '{}'::jsonb, assessment_rationale text not null, assumptions text, evidence_reference text,
  review_due_date date, last_reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.isms_risk_assets (
  risk_id uuid not null references public.isms_risks(id) on delete cascade, asset_id uuid not null references public.isms_assets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, relationship text not null default 'affected', primary key(risk_id,asset_id)
);

create table if not exists public.isms_risk_controls (
  id uuid primary key default gen_random_uuid(), risk_id uuid not null references public.isms_risks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete cascade, control_id text not null, treatment_purpose text,
  design_status text not null default 'not_assessed' check(design_status in ('not_assessed','inadequate','partially_adequate','adequate')),
  operating_effectiveness text not null default 'not_tested' check(operating_effectiveness in ('not_tested','ineffective','partially_effective','effective')),
  evidence_reference text, review_due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(risk_id,assessment_id,control_id)
);

create table if not exists public.isms_risk_treatments (
  id uuid primary key default gen_random_uuid(), risk_id uuid not null references public.isms_risks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, action text not null, action_owner text not null,
  target_date date, status text not null default 'planned' check(status in ('planned','in_progress','implemented','verified','cancelled')),
  resources text, completion_evidence text, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.isms_risk_acceptances (
  id uuid primary key default gen_random_uuid(), risk_id uuid not null references public.isms_risks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, acceptance_authority text not null, rationale text not null,
  conditions text, accepted_score integer not null, decision text not null default 'pending' check(decision in ('pending','accepted','rejected','expired')),
  decided_at timestamptz, expires_at date, created_at timestamptz not null default now()
);

create index if not exists isms_risks_org_idx on public.isms_risks(organization_id,status,residual_score desc);
create index if not exists isms_risk_controls_control_idx on public.isms_risk_controls(assessment_id,control_id);
create index if not exists isms_risk_treatments_risk_idx on public.isms_risk_treatments(risk_id,status);

alter table public.isms_risk_methodologies enable row level security;
alter table public.isms_assets enable row level security;
alter table public.isms_risks enable row level security;
alter table public.isms_risk_assets enable row level security;
alter table public.isms_risk_controls enable row level security;
alter table public.isms_risk_treatments enable row level security;
alter table public.isms_risk_acceptances enable row level security;

grant select,insert,update,delete on public.isms_risk_methodologies,public.isms_assets,public.isms_risks,public.isms_risk_assets,public.isms_risk_controls,public.isms_risk_treatments,public.isms_risk_acceptances to authenticated;

drop policy if exists "Users manage own ISMS methodologies" on public.isms_risk_methodologies;
create policy "Users manage own ISMS methodologies" on public.isms_risk_methodologies for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS assets" on public.isms_assets;
create policy "Users manage own ISMS assets" on public.isms_assets for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS risks" on public.isms_risks;
create policy "Users manage own ISMS risks" on public.isms_risks for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS risk assets" on public.isms_risk_assets;
create policy "Users manage own ISMS risk assets" on public.isms_risk_assets for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS risk controls" on public.isms_risk_controls;
create policy "Users manage own ISMS risk controls" on public.isms_risk_controls for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS treatments" on public.isms_risk_treatments;
create policy "Users manage own ISMS treatments" on public.isms_risk_treatments for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "Users manage own ISMS acceptances" on public.isms_risk_acceptances;
create policy "Users manage own ISMS acceptances" on public.isms_risk_acceptances for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
