begin;

create table if not exists public.hs_permit_documents (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in (
    'risk_assessment','method_statement','ssow','coshh_sds','isolation_diagram',
    'lifting_plan','rescue_plan','drawing_service_plan','competence_certificate',
    'inspection_certificate','photograph','other'
  )),
  title text not null,
  description text,
  document_reference text,
  revision text,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid,
  uploaded_by_name text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists hs_permit_documents_permit_idx
  on public.hs_permit_documents(permit_id,document_type,created_at desc);

alter table public.hs_permit_documents enable row level security;

drop policy if exists "Permit users view documents" on public.hs_permit_documents;
create policy "Permit users view documents"
on public.hs_permit_documents for select to authenticated
using (public.can_view_hs_permit(permit_id));

drop policy if exists "Permit users add documents" on public.hs_permit_documents;
create policy "Permit users add documents"
on public.hs_permit_documents for insert to authenticated
with check (public.can_contribute_hs_permit(permit_id));

drop policy if exists "Permit administrators update documents" on public.hs_permit_documents;
create policy "Permit administrators update documents"
on public.hs_permit_documents for update to authenticated
using (public.is_organization_people_admin(organization_id) or owner_id=auth.uid())
with check (public.is_organization_people_admin(organization_id) or owner_id=auth.uid());

grant select,insert,update on public.hs_permit_documents to authenticated;
grant all privileges on public.hs_permit_documents to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'hs-permit-evidence','hs-permit-evidence',false,10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp'
  ]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Permit users read evidence objects" on storage.objects;
create policy "Permit users read evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id='hs-permit-evidence'
  and public.can_view_hs_permit(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "Permit users upload evidence objects" on storage.objects;
create policy "Permit users upload evidence objects"
on storage.objects for insert to authenticated
with check (
  bucket_id='hs-permit-evidence'
  and (storage.foldername(name))[1]=auth.uid()::text
  and public.can_contribute_hs_permit(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "Permit administrators remove evidence objects" on storage.objects;
create policy "Permit administrators remove evidence objects"
on storage.objects for delete to authenticated
using (
  bucket_id='hs-permit-evidence'
  and exists(
    select 1 from public.hs_permits permit
    where permit.id=((storage.foldername(name))[2])::uuid
      and (permit.owner_id=auth.uid() or public.is_organization_people_admin(permit.organization_id))
  )
);

commit;
