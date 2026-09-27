alter table public.internal_audits
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists internal_audits_supplier_idx
  on public.internal_audits (supplier_id, status, updated_at desc)
  where supplier_id is not null;

comment on column public.internal_audits.supplier_id is
  'Approved supplier selected when audit_type is supplier; links the audit lifecycle and findings to Supplier Assurance.';
