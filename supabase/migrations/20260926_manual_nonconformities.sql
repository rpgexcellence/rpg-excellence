alter table public.internal_audit_findings
  alter column audit_id drop not null;

alter table public.internal_audit_findings
  add column if not exists source_type text not null default 'internal_audit',
  add column if not exists source_category text,
  add column if not exists source_reference text,
  add column if not exists detected_at date;

update public.internal_audit_findings
set source_type = 'internal_audit'
where source_type is null;

alter table public.internal_audit_findings
  drop constraint if exists internal_audit_findings_source_type_check;

alter table public.internal_audit_findings
  add constraint internal_audit_findings_source_type_check
  check (source_type in ('internal_audit', 'manual'));

create index if not exists internal_audit_findings_manual_source_idx
  on public.internal_audit_findings (owner_id, source_type, created_at desc);
