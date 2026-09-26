alter table public.suppliers
  add column if not exists approved_by_person_id uuid references public.organization_people(id) on delete set null;

create table if not exists public.supplier_sites (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_name text not null,
  address text not null,
  scope text not null,
  approval_status text not null default 'not_approved'
    check (approval_status in ('approved','conditionally_approved','not_approved','pending','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_subtier_suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  supply_scope text not null,
  approval_status text not null default 'not_approved'
    check (approval_status in ('approved','conditionally_approved','not_approved','pending','suspended','expired')),
  certification_standard text,
  certificate_number text,
  certification_body text,
  certificate_expiry date,
  reminder_date date,
  reminder_sent_at timestamptz,
  certificate_storage_path text,
  certificate_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_evidence_files (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  control_id text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists supplier_sites_supplier_idx on public.supplier_sites(supplier_id);
create index if not exists supplier_subtiers_supplier_idx on public.supplier_subtier_suppliers(supplier_id);
create index if not exists supplier_subtiers_reminder_idx on public.supplier_subtier_suppliers(reminder_date) where reminder_sent_at is null;
create index if not exists supplier_evidence_supplier_idx on public.supplier_evidence_files(supplier_id, control_id);

alter table public.supplier_sites enable row level security;
alter table public.supplier_subtier_suppliers enable row level security;
alter table public.supplier_evidence_files enable row level security;

drop policy if exists "Supplier owners manage sites" on public.supplier_sites;
create policy "Supplier owners manage sites" on public.supplier_sites for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Supplier owners manage subtiers" on public.supplier_subtier_suppliers;
create policy "Supplier owners manage subtiers" on public.supplier_subtier_suppliers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Supplier owners manage evidence" on public.supplier_evidence_files;
create policy "Supplier owners manage evidence" on public.supplier_evidence_files for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-assurance-evidence', 'supplier-assurance-evidence', false, 10485760,
  array['application/pdf','image/png','image/jpeg','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Supplier owners read assurance evidence" on storage.objects;
create policy "Supplier owners read assurance evidence" on storage.objects for select to authenticated
using (bucket_id = 'supplier-assurance-evidence' and exists (select 1 from public.organizations o where o.id::text = (storage.foldername(name))[1] and o.owner_id = auth.uid()));
drop policy if exists "Supplier owners upload assurance evidence" on storage.objects;
create policy "Supplier owners upload assurance evidence" on storage.objects for insert to authenticated
with check (bucket_id = 'supplier-assurance-evidence' and exists (select 1 from public.organizations o where o.id::text = (storage.foldername(name))[1] and o.owner_id = auth.uid()));
drop policy if exists "Supplier owners update assurance evidence" on storage.objects;
create policy "Supplier owners update assurance evidence" on storage.objects for update to authenticated
using (bucket_id = 'supplier-assurance-evidence' and exists (select 1 from public.organizations o where o.id::text = (storage.foldername(name))[1] and o.owner_id = auth.uid()));
drop policy if exists "Supplier owners delete assurance evidence" on storage.objects;
create policy "Supplier owners delete assurance evidence" on storage.objects for delete to authenticated
using (bucket_id = 'supplier-assurance-evidence' and exists (select 1 from public.organizations o where o.id::text = (storage.foldername(name))[1] and o.owner_id = auth.uid()));
