begin;

create table if not exists public.hs_risk_recipients (
  assessment_id uuid not null references public.hs_risk_assessments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  person_id uuid not null references public.organization_people(id),
  recipient_user_id uuid not null,
  communicated_by uuid not null,
  communicated_at timestamptz not null default now(),
  acknowledgement_due date,
  acknowledged_at timestamptz,
  primary key (assessment_id, person_id)
);
create index if not exists hs_risk_recipients_organization_user_idx
  on public.hs_risk_recipients(organization_id, recipient_user_id);
alter table public.hs_risk_recipients enable row level security;
revoke all on public.hs_risk_recipients from public, anon, authenticated;
grant select on public.hs_risk_recipients to service_role;

create or replace function public.hs_communicate_assessment(
  p_organization uuid, p_assessment uuid, p_actor uuid, p_recipients uuid[], p_due date
) returns void language plpgsql security definer set search_path = '' as $$
declare
  assessment public.hs_risk_assessments%rowtype;
  sent_at timestamptz := now();
  recipient_count integer;
begin
  if p_actor is null or coalesce(cardinality(p_recipients), 0) < 1 then
    raise exception 'Select at least one active recipient.';
  end if;
  if p_due < (sent_at at time zone 'Europe/London')::date then
    raise exception 'The acknowledgement due date must be today or later.';
  end if;
  select * into assessment from public.hs_risk_assessments
    where id = p_assessment and organization_id = p_organization for update;
  if not found or assessment.status not in ('approved', 'communicated') then
    raise exception 'Only an approved assessment version can be communicated.';
  end if;
  if exists (select 1 from public.hs_risk_recipients where assessment_id = p_assessment) then
    raise exception 'This version has already been distributed.';
  end if;

  insert into public.hs_risk_recipients
    (assessment_id, organization_id, person_id, recipient_user_id, communicated_by, communicated_at, acknowledgement_due)
  select p_assessment, p_organization, person.id, person.user_id, p_actor, sent_at, p_due
    from public.organization_people person
    where person.id = any(p_recipients) and person.organization_id = p_organization
      and person.account_type = 'system' and person.account_status = 'active' and person.user_id is not null;
  get diagnostics recipient_count = row_count;
  if recipient_count <> cardinality(p_recipients) then
    raise exception 'One or more selected recipients are no longer eligible.';
  end if;

  update public.hs_risk_assessments set status = 'communicated',
    communicated_at = coalesce(assessment.communicated_at, sent_at)
    where id = p_assessment and organization_id = p_organization;
  insert into public.hs_risk_events
    (assessment_id, owner_id, organization_id, actor_id, event_type, event_summary, event_data)
  values (p_assessment, assessment.owner_id, p_organization, p_actor, 'communicated',
    'Approved assessment distributed to selected recipients',
    jsonb_build_object('recipient_count', recipient_count, 'acknowledgement_due', p_due));
end;
$$;

create or replace function public.hs_acknowledge_assessment(
  p_organization uuid, p_assessment uuid, p_actor uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  assessment public.hs_risk_assessments%rowtype;
begin
  select * into assessment from public.hs_risk_assessments
    where id = p_assessment and organization_id = p_organization for update;
  if not found or assessment.status <> 'communicated' then
    raise exception 'This assessment version is no longer available for acknowledgement.';
  end if;
  update public.hs_risk_recipients r set acknowledged_at = now()
    from public.organization_people person
    where r.assessment_id = p_assessment and r.organization_id = p_organization
      and r.person_id = person.id and person.organization_id = p_organization
      and r.recipient_user_id = p_actor and person.user_id = p_actor
      and person.account_type = 'system' and person.account_status = 'active' and r.acknowledged_at is null;
  if found then
    insert into public.hs_risk_events
      (assessment_id, owner_id, organization_id, actor_id, event_type, event_summary)
    values (p_assessment, assessment.owner_id, p_organization, p_actor, 'acknowledged',
      'Selected recipient acknowledged this assessment version');
  elsif not exists (
    select 1 from public.hs_risk_recipients r join public.organization_people person on person.id = r.person_id
    where r.assessment_id = p_assessment and r.organization_id = p_organization and r.recipient_user_id = p_actor
      and r.acknowledged_at is not null and person.organization_id = p_organization
      and person.user_id = p_actor and person.account_type = 'system' and person.account_status = 'active'
  ) then
    raise exception 'You are not an active recipient of this assessment version.';
  end if;
end;
$$;

revoke all on function public.hs_communicate_assessment(uuid, uuid, uuid, uuid[], date),
  public.hs_acknowledge_assessment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.hs_communicate_assessment(uuid, uuid, uuid, uuid[], date),
  public.hs_acknowledge_assessment(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
