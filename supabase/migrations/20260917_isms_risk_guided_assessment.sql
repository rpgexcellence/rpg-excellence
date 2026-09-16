create sequence if not exists public.isms_risk_reference_seq start 1;
create or replace function public.next_isms_risk_reference()
returns text language sql security definer set search_path = public as $$
  select 'ISR-' || extract(year from current_date)::integer || '-' ||
         lpad(nextval('public.isms_risk_reference_seq')::text, 3, '0');
$$;
revoke all on function public.next_isms_risk_reference() from public;
grant execute on function public.next_isms_risk_reference() to authenticated;
alter table public.isms_risks alter column cause drop not null;
alter table public.isms_risks alter column event drop not null;
alter table public.isms_risks alter column consequence drop not null;
alter table public.isms_risks alter column assessment_rationale drop not null;
alter table public.isms_risks add column if not exists completion_percent integer not null default 0 check (completion_percent between 0 and 100);
alter table public.isms_risks add column if not exists current_assessment_step integer not null default 1 check (current_assessment_step between 1 and 5);
