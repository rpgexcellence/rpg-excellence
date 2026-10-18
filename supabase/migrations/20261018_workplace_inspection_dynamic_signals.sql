begin;

alter table public.hs_inspection_risk_signals
  add column if not exists suggested_pack_code text,
  add column if not exists source_key text;

update public.hs_inspection_risk_signals
set source_key = coalesce(source_record_id::text, source_reference, id::text) || ':' || signal_type
where source_key is null;

alter table public.hs_inspection_risk_signals
  alter column source_key set not null;

create unique index if not exists hs_inspection_risk_signals_source_unique
  on public.hs_inspection_risk_signals
  (organization_id, programme_id, source_module, source_key);

create index if not exists hs_inspection_risk_signals_site_active_idx
  on public.hs_inspection_risk_signals
  (organization_id, administration_location_id, active, occurred_at desc);

alter table public.hs_inspection_programmes
  add column if not exists signals_last_synchronised_at timestamptz,
  add column if not exists signals_synchronisation_summary jsonb not null default '{}'::jsonb;

comment on column public.hs_inspection_risk_signals.suggested_pack_code is
  'Optional specialist checklist pack recommended by the connected source record.';

comment on column public.hs_inspection_risk_signals.source_key is
  'Stable source identity used to refresh a signal without creating duplicates.';

comment on column public.hs_inspection_programmes.signals_last_synchronised_at is
  'Most recent successful cross-module planning-signal synchronisation.';

commit;
