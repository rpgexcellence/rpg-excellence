begin;

-- Complete controlled Company User ownership on modules that previously stored names only.
alter table public.rca_actions
  add column if not exists verifier_person_id uuid references public.organization_people(id) on delete set null;

alter table public.isms_risk_treatments
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists action_owner_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists verifier_person_id uuid references public.organization_people(id) on delete set null;

update public.isms_risk_treatments treatment
set organization_id=risk.organization_id
from public.isms_risks risk
where treatment.risk_id=risk.id and treatment.organization_id is null;

alter table public.organization_asset_maintenance
  add column if not exists responsible_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists verifier_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists verified_at timestamptz;

alter table public.bcp_bia_assessments
  add column if not exists reviewer_person_id uuid references public.organization_people(id) on delete set null;
alter table public.bcp_outsourced_process_assessments
  add column if not exists reviewer_person_id uuid references public.organization_people(id) on delete set null;
alter table public.bcp_incident_management_assessments
  add column if not exists approver_person_id uuid references public.organization_people(id) on delete set null;
alter table public.bcp_plans
  add column if not exists plan_owner_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists approver_person_id uuid references public.organization_people(id) on delete set null;

create index if not exists rca_actions_people_idx on public.rca_actions(action_owner_person_id,verifier_person_id,due_date);
create index if not exists isms_treatments_people_idx on public.isms_risk_treatments(organization_id,action_owner_person_id,verifier_person_id,target_date);
create index if not exists asset_maintenance_people_idx on public.organization_asset_maintenance(organization_id,responsible_person_id,verifier_person_id,scheduled_date);
create index if not exists moc_actions_people_idx on public.hs_moc_actions(responsible_person_id,verifier_person_id,target_date);
create index if not exists bcp_bia_reviewer_idx on public.bcp_bia_assessments(organization_id,reviewer_person_id,next_review_date);
create index if not exists bcp_outsourced_reviewer_idx on public.bcp_outsourced_process_assessments(organization_id,reviewer_person_id,next_review_date);
create index if not exists bcp_incident_approver_idx on public.bcp_incident_management_assessments(organization_id,approver_person_id,next_review_date);
create index if not exists bcp_plan_people_idx on public.bcp_plans(organization_id,plan_owner_person_id,approver_person_id,next_review_date);

-- One audit stream for assignments, status changes, due-date changes and verification decisions.
create table if not exists public.assurance_task_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_table text not null,
  source_id uuid not null,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_person_id uuid references public.organization_people(id) on delete set null,
  assignee_person_id uuid references public.organization_people(id) on delete set null,
  verifier_person_id uuid references public.organization_people(id) on delete set null,
  previous_values jsonb not null default '{}'::jsonb,
  current_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assurance_task_events_source_idx on public.assurance_task_events(source_table,source_id,created_at desc);
create index if not exists assurance_task_events_org_idx on public.assurance_task_events(organization_id,created_at desc);

create or replace function public.validate_task_people(
  target_organization uuid,
  target_assignee uuid,
  target_verifier uuid
) returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_active_organisation_person(target_assignee,target_organization,'Action owner');
  perform public.assert_active_organisation_person(target_verifier,target_organization,'Independent verifier');
  if target_assignee is not null and target_assignee=target_verifier then
    raise exception 'The action owner cannot independently verify their own work';
  end if;
end $$;

create or replace function public.validate_rca_action_people() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_organization uuid;
begin
  select organization_id into target_organization from public.rca_cases where id=new.case_id;
  perform public.validate_task_people(target_organization,new.action_owner_person_id,new.verifier_person_id);
  return new;
end $$;

create or replace function public.validate_isms_treatment_people() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_organization uuid;
begin
  select organization_id into target_organization from public.isms_risks where id=new.risk_id;
  new.organization_id := target_organization;
  perform public.validate_task_people(target_organization,new.action_owner_person_id,new.verifier_person_id);
  return new;
end $$;

create or replace function public.validate_moc_action_people() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_organization uuid;
begin
  select organization_id into target_organization from public.hs_moc_changes where id=new.moc_id;
  perform public.validate_task_people(target_organization,new.responsible_person_id,new.verifier_person_id);
  return new;
end $$;

create or replace function public.validate_asset_maintenance_people() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform public.validate_task_people(new.organization_id,new.responsible_person_id,new.verifier_person_id);
  return new;
end $$;

drop trigger if exists rca_actions_validate_task_people on public.rca_actions;
create trigger rca_actions_validate_task_people before insert or update of action_owner_person_id,verifier_person_id
on public.rca_actions for each row execute function public.validate_rca_action_people();

drop trigger if exists isms_treatments_validate_task_people on public.isms_risk_treatments;
create trigger isms_treatments_validate_task_people before insert or update of risk_id,action_owner_person_id,verifier_person_id
on public.isms_risk_treatments for each row execute function public.validate_isms_treatment_people();

drop trigger if exists moc_actions_validate_task_people on public.hs_moc_actions;
create trigger moc_actions_validate_task_people before insert or update of responsible_person_id,verifier_person_id
on public.hs_moc_actions for each row execute function public.validate_moc_action_people();

drop trigger if exists asset_maintenance_validate_task_people on public.organization_asset_maintenance;
create trigger asset_maintenance_validate_task_people before insert or update of responsible_person_id,verifier_person_id
on public.organization_asset_maintenance for each row execute function public.validate_asset_maintenance_people();

create or replace function public.record_assurance_task_event() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  current_row jsonb := to_jsonb(new);
  previous_row jsonb := case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  target_organization uuid;
  target_assignee uuid;
  target_verifier uuid;
  actor_person uuid;
  event_name text;
begin
  if tg_table_name in ('hs_risk_actions','supplier_qbr_actions','organization_asset_maintenance','isms_risk_treatments') then
    target_organization := nullif(current_row->>'organization_id','')::uuid;
  elsif tg_table_name='corrective_actions' then
    select organization_id into target_organization from public.assessments where id=nullif(current_row->>'assessment_id','')::uuid;
  elsif tg_table_name='hs_moc_actions' then
    select organization_id into target_organization from public.hs_moc_changes where id=nullif(current_row->>'moc_id','')::uuid;
  elsif tg_table_name='rca_actions' then
    select organization_id into target_organization from public.rca_cases where id=nullif(current_row->>'case_id','')::uuid;
  end if;
  if target_organization is null then return new; end if;

  target_assignee := nullif(coalesce(current_row->>'responsible_person_id',current_row->>'action_owner_person_id',current_row->>'accountable_person_id'),'')::uuid;
  target_verifier := nullif(coalesce(current_row->>'verifier_person_id',current_row->>'reviewer_person_id'),'')::uuid;
  select id into actor_person from public.organization_people
    where organization_id=target_organization and user_id=auth.uid() and account_status='active' limit 1;

  event_name := case
    when tg_op='INSERT' then 'task_created'
    when previous_row->>'status' is distinct from current_row->>'status' then 'status_changed'
    when coalesce(previous_row->>'responsible_person_id',previous_row->>'action_owner_person_id',previous_row->>'accountable_person_id')
      is distinct from coalesce(current_row->>'responsible_person_id',current_row->>'action_owner_person_id',current_row->>'accountable_person_id') then 'assignment_changed'
    when coalesce(previous_row->>'verifier_person_id',previous_row->>'reviewer_person_id')
      is distinct from coalesce(current_row->>'verifier_person_id',current_row->>'reviewer_person_id') then 'verifier_changed'
    when coalesce(previous_row->>'target_date',previous_row->>'due_date',previous_row->>'scheduled_date')
      is distinct from coalesce(current_row->>'target_date',current_row->>'due_date',current_row->>'scheduled_date') then 'due_date_changed'
    else 'task_updated' end;

  insert into public.assurance_task_events(
    organization_id,source_table,source_id,event_type,actor_user_id,actor_person_id,
    assignee_person_id,verifier_person_id,previous_values,current_values
  ) values (
    target_organization,tg_table_name,new.id,event_name,auth.uid(),actor_person,
    target_assignee,target_verifier,previous_row,current_row
  );
  return new;
end $$;

drop trigger if exists hs_risk_actions_task_audit on public.hs_risk_actions;
create trigger hs_risk_actions_task_audit after insert or update on public.hs_risk_actions for each row execute function public.record_assurance_task_event();
drop trigger if exists corrective_actions_task_audit on public.corrective_actions;
create trigger corrective_actions_task_audit after insert or update on public.corrective_actions for each row execute function public.record_assurance_task_event();
drop trigger if exists rca_actions_task_audit on public.rca_actions;
create trigger rca_actions_task_audit after insert or update on public.rca_actions for each row execute function public.record_assurance_task_event();
drop trigger if exists hs_moc_actions_task_audit on public.hs_moc_actions;
create trigger hs_moc_actions_task_audit after insert or update on public.hs_moc_actions for each row execute function public.record_assurance_task_event();
drop trigger if exists supplier_qbr_actions_task_audit on public.supplier_qbr_actions;
create trigger supplier_qbr_actions_task_audit after insert or update on public.supplier_qbr_actions for each row execute function public.record_assurance_task_event();
drop trigger if exists isms_risk_treatments_task_audit on public.isms_risk_treatments;
create trigger isms_risk_treatments_task_audit after insert or update on public.isms_risk_treatments for each row execute function public.record_assurance_task_event();
drop trigger if exists asset_maintenance_task_audit on public.organization_asset_maintenance;
create trigger asset_maintenance_task_audit after insert or update on public.organization_asset_maintenance for each row execute function public.record_assurance_task_event();

alter table public.assurance_task_events enable row level security;
drop policy if exists "Company users view assurance task events" on public.assurance_task_events;
create policy "Company users view assurance task events" on public.assurance_task_events
for select to authenticated using (
  exists (
    select 1 from public.organization_people person
    where person.organization_id=assurance_task_events.organization_id
      and person.user_id=auth.uid() and person.account_status='active'
  )
  or exists (select 1 from public.organizations organization where organization.id=assurance_task_events.organization_id and organization.owner_id=auth.uid())
);

grant select on public.assurance_task_events to authenticated;
grant all privileges on public.assurance_task_events to service_role;
grant execute on function public.validate_task_people(uuid,uuid,uuid) to authenticated,service_role;

comment on table public.assurance_task_events is
  'Append-only audit history for controlled assignments, due dates, completion, approval and independent verification across RPG modules.';

commit;
