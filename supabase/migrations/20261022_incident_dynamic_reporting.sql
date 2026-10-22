-- Phase 2: dynamic reporting, contextual investigation and critical-only Director gate.
-- Run AFTER 20261022_incident_reporting_and_response.sql. Existing reports and roles remain.
begin;
do $$ declare required_table text; begin
 foreach required_table in array array['incident_reports','hs_moc_changes','hs_permits','hs_workplace_inspections'] loop
  if to_regclass('public.'||required_table) is null then
   raise exception 'Required table public.% is missing. Apply the existing incident, MOC, permit and workplace inspection migrations first.',required_table;
  end if;
 end loop;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hs_moc_changes' and column_name='change_owner_person_id') then
  raise exception 'Apply the existing 20261012_hs_moc_company_permit_links.sql migration before this enhancement.';
 end if;
end $$;
alter table public.incident_reports
 add column if not exists case_verified_at timestamptz,
 add column if not exists case_verified_by uuid references auth.users(id),
 add column if not exists case_verified_version integer,
 add column if not exists case_verification_note text not null default '',
 add column if not exists intake_details jsonb not null default '{}',
 add column if not exists investigation_details jsonb not null default '{}',
 add column if not exists director_person_id uuid references public.organization_people(id),
 add column if not exists requires_director_approval boolean not null default false,
 add column if not exists director_approved_at timestamptz,
 add column if not exists director_approved_by uuid references auth.users(id),
 add column if not exists director_approved_version integer,
 add column if not exists director_approval_note text not null default '',
 add column if not exists linked_moc_id uuid references public.hs_moc_changes(id),
 add column if not exists linked_assessment_id uuid references public.hs_risk_assessments(id),
 add column if not exists linked_permit_id uuid references public.hs_permits(id),
 add column if not exists linked_inspection_id uuid references public.hs_workplace_inspections(id);
alter table public.incident_reports drop constraint if exists incident_reports_report_type_check;
alter table public.incident_reports add constraint incident_reports_report_type_check check(report_type in ('accident','incident','near_miss','concern','disruption','other'));
alter table public.hs_moc_changes add column if not exists source_incident_report_id uuid references public.incident_reports(id);
create unique index if not exists hs_moc_source_incident_unique on public.hs_moc_changes(source_incident_report_id) where source_incident_report_id is not null;
-- Never retroactively reopen completed historical records.
update public.incident_reports set requires_director_approval=true
 where status not in ('closed','rejected','duplicate') and (criticality='critical' or reported_criticality='critical' or immediate_danger);

create or replace function public.incident_director_authorised(p_user uuid,p_org uuid,p_person uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.organization_people p
 join public.organization_person_permissions m on m.person_id=p.id and m.module_key='incidents' and m.access_level in ('approve','admin')
 join public.organization_person_authorizations a on a.person_id=p.id and a.function_key in ('incident_director','site_director') and a.status='authorised' and (a.expires_at is null or a.expires_at>=current_date)
 where p.id=p_person and p.user_id=p_user and p.organization_id=p_org and p.account_status='active');
$$;
revoke all on function public.incident_director_authorised(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.incident_director_authorised(uuid,uuid,uuid) to service_role;

-- Defence in depth: approval cannot survive changed facts, tasks, links or evidence.
create or replace function public.incident_revision_guard() returns trigger language plpgsql set search_path=public as $$
begin
 new.requires_director_approval:=new.requires_director_approval or new.immediate_danger or new.reported_criticality='critical' or coalesce(new.criticality='critical',false);
 if tg_op='UPDATE' then
  new.requires_director_approval:=new.requires_director_approval or old.requires_director_approval;
  if new.status in ('closed','rejected','duplicate') and old.status not in ('closed','rejected','duplicate') and new.requires_director_approval then
   if old.director_approved_at is null or old.director_approved_version is distinct from old.version then raise exception 'Critical reports require current Director approval before closure or disposal';end if;
   if not public.incident_director_authorised(old.director_approved_by,old.organization_id,old.director_person_id) then raise exception 'Director approval authority is no longer active';end if;
  end if;
  if (to_jsonb(new)-array['version','updated_at','director_approved_at','director_approved_by','director_approved_version','director_approval_note','public_update','planning_sync_status','planning_sync_message','planning_synced_at','case_verified_at','case_verified_by','case_verified_version','case_verification_note','status','closed_at','closed_by'])
   is distinct from (to_jsonb(old)-array['version','updated_at','director_approved_at','director_approved_by','director_approved_version','director_approval_note','public_update','planning_sync_status','planning_sync_message','planning_synced_at','case_verified_at','case_verified_by','case_verified_version','case_verification_note','status','closed_at','closed_by'])
   or (new.status is distinct from old.status and new.status not in ('closed','rejected','duplicate')) then
   new.case_verified_at:=null;new.case_verified_by:=null;new.case_verified_version:=null;new.case_verification_note:='';
   new.director_approved_at:=null;new.director_approved_by:=null;new.director_approved_version:=null;new.director_approval_note:='';
  end if;
 end if;
 if jsonb_typeof(new.intake_details)<>'object' or length(new.intake_details::text)>15000 or jsonb_typeof(new.investigation_details)<>'object' or length(new.investigation_details::text)>35000 then raise exception 'Invalid additional report details';end if;
 if new.intake_details ? 'stop_work' and new.intake_details->>'stop_work' not in ('yes','no','unknown','not_applicable') then raise exception 'Invalid stop-work selection';end if;
 if new.intake_details ? 'situation_safe' and new.intake_details->>'situation_safe' not in ('yes','no','unknown') then raise exception 'Invalid safety selection';end if;
 if new.report_type='other' and length(trim(coalesce(new.intake_details->>'report_type_other','')))<3 then raise exception 'Describe the other report type';end if;
 return new;
end $$;
drop trigger if exists incident_revision_guard on public.incident_reports;
create trigger incident_revision_guard before insert or update on public.incident_reports for each row execute function public.incident_revision_guard();

create or replace function public.submit_public_incident(p_token uuid,p_submission uuid,p_receipt_hash text,p_fingerprint text,p_values jsonb,p_contact jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare z public.organization_zones%rowtype;s public.organization_sites%rowtype;r public.incident_reports%rowtype; bname text; anon_report boolean;
begin
 select * into z from public.organization_zones where public_token=p_token and status='published';if not found then raise exception 'Reporting location is unavailable';end if;
 select * into s from public.organization_sites where id=z.site_id and organization_id=z.organization_id and status='active';if not found then raise exception 'Reporting location is unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('incident-zone:'||z.id::text,0));
 select * into r from public.incident_reports where submission_id=p_submission;
 if found then if r.zone_id<>z.id or r.receipt_hash<>p_receipt_hash then raise exception 'Submission cannot be reused';end if;return jsonb_build_object('id',r.id,'reference',r.reference);end if;
 if length(p_fingerprint)<20 or length(p_receipt_hash)<>64 then raise exception 'Invalid reporting form';end if;
 delete from public.incident_intake_limits where created_at<now()-interval '48 hours';
 if (select count(*) from public.incident_intake_limits where fingerprint=p_fingerprint and created_at>now()-interval '1 hour')>=20
 or (select count(*) from public.incident_intake_limits where zone_id=z.id and created_at>now()-interval '1 hour')>=300 then raise exception 'Too many submissions. Please try again later or contact the site team directly.';end if;
 if jsonb_typeof(p_values->'domains')<>'array' or jsonb_array_length(p_values->'domains') not between 1 and 5 then raise exception 'Choose reporting areas';end if;
 if (p_values->>'occurred_at')::timestamptz>now()+interval '5 minutes' then raise exception 'Occurrence cannot be in the future';end if;
 anon_report:=coalesce((p_values->>'anonymous')::boolean,true);
 select name into bname from public.organization_buildings where id=z.building_id and organization_id=z.organization_id and site_id=z.site_id;
 insert into public.incident_reports(organization_id,site_id,building_id,zone_id,location_label,submission_id,receipt_hash,anonymous,title,description,domains,report_type,reported_criticality,immediate_danger,occurred_at,manager_notified,manager_details,immediate_action,intake_details)
 values(z.organization_id,z.site_id,z.building_id,z.id,concat_ws(' / ',s.site_name,bname,z.reference,z.name),p_submission,p_receipt_hash,anon_report,p_values->>'title',p_values->>'description',array(select jsonb_array_elements_text(p_values->'domains')),p_values->>'report_type',p_values->>'reported_criticality',coalesce((p_values->>'immediate_danger')::boolean,false),(p_values->>'occurred_at')::timestamptz,p_values->>'manager_notified',coalesce(p_values->>'manager_details',''),coalesce(p_values->>'immediate_action',''),coalesce(p_values->'intake_details','{}')) returning * into r;
 if not anon_report then
  if coalesce(length(p_contact->>'name'),0)=0 or (coalesce(length(p_contact->>'email'),0)=0 and coalesce(length(p_contact->>'phone'),0)=0) then raise exception 'Add contact details or remain anonymous';end if;
  insert into public.incident_report_contacts(incident_id,organization_id,name,email,phone) values(r.id,r.organization_id,p_contact->>'name',coalesce(p_contact->>'email',''),coalesce(p_contact->>'phone',''));
 end if;
 insert into public.incident_intake_limits(fingerprint,submission_id,zone_id) values(p_fingerprint,p_submission,z.id);
 insert into public.incident_events(organization_id,incident_id,event_type,summary) values(r.organization_id,r.id,'reported','New QR report received; classification and urgency await triage.');
 return jsonb_build_object('id',r.id,'reference',r.reference);
end $$;

create or replace function public.submit_internal_incident(p_actor uuid,p_org uuid,p_site uuid,p_zone uuid,p_values jsonb,p_contact jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.incident_reports%rowtype;a jsonb;s public.organization_sites%rowtype;z public.organization_zones%rowtype;anon_report boolean;
begin
 select * into s from public.organization_sites where id=p_site and organization_id=p_org and status='active';if not found then raise exception 'Choose an active company site';end if;
 r.organization_id:=p_org;r.site_id:=s.id;r.domains:=array(select jsonb_array_elements_text(p_values->'domains'));r.team_person_ids:='{}';
 a:=public.incident_actor(p_actor,p_org,r);if a->>'level' not in ('contribute','review','approve','admin') then raise exception 'Incident contributor access required';end if;
 if p_zone is not null then select * into z from public.organization_zones where id=p_zone and organization_id=p_org and site_id=p_site and status<>'archived';if not found then raise exception 'Zone must belong to the selected site';end if;end if;
 if (p_values->>'occurred_at')::timestamptz>now()+interval '5 minutes' then raise exception 'Occurrence cannot be in the future';end if;
 anon_report:=coalesce((p_values->>'anonymous')::boolean,true);
 insert into public.incident_reports(organization_id,site_id,building_id,zone_id,location_label,source,anonymous,reporter_user_id,title,description,domains,report_type,reported_criticality,immediate_danger,occurred_at,manager_notified,manager_details,immediate_action,intake_details)
 values(p_org,p_site,z.building_id,z.id,concat_ws(' / ',s.site_name,z.reference,z.name),'internal',anon_report,case when anon_report then null else p_actor end,p_values->>'title',p_values->>'description',r.domains,p_values->>'report_type',p_values->>'reported_criticality',coalesce((p_values->>'immediate_danger')::boolean,false),(p_values->>'occurred_at')::timestamptz,p_values->>'manager_notified',coalesce(p_values->>'manager_details',''),coalesce(p_values->>'immediate_action',''),coalesce(p_values->'intake_details','{}')) returning * into r;
 if not anon_report then
  if coalesce(length(p_contact->>'name'),0)=0 or (coalesce(length(p_contact->>'email'),0)=0 and coalesce(length(p_contact->>'phone'),0)=0) then raise exception 'Provide contact details or remain anonymous';end if;
  insert into public.incident_report_contacts(incident_id,organization_id,name,email,phone)values(r.id,p_org,p_contact->>'name',coalesce(p_contact->>'email',''),coalesce(p_contact->>'phone',''));
 end if;
 insert into public.incident_events(organization_id,incident_id,actor_user_id,event_type,summary)values(p_org,r.id,case when anon_report then null else p_actor end,'reported','Internal report received; awaits triage.');
 return jsonb_build_object('id',r.id,'reference',r.reference);
end $$;

create or replace function public.incident_actor(p_user uuid,p_org uuid,p_report public.incident_reports)
returns jsonb language plpgsql security definer set search_path=public as $$
declare person public.organization_people%rowtype;perm public.organization_person_permissions%rowtype;org_owner uuid;company_admin boolean;case_admin boolean;security_access boolean;
begin
 select owner_id into org_owner from public.organizations where id=p_org;
 if p_user=org_owner then return jsonb_build_object('admin',true,'owner',true,'level','admin');end if;
 select * into person from public.organization_people where organization_id=p_org and user_id=p_user and account_status='active' order by created_at limit 1;if not found then raise exception 'Active company access required';end if;
 select exists(select 1 from public.organization_person_authorizations where person_id=person.id and function_key='company_administrator' and status='authorised' and (expires_at is null or expires_at>=current_date)) into company_admin;
 select * into perm from public.organization_person_permissions where person_id=person.id and module_key='incidents' and access_level<>'none';
 if not found and not company_admin then raise exception 'Incident module access required';end if;
 select company_admin or (perm.access_level='admin' and exists(select 1 from public.organization_person_authorizations where person_id=person.id and function_key='accident_incident_admin' and status='authorised' and (expires_at is null or expires_at>=current_date))) into case_admin;
 if not company_admin then
  if perm.scope_type='site' and not coalesce(perm.scope_values ? p_report.site_id::text,false) then raise exception 'Location is outside your scope';end if;
  if perm.scope_type in ('assigned_records','department') and person.id<>all(array_remove(array[p_report.investigator_person_id,p_report.verifier_person_id,p_report.director_person_id]||p_report.team_person_ids,null)) then raise exception 'This case is outside your assignments';end if;
  if not case_admin and 'information_security'=any(p_report.domains) then
   select exists(select 1 from public.organization_person_permissions where person_id=person.id and module_key='information_security' and access_level<>'none') or exists(select 1 from public.organization_person_authorizations where person_id=person.id and function_key='security_incident_lead' and status='authorised' and (expires_at is null or expires_at>=current_date)) into security_access;
   if not security_access then raise exception 'Security incident authority required';end if;
  end if;
 end if;
 return jsonb_build_object('admin',case_admin,'person',person.id,'level',case when company_admin then 'admin' else perm.access_level end);
end $$;

create or replace function public.incident_command(p_actor uuid,p_org uuid,p_id uuid,p_version integer,p_command text,p_values jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.incident_reports%rowtype;t public.incident_tasks%rowtype;a jsonb;person_id uuid;owner_user uuid;verifier_user uuid;resource_person uuid;new_id uuid;actual integer;potential integer;chance integer;score integer;band text;target uuid;team uuid[];next_status text;
begin
 select * into r from public.incident_reports where id=p_id and organization_id=p_org for update;if not found then raise exception 'Incident not found';end if;
 a:=public.incident_actor(p_actor,p_org,r);person_id:=(a->>'person')::uuid;
 if p_version is null or r.version<>p_version then raise exception 'This case changed. Refresh before saving.';end if;
 if r.status in ('closed','rejected','duplicate') and p_command<>'reopen' then raise exception 'This case is read-only. An incident administrator must reopen it.';end if;
 if p_command in ('triage','allocate_task','link_rca','create_rca','link_security','create_security','reopen','publish_update','reallocate_task','link_records','create_moc','link_moc') and not (a->>'admin')::boolean then raise exception 'Accident / Incident Administrator authority required';end if;
 if p_command='publish_update' then
  update public.incident_reports set case_verified_version=case when case_verified_version=version then version+1 else case_verified_version end,director_approved_version=case when director_approved_version=version then version+1 else director_approved_version end where id=r.id;
 end if;
 if p_command='approve_director' then
  if not r.requires_director_approval then raise exception 'Director approval applies only to critical reports';end if;
  if not public.incident_director_authorised(p_actor,p_org,r.director_person_id) then raise exception 'Assigned active Director with Incident Approve access required';end if;
  select user_id into owner_user from public.organization_people where id=r.investigator_person_id and organization_id=p_org;
  if p_actor=owner_user or r.director_person_id=r.investigator_person_id then raise exception 'Director cannot approve own investigation';end if;
  if r.case_verified_at is null or r.case_verified_version is distinct from r.version then raise exception 'Current independent case verification is required before Director approval';end if;
  if r.status<>'awaiting_verification' then raise exception 'Complete the investigation and actions before Director approval';end if;
  if length(trim(r.investigation_summary))<20 or length(trim(r.cause_summary))<10 then raise exception 'Complete investigation and causes before Director approval';end if;
  if exists(select 1 from public.incident_tasks where incident_id=r.id and status not in ('verified','cancelled')) then raise exception 'Verify all actions before Director approval';end if;
  if length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Record Director approval evidence and rationale';end if;
  update public.incident_reports set case_verified_version=version+1,director_approved_at=now(),director_approved_by=p_actor,director_approved_version=version+1,director_approval_note=p_values->>'note' where id=r.id;
 elsif p_command='link_records' then
  target:=nullif(p_values->>'linked_assessment_id','')::uuid;
  if target is not null and not exists(select 1 from public.hs_risk_assessments where id=target and organization_id=p_org) then raise exception 'Risk assessment must belong to this organisation';end if;
  target:=nullif(p_values->>'linked_permit_id','')::uuid;
  if target is not null and not exists(select 1 from public.hs_permits where id=target and organization_id=p_org) then raise exception 'Permit must belong to this organisation';end if;
  target:=nullif(p_values->>'linked_inspection_id','')::uuid;
  if target is not null and not exists(select 1 from public.hs_workplace_inspections where id=target and organization_id=p_org) then raise exception 'Inspection must belong to this organisation';end if;
  update public.incident_reports set linked_assessment_id=nullif(p_values->>'linked_assessment_id','')::uuid,linked_permit_id=nullif(p_values->>'linked_permit_id','')::uuid,linked_inspection_id=nullif(p_values->>'linked_inspection_id','')::uuid where id=r.id;
 elsif p_command in ('create_moc','link_moc') then
  if r.linked_moc_id is not null then raise exception 'MOC already linked';end if;
  if p_command='link_moc' then
   target:=nullif(p_values->>'target_id','')::uuid;
   if target is null or not exists(select 1 from public.hs_moc_changes where id=target and organization_id=p_org) then raise exception 'MOC must belong to this organisation';end if;
  else
   if r.triaged_at is null then raise exception 'Triage and appoint an investigator before creating MOC';end if;
   if length(trim(coalesce(p_values->>'change_description','')))<20 or nullif(p_values->>'target_date','') is null then raise exception 'Describe the proposed change and target date';end if;
   select user_id into owner_user from public.organization_people where id=r.investigator_person_id and organization_id=p_org and account_status='active';
   if owner_user is null then raise exception 'The change owner needs an active linked account';end if;
   insert into public.hs_moc_changes(owner_id,organization_id,moc_reference,title,requestor_name,department,change_description,change_type,duration_type,affected_area,pathway,target_date,screening_answers,status,source_incident_report_id,administration_location_id,administration_location_snapshot,change_owner_person_id)
   values(p_actor,p_org,'MOC-'||r.reference,r.title,'Incident administrator','Incident response',p_values->>'change_description','other','permanent',r.location_label,'full',(p_values->>'target_date')::date,jsonb_build_array(jsonb_build_object('question','Incident-initiated change: confirm screening, scope and controls at the HSE gate before approval','answer','review_required')),'hse_gate',r.id,r.site_id::text,r.location_label,r.investigator_person_id) returning id into target;
  end if;
  update public.incident_reports set linked_moc_id=target where id=r.id;
 elsif p_command='triage' then
  actual:=(p_values->>'actual_severity')::integer;potential:=(p_values->>'potential_severity')::integer;chance:=(p_values->>'likelihood')::integer;
  if actual not between 1 and 5 or potential not between 1 and 5 or chance not between 1 and 5 or actual is null or potential is null or chance is null then raise exception 'Complete actual, potential and likelihood scores';end if;
  score:=greatest(actual,potential)*chance;band:=case when r.immediate_danger or score>=20 then 'critical' when score>=12 then 'high' when score>=5 then 'medium' else 'low' end;
  team:=array(select jsonb_array_elements_text(coalesce(p_values->'team_person_ids','[]'))::uuid);
  perform public.assert_active_organisation_person((p_values->>'investigator_person_id')::uuid,p_org,'Investigator');perform public.assert_active_organisation_person((p_values->>'verifier_person_id')::uuid,p_org,'Independent verifier');
  if nullif(p_values->>'investigator_person_id','') is null or nullif(p_values->>'verifier_person_id','') is null or p_values->>'investigator_person_id'=p_values->>'verifier_person_id' then raise exception 'Select different investigator and verifier';end if;
  foreach resource_person in array team loop perform public.assert_active_organisation_person(resource_person,p_org,'Response team');end loop;
  next_status:=p_values->>'status';if next_status not in ('triaged','investigating','actions_open','awaiting_verification','rejected','duplicate') then raise exception 'Invalid triage status';end if;
  if length(trim(coalesce(p_values->>'triage_notes','')))<10 then raise exception 'Record the triage decision';end if;
  target:=nullif(p_values->>'duplicate_of','')::uuid;if next_status='duplicate' and (target is null or target=r.id or not exists(select 1 from public.incident_reports where id=target and organization_id=p_org)) then raise exception 'Link a different incident in this organisation';end if;
  target:=nullif(p_values->>'linked_bcp_plan_id','')::uuid;if target is not null and not exists(select 1 from public.bcp_plans where id=target and organization_id=p_org) then raise exception 'Continuity plan must belong to this organisation';end if;
  if nullif(p_values->>'pack_code','') is not null and not exists(select 1 from public.hs_inspection_question_packs where pack_code=p_values->>'pack_code' and active and (organization_id is null or organization_id=p_org)) then raise exception 'Choose an available inspection pack';end if;
  if p_values ? 'domains' and (jsonb_array_length(p_values->'domains')=0 or (r.linked_security_incident_id is not null and not (p_values->'domains' ? 'information_security'))) then raise exception 'Choose valid reporting areas and preserve a linked security handoff';end if;
  if nullif(p_values->>'director_person_id','') is not null then
   select user_id into owner_user from public.organization_people where id=(p_values->>'director_person_id')::uuid and organization_id=p_org;
   if not public.incident_director_authorised(owner_user,p_org,(p_values->>'director_person_id')::uuid) then raise exception 'Select an authorised Director with Incident Approve access';end if;
   if p_values->>'director_person_id'=p_values->>'investigator_person_id' then raise exception 'Director must be independent of the investigation';end if;
  end if;
  update public.incident_reports set director_person_id=nullif(p_values->>'director_person_id','')::uuid,domains=case when p_values ? 'domains' then array(select jsonb_array_elements_text(p_values->'domains')) else domains end,report_type=coalesce(p_values->>'report_type',report_type),actual_severity=actual,potential_severity=potential,likelihood=chance,risk_score=score,criticality=band,
   investigator_person_id=(p_values->>'investigator_person_id')::uuid,verifier_person_id=(p_values->>'verifier_person_id')::uuid,team_person_ids=team,
   triage_notes=p_values->>'triage_notes',status=next_status,triaged_at=coalesce(triaged_at,now()),triaged_by=coalesce(triaged_by,p_actor),
   regulatory_decision=coalesce(p_values->>'regulatory_decision','not_assessed'),regulatory_reason=coalesce(p_values->>'regulatory_reason',''),regulatory_authority=coalesce(p_values->>'regulatory_authority',''),regulatory_due_at=nullif(p_values->>'regulatory_due_at','')::timestamptz,regulatory_reported_at=nullif(p_values->>'regulatory_reported_at','')::timestamptz,regulatory_reference=coalesce(p_values->>'regulatory_reference',''),
   continuity_decision=coalesce(p_values->>'continuity_decision','not_assessed'),linked_bcp_plan_id=target,duplicate_of=nullif(p_values->>'duplicate_of','')::uuid,pack_code=nullif(p_values->>'pack_code','') where id=r.id;
 elsif p_command='investigate' then
  if not (a->>'admin')::boolean and (person_id is distinct from r.investigator_person_id or a->>'level' not in ('contribute','review','approve','admin')) then raise exception 'Assigned investigator authority required';end if;
  update public.incident_reports set investigation_details=coalesce(p_values->'investigation_details',investigation_details),injured_count=coalesce(nullif(p_values->>'injured_count',''),'0')::integer,lost_time_days=coalesce(nullif(p_values->>'lost_time_days',''),'0')::numeric,disruption_minutes=coalesce(nullif(p_values->>'disruption_minutes',''),'0')::numeric,personal_data_suspected=coalesce((p_values->>'personal_data_suspected')::boolean,false),affected_services=coalesce(p_values->>'affected_services',''),security_impacts=array(select jsonb_array_elements_text(coalesce(p_values->'security_impacts','[]'))),investigation_summary=coalesce(p_values->>'investigation_summary',''),cause_summary=coalesce(p_values->>'cause_summary',''),lessons_learned=coalesce(p_values->>'lessons_learned','') where id=r.id;
 elsif p_command='allocate_task' then
  if r.triaged_at is null then raise exception 'Triage the report before allocating actions';end if;
  perform public.assert_active_organisation_person((p_values->>'owner_person_id')::uuid,p_org,'Action owner');perform public.assert_active_organisation_person((p_values->>'verifier_person_id')::uuid,p_org,'Action verifier');
  team:=array(select jsonb_array_elements_text(coalesce(p_values->'support_person_ids','[]'))::uuid);foreach resource_person in array team loop perform public.assert_active_organisation_person(resource_person,p_org,'Support resource');end loop;
  target:=nullif(p_values->>'related_assessment_id','')::uuid;if target is not null and not exists(select 1 from public.hs_risk_assessments where id=target and organization_id=p_org and administration_location_id=r.site_id::text) then raise exception 'Risk assessment must belong to this site';end if;
  insert into public.incident_tasks(organization_id,incident_id,title,task_type,owner_person_id,verifier_person_id,support_person_ids,due_at,resources,budget_amount,currency,estimated_hours,resource_decision,related_assessment_id,created_by)
  values(p_org,r.id,p_values->>'title',p_values->>'task_type',(p_values->>'owner_person_id')::uuid,(p_values->>'verifier_person_id')::uuid,team,(p_values->>'due_at')::timestamptz,coalesce(p_values->>'resources',''),coalesce(nullif(p_values->>'budget_amount',''),'0')::numeric,coalesce(nullif(p_values->>'currency',''),'GBP'),coalesce(nullif(p_values->>'estimated_hours',''),'0')::numeric,coalesce(p_values->>'resource_decision','allocated'),target,p_actor) returning id into new_id;
  update public.incident_reports set status='actions_open',team_person_ids=array(select distinct x from unnest(team_person_ids||array[(p_values->>'owner_person_id')::uuid,(p_values->>'verifier_person_id')::uuid]||team) x) where id=r.id;
 elsif p_command='reallocate_task' then
  select * into t from public.incident_tasks where id=(p_values->>'task_id')::uuid and incident_id=r.id and organization_id=p_org for update;
  if not found or t.status not in ('open','in_progress') then raise exception 'Only open actions can be reallocated; return submitted evidence first';end if;
  if length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Record the resource reallocation rationale';end if;
  perform public.assert_active_organisation_person((p_values->>'owner_person_id')::uuid,p_org,'Action owner');perform public.assert_active_organisation_person((p_values->>'verifier_person_id')::uuid,p_org,'Action verifier');
  team:=array(select jsonb_array_elements_text(coalesce(p_values->'support_person_ids','[]'))::uuid);foreach resource_person in array team loop perform public.assert_active_organisation_person(resource_person,p_org,'Support resource');end loop;
  update public.incident_tasks set owner_person_id=(p_values->>'owner_person_id')::uuid,verifier_person_id=(p_values->>'verifier_person_id')::uuid,support_person_ids=team,due_at=(p_values->>'due_at')::timestamptz,resources=coalesce(p_values->>'resources',''),budget_amount=coalesce(nullif(p_values->>'budget_amount',''),'0')::numeric,currency=coalesce(nullif(p_values->>'currency',''),'GBP'),estimated_hours=coalesce(nullif(p_values->>'estimated_hours',''),'0')::numeric,resource_decision=p_values->>'resource_decision',updated_at=now() where id=t.id;
  update public.incident_reports set team_person_ids=array(select distinct x from unnest(team_person_ids||array[(p_values->>'owner_person_id')::uuid,(p_values->>'verifier_person_id')::uuid]||team) x) where id=r.id;
 elsif p_command in ('complete_task','verify_task','return_task','cancel_task') then
  if not (a->>'admin')::boolean and a->>'level' not in ('contribute','review','approve','admin') then raise exception 'Incident contributor access required';end if;
  select * into t from public.incident_tasks where id=(p_values->>'task_id')::uuid and incident_id=r.id and organization_id=p_org for update;if not found then raise exception 'Action not found';end if;
  if p_command='cancel_task' then
   if not (a->>'admin')::boolean or length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Administrator cancellation rationale required';end if;
   update public.incident_tasks set status='cancelled',verification_note=p_values->>'note',updated_at=now() where id=t.id;
  elsif p_command='complete_task' then
   if person_id is distinct from t.owner_person_id and not (a->>'admin')::boolean then raise exception 'Only the action owner can submit completion';end if;
   if t.status not in ('open','in_progress') or length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Provide completion evidence for an open action';end if;
   update public.incident_tasks set status='awaiting_verification',completion_evidence=p_values->>'note',completed_at=now(),completed_by=p_actor,updated_at=now() where id=t.id;
  else
   select user_id into verifier_user from public.organization_people where id=t.verifier_person_id and organization_id=p_org and account_status='active';
   select user_id into owner_user from public.organization_people where id=t.owner_person_id and organization_id=p_org;
   if verifier_user is distinct from p_actor or p_actor=t.completed_by or p_actor=owner_user or t.status<>'awaiting_verification' then raise exception 'The assigned independent verifier must review submitted evidence';end if;
   if length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Record the verification evidence and conclusion';end if;
   update public.incident_tasks set status=case when p_command='verify_task' then 'verified' else 'in_progress' end,verification_note=p_values->>'note',verified_at=case when p_command='verify_task' then now() else null end,verified_by=case when p_command='verify_task' then p_actor else null end,updated_at=now() where id=t.id;
  end if;
 elsif p_command in ('link_rca','create_rca') then
  if r.triaged_at is null then raise exception 'Triage before CAPA escalation';end if;
  if r.linked_rca_case_id is not null then raise exception 'A CAPA case is already linked';end if;
  if p_command='link_rca' then target:=(p_values->>'target_id')::uuid;if not exists(select 1 from public.rca_cases where id=target and organization_id=p_org) then raise exception 'CAPA case must belong to this organisation';end if;
  else
   select owner_id into owner_user from public.organizations where id=p_org;
   insert into public.rca_cases(owner_id,organization_id,method,case_type,capa_current_stage,source_type,title,problem_statement,severity,status,current_discipline,detected_at,source_incident_report_id,accountable_person_id,effectiveness_verifier_person_id)
   values(owner_user,p_org,'8d','8d',null,'incident',r.title,r.reference||': '||r.description,r.criticality,'draft',0,r.occurred_at,r.id,r.investigator_person_id,r.verifier_person_id) returning id into target;
   insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data) values(target,owner_user,'case_created',0,'Escalated from incident '||r.reference,jsonb_build_object('incident_report_id',r.id));
  end if;
  update public.incident_reports set linked_rca_case_id=target where id=r.id;
 elsif p_command in ('link_security','create_security') then
  if r.triaged_at is null or not ('information_security'=any(r.domains)) then raise exception 'Triage an information security report first';end if;
  if r.linked_security_incident_id is not null then raise exception 'A security case is already linked';end if;
  if p_command='link_security' then target:=(p_values->>'target_id')::uuid;if not exists(select 1 from public.isms_security_incidents where id=target and organization_id=p_org) then raise exception 'Security case must belong to this organisation';end if;
  else
   select owner_id into owner_user from public.organizations where id=p_org;
   insert into public.isms_security_incidents(organization_id,owner_id,incident_reference,title,description,incident_type,severity,status,detected_at,administration_location_id,administration_location_label,incident_lead_person_id,verifier_person_id,source_incident_report_id,created_by_user_id,updated_by_user_id)
   values(p_org,owner_user,'SEC-'||r.reference,r.title,r.description,'security_event',r.criticality,'reported',r.occurred_at,r.site_id::text,r.location_label,r.investigator_person_id,r.verifier_person_id,r.id,p_actor,p_actor) returning id into target;
  end if;
  update public.incident_reports set linked_security_incident_id=target where id=r.id;
 elsif p_command='publish_update' then update public.incident_reports set public_update=coalesce(p_values->>'public_update','') where id=r.id;
 elsif p_command in ('close','verify_case') then
  if a->>'level' not in ('review','approve','admin') then raise exception 'Incident reviewer access required for closure';end if;
  select user_id into verifier_user from public.organization_people where id=r.verifier_person_id and organization_id=p_org and account_status='active';
  select user_id into owner_user from public.organization_people where id=r.investigator_person_id and organization_id=p_org;
  if verifier_user is distinct from p_actor or p_actor=owner_user or r.status<>'awaiting_verification' then raise exception 'The assigned independent verifier must close the case after review';end if;
  if r.triaged_at is null or length(trim(r.investigation_summary))<20 or length(trim(r.cause_summary))<10 or length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Complete investigation, causal analysis and closure verification';end if;
  if exists(select 1 from public.incident_tasks where incident_id=r.id and status not in ('verified','cancelled')) then raise exception 'All actions must be independently verified or cancelled with rationale';end if;
  if r.regulatory_decision='not_assessed' or length(trim(r.regulatory_reason))<10 then raise exception 'Record the regulatory reporting assessment before closure';end if;
  if r.regulatory_decision='required' and (r.regulatory_reported_at is null or length(trim(r.regulatory_reference))<3) then raise exception 'Record required external reporting before closure';end if;
  if 'business_continuity'=any(r.domains) and r.continuity_decision='not_assessed' then raise exception 'Assess the continuity response before closure';end if;
  if r.linked_rca_case_id is not null and not exists(select 1 from public.rca_cases where id=r.linked_rca_case_id and status='closed') then raise exception 'The linked CAPA case must complete its controlled closure first';end if;
  if r.linked_security_incident_id is not null and not exists(select 1 from public.isms_security_incidents where id=r.linked_security_incident_id and status='closed') then raise exception 'The linked security case must close through its own controls first';end if;
  if r.linked_moc_id is not null and not exists(select 1 from public.hs_moc_changes where id=r.linked_moc_id and organization_id=p_org and status='closed') then raise exception 'The linked MOC must complete its controlled closure first';end if;
  if p_command='verify_case' then
   update public.incident_reports set case_verified_at=now(),case_verified_by=p_actor,case_verified_version=version+1,case_verification_note=p_values->>'note' where id=r.id;
  else
   update public.incident_reports set case_verified_version=case when case_verified_version=version then version+1 else case_verified_version end,director_approved_version=case when director_approved_version=version then version+1 else director_approved_version end,status='closed',closed_at=now(),closed_by=p_actor where id=r.id;
  end if;
 elsif p_command='reopen' then if length(trim(coalesce(p_values->>'note','')))<10 then raise exception 'Record why the case is being reopened';end if;update public.incident_reports set status='investigating',closed_at=null,closed_by=null where id=r.id;
 else raise exception 'Unknown incident operation';end if;
 update public.incident_reports set planning_sync_status='pending',planning_sync_message='' where id=r.id and p_command in ('triage','close','reopen') and triaged_at is not null;
 update public.incident_reports set version=version+1,updated_at=now() where id=r.id returning * into r;
 insert into public.incident_events(organization_id,incident_id,actor_user_id,event_type,summary,event_data) values(p_org,r.id,p_actor,p_command,case when p_command in ('verify_task','return_task','cancel_task','close','verify_case','approve_director','reopen','reallocate_task') then left(coalesce(p_values->>'note',p_command),2000) else replace(p_command,'_',' ')||' · version '||r.version end,jsonb_build_object('version',r.version,'status',r.status,'criticality',r.criticality,'director_person_id',r.director_person_id,'director_approved_at',r.director_approved_at,'case_verified_at',r.case_verified_at,'linked_moc_id',r.linked_moc_id,'linked_assessment_id',r.linked_assessment_id,'linked_permit_id',r.linked_permit_id,'linked_inspection_id',r.linked_inspection_id,'risk_score',r.risk_score,'investigator_person_id',r.investigator_person_id,'verifier_person_id',r.verifier_person_id,'task_id',coalesce(new_id::text,p_values->>'task_id'),'owner_person_id',p_values->>'owner_person_id','task_verifier_person_id',case when p_command in ('allocate_task','reallocate_task') then p_values->>'verifier_person_id' end,'due_at',p_values->>'due_at','budget_amount',p_values->>'budget_amount','currency',p_values->>'currency','estimated_hours',p_values->>'estimated_hours','resource_decision',p_values->>'resource_decision','resources',p_values->>'resources'));
 update public.incident_engine_signals set active=false,updated_at=now() where incident_id=r.id;
 insert into public.incident_engine_signals(incident_id,organization_id,domain,active,priority,site_id,zone_id)
 select r.id,p_org,d,r.triaged_at is not null and r.status not in ('closed','rejected','duplicate'),coalesce(r.criticality,r.reported_criticality),r.site_id,r.zone_id from unnest(r.domains) d
 on conflict(incident_id,domain) do update set active=excluded.active,priority=excluded.priority,updated_at=now();
 return jsonb_build_object('id',r.id,'version',r.version,'linked_rca_case_id',r.linked_rca_case_id,'linked_security_incident_id',r.linked_security_incident_id);
end $$;

-- Private evidence and task changes invalidate previously recorded approval.
create or replace function public.incident_supporting_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.incident_reports set case_verified_at=null,case_verified_by=null,case_verified_version=null,case_verification_note='',director_approved_at=null,director_approved_by=null,director_approved_version=null,director_approval_note='',version=version+1,updated_at=now()
 where id=new.incident_id and organization_id=new.organization_id and (director_approved_at is not null or case_verified_at is not null) and status not in ('closed','rejected','duplicate');
 return new;
end $$;
drop trigger if exists incident_evidence_revision on public.incident_evidence;
create trigger incident_evidence_revision after insert on public.incident_evidence for each row execute function public.incident_supporting_change();
drop trigger if exists incident_task_revision on public.incident_tasks;
create trigger incident_task_revision after insert or update on public.incident_tasks for each row execute function public.incident_supporting_change();
-- Replacements retain service-only grants. Explicitly deny new helper execution.
revoke all on function public.incident_revision_guard() from public,anon,authenticated;
revoke all on function public.incident_supporting_change() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
