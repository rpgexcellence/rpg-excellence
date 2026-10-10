begin;

alter table public.hs_risk_assessments
  add column if not exists administration_location_id text,
  add column if not exists assessor_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists linked_permit_id uuid references public.hs_permits(id) on delete set null,
  add column if not exists permit_document_path text,
  add column if not exists permit_document_name text,
  add column if not exists permit_document_mime_type text,
  add column if not exists permit_document_size_bytes bigint;

create index if not exists hs_risk_assessments_admin_location_idx
  on public.hs_risk_assessments(organization_id, administration_location_id);
create index if not exists hs_risk_assessments_assessor_person_idx
  on public.hs_risk_assessments(organization_id, assessor_person_id);
create index if not exists hs_risk_assessments_linked_permit_idx
  on public.hs_risk_assessments(organization_id, linked_permit_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hs-risk-assessment-evidence',
  'hs-risk-assessment-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
