begin;

create or replace function public.record_security_incident_task_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  actor_user uuid;
  actor_person uuid;
  event_name text;
begin
  actor_user := coalesce(auth.uid(), new.updated_by_user_id, new.created_by_user_id);

  select id into actor_person
  from public.organization_people
  where organization_id = new.organization_id
    and user_id = actor_user
    and account_status = 'active'
  limit 1;

  event_name := case
    when tg_op = 'INSERT' then 'task_created'
    when old.verification_result is distinct from new.verification_result
      and new.verification_result = 'effective' then 'verification_effective'
    when old.verification_result is distinct from new.verification_result
      and new.verification_result = 'not_effective' then 'verification_not_effective'
    when old.closure_approved_at is null
      and new.closure_approved_at is not null then 'closure_approved'
    when old.status is distinct from new.status
      and new.status = 'closed' then 'incident_closed'
    when old.status is distinct from new.status then 'status_changed'
    when old.incident_lead_person_id is distinct from new.incident_lead_person_id
      or old.technical_lead_person_id is distinct from new.technical_lead_person_id
      or old.privacy_lead_person_id is distinct from new.privacy_lead_person_id
      or old.communications_lead_person_id is distinct from new.communications_lead_person_id
      or old.verifier_person_id is distinct from new.verifier_person_id
      or old.closure_approved_by_person_id is distinct from new.closure_approved_by_person_id
      then 'assignment_changed'
    when old.target_recovery_date is distinct from new.target_recovery_date
      then 'due_date_changed'
    else 'task_updated'
  end;

  insert into public.assurance_task_events(
    organization_id,
    source_table,
    source_id,
    event_type,
    actor_user_id,
    actor_person_id,
    assignee_person_id,
    verifier_person_id,
    previous_values,
    current_values
  ) values (
    new.organization_id,
    'isms_security_incidents',
    new.id,
    event_name,
    actor_user,
    actor_person,
    new.incident_lead_person_id,
    new.verifier_person_id,
    case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end,
    to_jsonb(new)
  );

  return new;
end
$$;

drop trigger if exists isms_security_incidents_task_audit
  on public.isms_security_incidents;

create trigger isms_security_incidents_task_audit
after insert or update on public.isms_security_incidents
for each row execute function public.record_security_incident_task_event();

grant execute on function public.record_security_incident_task_event()
  to authenticated, service_role;

-- Repair actor identities on earlier incident events where the protected
-- server client meant auth.uid() was unavailable inside the trigger.
update public.assurance_task_events event
set actor_user_id = nullif(event.current_values ->> 'updated_by_user_id', '')::uuid
where event.source_table = 'isms_security_incidents'
  and event.actor_user_id is null
  and nullif(event.current_values ->> 'updated_by_user_id', '') is not null;

update public.assurance_task_events event
set actor_person_id = person.id
from public.organization_people person
where event.source_table = 'isms_security_incidents'
  and event.actor_person_id is null
  and event.actor_user_id is not null
  and person.organization_id = event.organization_id
  and person.user_id = event.actor_user_id
  and person.account_status = 'active';

comment on function public.record_security_incident_task_event() is
  'Creates organisation-scoped security incident timeline events using the authenticated user recorded by the protected server action.';

commit;
