-- Controlled Administration, evidence-source and finding-owner links.
-- Nullable fields preserve every existing audit record.

alter table public.internal_audits
  add column if not exists administration_location_id text,
  add column if not exists administration_location_label text;

alter table public.internal_audit_evidence
  add column if not exists source_type text,
  add column if not exists source_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists source_supplier_contact_id uuid references public.supplier_contacts(id) on delete set null,
  add column if not exists attachment_name text,
  add column if not exists attachment_path text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

alter table public.internal_audit_findings
  add column if not exists responsible_owner_person_id uuid references public.organization_people(id) on delete restrict,
  add column if not exists responsible_owner_supplier_contact_id uuid references public.supplier_contacts(id) on delete restrict;

create index if not exists internal_audit_location_idx on public.internal_audits(organization_id, administration_location_id);
create index if not exists internal_audit_finding_person_owner_idx on public.internal_audit_findings(responsible_owner_person_id);
create index if not exists internal_audit_finding_supplier_contact_idx on public.internal_audit_findings(responsible_owner_supplier_contact_id);
