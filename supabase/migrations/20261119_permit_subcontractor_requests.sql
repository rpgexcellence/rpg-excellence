begin;

create table if not exists public.hs_permit_subcontractor_requests (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references public.hs_permits(id) on delete cascade,
  permit_updated_at timestamptz not null,
  recipient_email text not null check (length(recipient_email) between 3 and 254 and recipient_email = lower(recipient_email)),
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 days'),
  revoked_at timestamptz,
  submitted_at timestamptz,
  submitted_by uuid,
  company text check (length(company) between 1 and 160),
  work_lead text check (length(work_lead) between 1 and 160),
  telephone text check (length(telephone) <= 40),
  method_summary text check (length(method_summary) between 1 and 4000),
  evidence_pdf text check (length(evidence_pdf) <= 2796204),
  check (expires_at > requested_at),
  check (revoked_at is null or submitted_at is null),
  check (
    (submitted_at is null and submitted_by is null and company is null and work_lead is null
      and telephone is null and method_summary is null and evidence_pdf is null)
    or (submitted_at is not null and submitted_by is not null and company is not null
      and work_lead is not null and method_summary is not null and evidence_pdf is not null)
  )
);

create index if not exists hs_permit_subcontractor_requests_permit_idx
  on public.hs_permit_subcontractor_requests(permit_id, requested_at desc);

create unique index if not exists hs_permit_subcontractor_requests_pending_idx
  on public.hs_permit_subcontractor_requests(permit_id)
  where submitted_at is null and revoked_at is null;

alter table public.hs_permit_subcontractor_requests enable row level security;
revoke all on public.hs_permit_subcontractor_requests from public, anon, authenticated;
grant select, insert, update on public.hs_permit_subcontractor_requests to service_role;

create or replace function public.check_permit_subcontractor_request()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if tg_op = 'UPDATE' then
    if old.submitted_at is not null or old.revoked_at is not null then
      raise exception 'Subcontractor request is final';
    end if;
    if new.revoked_at is not null then
      return new;
    end if;
  end if;

  perform 1 from public.hs_permits
  where id = new.permit_id and organization_id is not null
    and status = 'draft' and updated_at = new.permit_updated_at
  for update;
  if not found or new.expires_at <= clock_timestamp() then
    raise exception 'Subcontractor request is unavailable';
  end if;

  if new.submitted_by is not null then
    perform 1 from auth.users where id = new.submitted_by
      and email_confirmed_at is not null and lower(email) = new.recipient_email;
    if not found then
      raise exception 'Subcontractor request is unavailable';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.check_permit_subcontractor_request() from public, anon, authenticated;
drop trigger if exists hs_permit_subcontractor_request_guard on public.hs_permit_subcontractor_requests;
create trigger hs_permit_subcontractor_request_guard
before insert or update on public.hs_permit_subcontractor_requests
for each row execute function public.check_permit_subcontractor_request();

commit;
