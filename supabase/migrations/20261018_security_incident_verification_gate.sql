begin;

alter table public.isms_security_incidents
  add column if not exists verification_result text not null default 'pending',
  add column if not exists verification_summary text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists closure_approval_comment text,
  add column if not exists closure_approved_at timestamptz,
  add column if not exists closure_approved_by_user_id uuid references auth.users(id) on delete set null;

alter table public.isms_security_incidents
  drop constraint if exists isms_security_incidents_verification_result_check;

alter table public.isms_security_incidents
  add constraint isms_security_incidents_verification_result_check
  check (verification_result in ('pending','effective','not_effective'));

create or replace function public.validate_isms_security_incident_people()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.assert_active_organisation_person(new.incident_lead_person_id,new.organization_id,'Incident lead');
  perform public.assert_active_organisation_person(new.technical_lead_person_id,new.organization_id,'Technical lead');
  perform public.assert_active_organisation_person(new.privacy_lead_person_id,new.organization_id,'Privacy lead');
  perform public.assert_active_organisation_person(new.communications_lead_person_id,new.organization_id,'Communications lead');
  perform public.assert_active_organisation_person(new.verifier_person_id,new.organization_id,'Independent verifier');
  perform public.assert_active_organisation_person(new.closure_approved_by_person_id,new.organization_id,'Closure approver');

  if new.incident_lead_person_id is not null
     and new.verifier_person_id = new.incident_lead_person_id then
    raise exception 'The incident lead cannot independently verify their own incident';
  end if;

  if new.verification_result <> 'pending'
     and (new.verifier_person_id is null
          or new.verification_summary is null
          or btrim(new.verification_summary) = ''
          or new.verified_at is null
          or new.verified_by_user_id is null) then
    raise exception 'A verification decision requires the assigned verifier, evidence, signed-in user and timestamp';
  end if;

  if new.status = 'closed' and (
       new.recovery_summary is null
       or btrim(new.recovery_summary) = ''
       or new.verification_result <> 'effective'
       or new.verified_at is null
       or new.verified_by_user_id is null
       or new.closure_approved_by_person_id is null
       or new.closure_approval_comment is null
       or btrim(new.closure_approval_comment) = ''
       or new.closure_approved_at is null
       or new.closure_approved_by_user_id is null
     ) then
    raise exception 'Effective independent verification and recorded closure approval are required before closure';
  end if;

  if new.status = 'closed' and new.verification_result = 'not_effective' then
    raise exception 'An incident with ineffective recovery cannot be closed';
  end if;

  return new;
end
$$;

drop trigger if exists isms_security_incidents_validate_people
  on public.isms_security_incidents;

create trigger isms_security_incidents_validate_people
before insert or update on public.isms_security_incidents
for each row execute function public.validate_isms_security_incident_people();

grant execute on function public.validate_isms_security_incident_people()
  to authenticated, service_role;

comment on column public.isms_security_incidents.verification_result is
  'Independent effectiveness decision recorded by the assigned verifier: pending, effective or not_effective.';
comment on column public.isms_security_incidents.verified_by_user_id is
  'Authenticated user who recorded the independent verification decision.';
comment on column public.isms_security_incidents.closure_approved_by_user_id is
  'Authenticated user who personally approved controlled incident closure.';

commit;
