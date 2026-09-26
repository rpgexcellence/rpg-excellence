alter table public.internal_audit_findings
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists internal_audit_findings_supplier_status_idx
  on public.internal_audit_findings (supplier_id, status, created_at desc)
  where supplier_id is not null;
