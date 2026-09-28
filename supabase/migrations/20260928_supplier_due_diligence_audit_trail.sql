create table if not exists public.supplier_due_diligence_events (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  control_id text not null,
  event_type text not null,
  previous_value jsonb,
  new_value jsonb not null,
  event_summary text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_dd_events_control_idx
  on public.supplier_due_diligence_events(supplier_id, control_id, created_at desc);
alter table public.supplier_due_diligence_events enable row level security;
grant select, insert on public.supplier_due_diligence_events to authenticated;
drop policy if exists "Supplier owners read due diligence events" on public.supplier_due_diligence_events;
create policy "Supplier owners read due diligence events" on public.supplier_due_diligence_events for select to authenticated using (owner_id = auth.uid());
drop policy if exists "Supplier owners create due diligence events" on public.supplier_due_diligence_events;
create policy "Supplier owners create due diligence events" on public.supplier_due_diligence_events for insert to authenticated with check (owner_id = auth.uid());
