create table if not exists public.supplier_qbr_actions (
  id uuid primary key default gen_random_uuid(),
  qbr_id uuid not null references public.supplier_quarterly_business_reviews(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  action_reference text not null,
  action_required text not null,
  accountable_type text not null check (accountable_type in ('company_person','supplier_contact')),
  accountable_person_id uuid references public.organization_people(id) on delete set null,
  accountable_contact_id uuid references public.supplier_contacts(id) on delete set null,
  accountable_name text not null,
  reviewer_type text not null check (reviewer_type in ('company_person','supplier_contact')),
  reviewer_person_id uuid references public.organization_people(id) on delete set null,
  reviewer_contact_id uuid references public.supplier_contacts(id) on delete set null,
  reviewer_name text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open','in_progress','awaiting_review','closed')),
  closure_evidence text,
  closed_at timestamptz,
  closed_by_user_id uuid references auth.users(id) on delete set null,
  closed_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (qbr_id, action_reference),
  check ((accountable_type = 'company_person' and accountable_person_id is not null) or (accountable_type = 'supplier_contact' and accountable_contact_id is not null)),
  check ((reviewer_type = 'company_person' and reviewer_person_id is not null) or (reviewer_type = 'supplier_contact' and reviewer_contact_id is not null))
);

create table if not exists public.supplier_qbr_action_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.supplier_qbr_actions(id) on delete cascade,
  qbr_id uuid not null references public.supplier_quarterly_business_reviews(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  event_summary text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_qbr_actions_qbr_idx on public.supplier_qbr_actions(qbr_id, status, due_date);
create index if not exists supplier_qbr_action_events_action_idx on public.supplier_qbr_action_events(action_id, created_at desc);
alter table public.supplier_qbr_actions enable row level security;
alter table public.supplier_qbr_action_events enable row level security;
grant select, insert, update, delete on public.supplier_qbr_actions to authenticated;
grant select, insert on public.supplier_qbr_action_events to authenticated;
drop policy if exists "Supplier owners manage QBR actions" on public.supplier_qbr_actions;
create policy "Supplier owners manage QBR actions" on public.supplier_qbr_actions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Supplier owners read QBR action events" on public.supplier_qbr_action_events;
create policy "Supplier owners read QBR action events" on public.supplier_qbr_action_events for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Supplier owners create QBR action events" on public.supplier_qbr_action_events;
create policy "Supplier owners create QBR action events" on public.supplier_qbr_action_events for insert to authenticated with check (owner_id = auth.uid());
