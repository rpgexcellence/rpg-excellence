alter table public.bcp_context_assessments
  add column if not exists review_date date,
  add column if not exists review_frequency text not null default 'Annually',
  add column if not exists next_review_date date;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bcp-context-evidence',
  'bcp-context-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = false;

create index if not exists bcp_context_assessments_next_review_idx
  on public.bcp_context_assessments (organization_id, next_review_date)
  where status <> 'archived';

comment on column public.bcp_context_assessments.review_date is
  'Date on which the controlled Module 3 context review was performed.';
comment on column public.bcp_context_assessments.review_frequency is
  'Controlled review interval selected by the customer.';
comment on column public.bcp_context_assessments.next_review_date is
  'Calculated next review date derived from review_date and review_frequency.';
