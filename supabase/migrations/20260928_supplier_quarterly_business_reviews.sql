create table if not exists public.supplier_quarterly_business_reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  qbr_reference text not null,
  quarter text not null,
  review_date date not null,
  next_qbr_date date not null,
  participants text,
  approver_person_id uuid references public.organization_people(id) on delete set null,
  executive_conclusion text,
  recommended_decision text not null default 'maintain'
    check (recommended_decision in ('maintain','conditional','escalate','suspend','remove')),
  decision_rationale text,
  monitoring_level text not null default 'routine'
    check (monitoring_level in ('routine','enhanced','restricted')),
  approval_expiry date,
  approval_conditions text,
  scorecard jsonb not null default '{}'::jsonb,
  assurance_review jsonb not null default '{}'::jsonb,
  aerospace_review jsonb not null default '{}'::jsonb,
  risk_review jsonb not null default '{}'::jsonb,
  commercial_review jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, quarter)
);

create index if not exists supplier_qbr_supplier_date_idx
  on public.supplier_quarterly_business_reviews(supplier_id, review_date desc);
create index if not exists supplier_qbr_next_date_idx
  on public.supplier_quarterly_business_reviews(next_qbr_date)
  where status = 'completed';

alter table public.supplier_quarterly_business_reviews enable row level security;
drop policy if exists "Supplier owners manage quarterly reviews" on public.supplier_quarterly_business_reviews;
create policy "Supplier owners manage quarterly reviews"
  on public.supplier_quarterly_business_reviews for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

comment on table public.supplier_quarterly_business_reviews is
  'Controlled supplier Quarterly Business Review record covering performance, assurance, risk, actions and approval monitoring.';
