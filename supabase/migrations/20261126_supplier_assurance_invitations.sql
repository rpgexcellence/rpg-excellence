begin;

create table if not exists public.supplier_assurance_invitations (
  id uuid primary key,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null,
  recipient text not null check (recipient = lower(recipient)),
  contact_name text not null,
  expires_at timestamptz not null,
  token_hash text not null unique,
  document_id uuid not null references public.supplier_code_of_conduct_documents(id),
  questionnaire jsonb not null,
  status text not null check (status in ('creating', 'unknown', 'draft', 'sent', 'in_progress', 'submitted', 'clarification', 'reviewed', 'revoked')),
  message_id text,
  outlook_url text,
  sent_at timestamptz,
  submitted_at timestamptz,
  revision integer not null default 0,
  answers jsonb not null default '{}',
  submissions jsonb not null default '[]',
  history jsonb not null default '[]',
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists supplier_assurance_invitations_record
  on public.supplier_assurance_invitations (organization_id, supplier_id, created_at desc);
create unique index if not exists supplier_assurance_invitations_one_pending
  on public.supplier_assurance_invitations (supplier_id)
  where status in ('creating', 'unknown', 'draft', 'sent', 'in_progress', 'submitted', 'clarification');

alter table public.supplier_assurance_invitations enable row level security;
revoke all on public.supplier_assurance_invitations from public, anon, authenticated;
grant select, insert, update on public.supplier_assurance_invitations to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-submission-evidence', 'supplier-submission-evidence', false, 4194304,
  array['application/pdf','image/png','image/jpeg'])
on conflict (id) do nothing;

commit;
