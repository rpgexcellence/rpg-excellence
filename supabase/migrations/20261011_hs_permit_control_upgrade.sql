begin;

-- Additive HSG250-aligned upgrade. The original permit table and records are retained.
alter table public.hs_permits
  add column if not exists asset_reference text,
  add column if not exists scope_limits text,
  add column if not exists prohibited_work text,
  add column if not exists stop_work_conditions text,
  add column if not exists permit_specific_controls jsonb not null default '{}'::jsonb,
  add column if not exists linked_permit_ids uuid[] not null default '{}'::uuid[],
  add column if not exists supporting_documents jsonb not null default '[]'::jsonb,
  add column if not exists work_party jsonb not null default '[]'::jsonb,
  add column if not exists issuer_person_id uuid,
  add column if not exists issuer_contact_snapshot jsonb,
  add column if not exists receiver_kind text,
  add column if not exists receiver_source text,
  add column if not exists receiver_person_id uuid,
  add column if not exists receiver_supplier_contact_id uuid,
  add column if not exists receiver_contact_snapshot jsonb,
  add column if not exists issuer_accepted_at timestamptz,
  add column if not exists receiver_accepted_at timestamptz,
  add column if not exists verification_completed_at timestamptz,
  add column if not exists handover_required boolean not null default false,
  add column if not exists completion_declared_at timestamptz,
  add column if not exists handback_accepted_at timestamptz,
  add column if not exists handback_accepted_by uuid,
  add column if not exists reinstatement_confirmation text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists version integer not null default 1;

alter table public.hs_permits
  drop constraint if exists hs_permits_status_check;

alter table public.hs_permits
  add constraint hs_permits_status_check check (status in (
    'draft',
    'awaiting_verification',
    'awaiting_acceptance',
    'issued',
    'suspended',
    'handover_required',
    'expired',
    'awaiting_handback',
    'closed',
    'cancelled'
  ));

alter table public.hs_permits
  drop constraint if exists hs_permits_receiver_kind_check;

alter table public.hs_permits
  add constraint hs_permits_receiver_kind_check
  check (receiver_kind is null or receiver_kind in ('internal','external'));

alter table public.hs_permits
  drop constraint if exists hs_permits_receiver_source_check;

alter table public.hs_permits
  add constraint hs_permits_receiver_source_check
  check (receiver_source is null or receiver_source in ('company_user','supplier_contact','manual'));

create table if not exists public.hs_permit_isolations (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  energy_type text not null,
  isolation_point text not null,
  isolation_method text not null,
  lock_tag_number text,
  applied_by uuid,
  applied_by_name text not null,
  applied_at timestamptz not null,
  verified_by uuid,
  verified_by_name text not null,
  verified_at timestamptz not null,
  verification_method text not null,
  common_to_permits uuid[] not null default '{}'::uuid[],
  reinstated_by uuid,
  reinstated_by_name text,
  reinstated_at timestamptz,
  reinstatement_verified_by uuid,
  reinstatement_verified_by_name text,
  reinstatement_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint hs_permit_isolation_independent_check
    check (verified_by is null or applied_by is null or verified_by <> applied_by)
);

create table if not exists public.hs_permit_atmosphere_tests (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  parameter text not null,
  unit text not null,
  minimum_limit numeric,
  maximum_limit numeric,
  actual_reading numeric not null,
  result text not null check (result in ('pass','fail')),
  instrument_id text not null,
  calibration_due date,
  tested_by uuid,
  tested_by_name text not null,
  tested_at timestamptz not null,
  retest_interval_minutes integer check (retest_interval_minutes is null or retest_interval_minutes > 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hs_permit_handovers (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  outgoing_person_id uuid,
  outgoing_person_name text not null,
  incoming_person_id uuid,
  incoming_person_name text not null,
  work_status text not null,
  outstanding_hazards text,
  isolations_remaining text,
  handed_over_at timestamptz not null,
  accepted_at timestamptz,
  authorised_by uuid,
  authorised_by_name text,
  authorised_at timestamptz,
  revised_valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hs_permit_events (
  id bigint generated by default as identity primary key,
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  reason text,
  actor_id uuid,
  actor_name text not null,
  permit_version integer not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hs_permit_isolations_permit_idx
  on public.hs_permit_isolations(permit_id);
create index if not exists hs_permit_atmosphere_tests_permit_time_idx
  on public.hs_permit_atmosphere_tests(permit_id, tested_at desc);
create index if not exists hs_permit_handovers_permit_time_idx
  on public.hs_permit_handovers(permit_id, handed_over_at desc);
create index if not exists hs_permit_events_permit_time_idx
  on public.hs_permit_events(permit_id, created_at desc);
create index if not exists hs_permits_asset_status_idx
  on public.hs_permits(organization_id, site_location, asset_reference, status);

alter table public.hs_permit_isolations enable row level security;
alter table public.hs_permit_atmosphere_tests enable row level security;
alter table public.hs_permit_handovers enable row level security;
alter table public.hs_permit_events enable row level security;

drop policy if exists "Owners manage permit isolations" on public.hs_permit_isolations;
create policy "Owners manage permit isolations" on public.hs_permit_isolations
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners manage permit atmosphere tests" on public.hs_permit_atmosphere_tests;
create policy "Owners manage permit atmosphere tests" on public.hs_permit_atmosphere_tests
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners manage permit handovers" on public.hs_permit_handovers;
create policy "Owners manage permit handovers" on public.hs_permit_handovers
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners view permit events" on public.hs_permit_events;
create policy "Owners view permit events" on public.hs_permit_events
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "Owners add permit events" on public.hs_permit_events;
create policy "Owners add permit events" on public.hs_permit_events
  for insert to authenticated with check (owner_id = auth.uid());

grant select, insert, update, delete on public.hs_permit_isolations to authenticated;
grant select, insert, update, delete on public.hs_permit_atmosphere_tests to authenticated;
grant select, insert, update, delete on public.hs_permit_handovers to authenticated;
grant select, insert on public.hs_permit_events to authenticated;
grant usage, select on sequence public.hs_permit_events_id_seq to authenticated;

grant all privileges on public.hs_permit_isolations to service_role;
grant all privileges on public.hs_permit_atmosphere_tests to service_role;
grant all privileges on public.hs_permit_handovers to service_role;
grant all privileges on public.hs_permit_events to service_role;

comment on table public.hs_permit_isolations is
  'Structured isolation, independent verification and controlled reinstatement records.';
comment on table public.hs_permit_atmosphere_tests is
  'Time-limited atmospheric test results supporting permit validity.';
comment on table public.hs_permit_handovers is
  'Shift/person-in-charge handover and renewed authorisation records.';
comment on table public.hs_permit_events is
  'Append-only operational audit trail for the permit lifecycle.';

commit;
