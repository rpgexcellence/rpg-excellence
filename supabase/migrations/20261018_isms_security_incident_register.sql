begin;

create table if not exists public.isms_security_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  incident_reference text not null,
  title text not null,
  description text not null,
  incident_type text not null default 'security_event'
    check (incident_type in ('security_event','unauthorised_access','data_breach','malware','phishing','service_disruption','api_integration','supplier_incident','vulnerability','other')),
  severity text not null default 'medium'
    check (severity in ('low','medium','high','critical')),
  status text not null default 'reported'
    check (status in ('reported','triage','contained','investigating','recovery','action_required','awaiting_verification','closed','cancelled')),
  detected_at timestamptz not null,
  awareness_at timestamptz,
  administration_location_id text,
  administration_location_label text,
  affected_service text,
  affected_organization text,
  affected_data text,
  immediate_impact text,
  continuing_risk text,
  incident_lead_person_id uuid references public.organization_people(id) on delete set null,
  technical_lead_person_id uuid references public.organization_people(id) on delete set null,
  privacy_lead_person_id uuid references public.organization_people(id) on delete set null,
  communications_lead_person_id uuid references public.organization_people(id) on delete set null,
  verifier_person_id uuid references public.organization_people(id) on delete set null,
  personal_data_involved boolean not null default false,
  notification_assessment text,
  ico_notification_required boolean,
  ico_notified_at timestamptz,
  affected_people_notification_required boolean,
  affected_people_notified_at timestamptz,
  ncsc_reported_at timestamptz,
  containment_summary text,
  investigation_summary text,
  recovery_summary text,
  root_cause_summary text,
  lessons_learned text,
  linked_finding_id uuid references public.internal_audit_findings(id) on delete set null,
  linked_rca_case_id uuid references public.rca_cases(id) on delete set null,
  linked_moc_id uuid references public.hs_moc_changes(id) on delete set null,
  linked_bcp_incident_id uuid references public.bcp_incident_management_assessments(id) on delete set null,
  target_recovery_date date,
  closed_at timestamptz,
  closure_approved_by_person_id uuid references public.organization_people(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, incident_reference)
);

create table if not exists public.isms_security_incident_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.isms_security_incidents(id) on delete cascade,
  controlled_document_id uuid not null references public.controlled_documents(id) on delete cascade,
  link_purpose text not null default 'governing_procedure'
    check (link_purpose in ('governing_procedure','evidence','recovery_reference','notification_reference','other')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (incident_id, controlled_document_id, link_purpose)
);

create table if not exists public.isms_security_incident_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.isms_security_incidents(id) on delete cascade,
  evidence_type text not null default 'other'
    check (evidence_type in ('log','screenshot','request_id','configuration','communication','specialist_report','other')),
  description text,
  storage_path text not null,
  original_file_name text not null,
  mime_type text,
  file_size_bytes bigint not null,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists isms_security_incidents_org_status_idx
  on public.isms_security_incidents(organization_id,status,updated_at desc);
create index if not exists isms_security_incidents_people_idx
  on public.isms_security_incidents(organization_id,incident_lead_person_id,verifier_person_id,target_recovery_date);
create index if not exists isms_security_incident_documents_idx
  on public.isms_security_incident_documents(incident_id,controlled_document_id);
create index if not exists isms_security_incident_evidence_idx
  on public.isms_security_incident_evidence(incident_id,created_at desc);

create or replace function public.validate_isms_security_incident_people()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_active_organisation_person(new.incident_lead_person_id,new.organization_id,'Incident lead');
  perform public.assert_active_organisation_person(new.technical_lead_person_id,new.organization_id,'Technical lead');
  perform public.assert_active_organisation_person(new.privacy_lead_person_id,new.organization_id,'Privacy lead');
  perform public.assert_active_organisation_person(new.communications_lead_person_id,new.organization_id,'Communications lead');
  perform public.assert_active_organisation_person(new.verifier_person_id,new.organization_id,'Independent verifier');
  perform public.assert_active_organisation_person(new.closure_approved_by_person_id,new.organization_id,'Closure approver');
  if new.incident_lead_person_id is not null and new.verifier_person_id=new.incident_lead_person_id then
    raise exception 'The incident lead cannot independently verify their own incident';
  end if;
  if new.status='closed' and (new.verifier_person_id is null or new.closure_approved_by_person_id is null or new.recovery_summary is null) then
    raise exception 'Recovery evidence, an independent verifier and a closure approver are required before closure';
  end if;
  return new;
end $$;

drop trigger if exists isms_security_incidents_validate_people on public.isms_security_incidents;
create trigger isms_security_incidents_validate_people
before insert or update on public.isms_security_incidents
for each row execute function public.validate_isms_security_incident_people();

create or replace function public.record_security_incident_task_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  actor_person uuid;
  event_name text;
begin
  select id into actor_person from public.organization_people
  where organization_id=new.organization_id and user_id=auth.uid() and account_status='active' limit 1;
  event_name := case
    when tg_op='INSERT' then 'task_created'
    when old.status is distinct from new.status then 'status_changed'
    when old.incident_lead_person_id is distinct from new.incident_lead_person_id then 'assignment_changed'
    when old.verifier_person_id is distinct from new.verifier_person_id then 'verifier_changed'
    when old.target_recovery_date is distinct from new.target_recovery_date then 'due_date_changed'
    else 'task_updated' end;
  insert into public.assurance_task_events(
    organization_id,source_table,source_id,event_type,actor_user_id,actor_person_id,
    assignee_person_id,verifier_person_id,previous_values,current_values
  ) values (
    new.organization_id,'isms_security_incidents',new.id,event_name,auth.uid(),actor_person,
    new.incident_lead_person_id,new.verifier_person_id,
    case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end,to_jsonb(new)
  );
  return new;
end $$;

drop trigger if exists isms_security_incidents_task_audit on public.isms_security_incidents;
create trigger isms_security_incidents_task_audit
after insert or update on public.isms_security_incidents
for each row execute function public.record_security_incident_task_event();

alter table public.isms_security_incidents enable row level security;
alter table public.isms_security_incident_documents enable row level security;
alter table public.isms_security_incident_evidence enable row level security;

create or replace function public.has_isms_incident_access(target_organization uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.organizations o
    where o.id=target_organization and o.owner_id=auth.uid()
  ) or exists (
    select 1
    from public.organization_people p
    left join public.organization_person_permissions permission
      on permission.person_id=p.id and permission.module_key='information_security'
    where p.organization_id=target_organization
      and p.user_id=auth.uid()
      and p.account_status='active'
      and (
        (not write_access and permission.access_level in ('view','contribute','review','approve','admin'))
        or (write_access and permission.access_level in ('contribute','review','approve','admin'))
        or exists (
          select 1 from public.organization_person_authorizations a
          where a.person_id=p.id and a.function_key='company_administrator'
            and a.status='authorised' and (a.expires_at is null or a.expires_at>=current_date)
        )
      )
  );
$$;

drop policy if exists "Organisation users view security incidents" on public.isms_security_incidents;
create policy "Organisation users view security incidents" on public.isms_security_incidents
for select to authenticated using (public.has_isms_incident_access(organization_id,false));

drop policy if exists "Organisation users manage security incidents" on public.isms_security_incidents;
create policy "Organisation users manage security incidents" on public.isms_security_incidents
for all to authenticated using (public.has_isms_incident_access(organization_id,true))
with check (public.has_isms_incident_access(organization_id,true));

drop policy if exists "Organisation users manage incident documents" on public.isms_security_incident_documents;
create policy "Organisation users manage incident documents" on public.isms_security_incident_documents
for all to authenticated using (public.has_isms_incident_access(organization_id,true))
with check (
  public.has_isms_incident_access(organization_id,true)
  and exists (select 1 from public.isms_security_incidents i where i.id=incident_id and i.organization_id=organization_id)
);

drop policy if exists "Organisation users manage incident evidence" on public.isms_security_incident_evidence;
create policy "Organisation users manage incident evidence" on public.isms_security_incident_evidence
for all to authenticated using (public.has_isms_incident_access(organization_id,true))
with check (
  public.has_isms_incident_access(organization_id,true)
  and exists (select 1 from public.isms_security_incidents i where i.id=incident_id and i.organization_id=organization_id)
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('isms-security-incident-evidence','isms-security-incident-evidence',false,10485760,
  array['application/pdf','text/plain','text/csv','application/json','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

grant select,insert,update on public.isms_security_incidents to authenticated;
grant select,insert,delete on public.isms_security_incident_documents to authenticated;
grant select,insert on public.isms_security_incident_evidence to authenticated;
grant all privileges on public.isms_security_incidents,public.isms_security_incident_documents,public.isms_security_incident_evidence to service_role;
grant execute on function public.validate_isms_security_incident_people() to authenticated,service_role;
grant execute on function public.has_isms_incident_access(uuid,boolean) to authenticated,service_role;
grant execute on function public.record_security_incident_task_event() to authenticated,service_role;

comment on table public.isms_security_incidents is
  'Organisation-scoped RPG Excellence security incident register linked to Company Users, controlled evidence, Findings, CAPA-8D, MOC and BCP.';

commit;
