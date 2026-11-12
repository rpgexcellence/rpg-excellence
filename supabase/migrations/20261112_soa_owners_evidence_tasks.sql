-- Apply before deploying the SoA workflow release. Existing SoA decisions are retained.
begin;
alter table public.assessment_soa_entries
 add column if not exists organization_id uuid references public.organizations(id),
 add column if not exists control_owner_person_id uuid references public.organization_people(id),
 add column if not exists risk_owner_person_id uuid references public.organization_people(id),
 add column if not exists action_owner_person_id uuid references public.organization_people(id),
 add column if not exists action_verifier_person_id uuid references public.organization_people(id),
 add column if not exists action_status text not null default 'not_required',
 add column if not exists action_completion_evidence text,
 add column if not exists action_verification_conclusion text,
 add column if not exists action_verified_by uuid references auth.users(id),
 add column if not exists action_verified_at timestamptz;
update public.assessment_soa_entries e set organization_id=a.organization_id from public.assessments a where e.assessment_id=a.id and e.organization_id is null;
update public.assessment_soa_entries set action_status='planned' where nullif(trim(action_required),'') is not null and action_status='not_required';
alter table public.assessment_soa_entries drop constraint if exists soa_action_status_check;
alter table public.assessment_soa_entries add constraint soa_action_status_check check(action_status in ('not_required','planned','in_progress','awaiting_verification','verified','cancelled'));
create index if not exists soa_company_action_idx on public.assessment_soa_entries(organization_id,action_owner_person_id,action_status,target_date);

create table if not exists public.soa_control_evidence (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.assessments(id) on delete cascade,
 organization_id uuid not null references public.organizations(id),
 owner_id uuid not null references auth.users(id),
 control_id text not null,
 evidence_kind text not null check(evidence_kind in ('implementation','effectiveness')),
 storage_path text not null unique,
 file_name text not null,
 mime_type text not null,
 size_bytes integer not null check(size_bytes>0 and size_bytes<=10485760),
 uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.soa_control_evidence enable row level security;
revoke all on public.soa_control_evidence from anon,authenticated;
grant select,insert on public.soa_control_evidence to service_role;
-- Existing server actions already write through the service role. Keep browser reads,
-- and prevent direct browser writes from bypassing owner, evidence and task validation.
revoke insert,update,delete on public.assessment_soa_entries,public.assessment_soa_registers from anon,authenticated;
grant select,insert,update on public.assessment_soa_entries,public.assessment_soa_registers to service_role;
grant select,insert,update,delete on public.isms_risk_controls to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('soa-control-evidence','soa-control-evidence',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.soa_workflow_events (
 id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.assessments(id) on delete cascade,
 organization_id uuid not null references public.organizations(id),control_id text not null,actor_id uuid not null references auth.users(id),
 event_data jsonb not null,created_at timestamptz not null default now()
);
alter table public.soa_workflow_events enable row level security;
revoke all on public.soa_workflow_events from anon,authenticated;
grant select,insert on public.soa_workflow_events to service_role;

create or replace function public.save_soa_control_workflow(p_assessment uuid,p_actor uuid,p_control text,p_expected timestamptz,p_values jsonb,p_risks uuid[],p_files jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 a public.assessments%rowtype; old_entry public.assessment_soa_entries%rowtype; saved public.assessment_soa_entries%rowtype;
 found_old boolean; member_write boolean; member_approve boolean; person_key text; person_id uuid; file jsonb; columns_sql text; update_sql text; payload jsonb;
 allowed text[]:=array['soa_register_id','assessment_id','owner_id','organization_id','control_id','applicability','applicability_justification','inclusion_source','implementation_status','control_description','control_owner','control_owner_person_id','implementation_evidence','effectiveness_evidence','residual_risk','residual_risk_level','residual_likelihood','residual_impact','residual_risk_score','residual_risk_rationale','risk_owner','risk_owner_person_id','treatment_decision','risk_acceptance_authority','risk_accepted_at','risk_review_due_at','action_required','action_owner_person_id','action_verifier_person_id','action_status','action_completion_evidence','action_verification_conclusion','action_verified_by','action_verified_at','target_date','assessor_conclusion','finding_reference','last_reviewed_at','updated_at'];
begin
 select * into a from public.assessments where id=p_assessment for share;
 if a.id is null or a.organization_id is null or a.standard not in ('ISO/IEC 27001:2022','ISO/IEC 27001:2022/Amd 1:2024') then raise exception 'SoA assessment unavailable';end if;
 select exists(select 1 from public.organization_people p where p.user_id=p_actor and p.organization_id=a.organization_id and p.account_status='active' and (
 exists(select 1 from public.organization_person_permissions m where m.person_id=p.id and m.organization_id=a.organization_id and m.module_key='information_security' and m.access_level in ('contribute','review','approve','admin')) or
 exists(select 1 from public.organization_person_authorizations f where f.person_id=p.id and f.organization_id=a.organization_id and f.function_key='company_administrator' and f.status='authorised' and (f.expires_at is null or f.expires_at>=current_date)))) into member_write;
 if p_actor is null or not(a.owner_id=p_actor or member_write) then raise exception 'Actor outside authorised assessment company';end if;
 select exists(select 1 from public.organization_people p where p.user_id=p_actor and p.organization_id=a.organization_id and p.account_status='active' and (
 exists(select 1 from public.organization_person_permissions m where m.person_id=p.id and m.organization_id=a.organization_id and m.module_key='information_security' and m.access_level in ('approve','admin')) or
 exists(select 1 from public.organization_person_authorizations f where f.person_id=p.id and f.organization_id=a.organization_id and f.function_key='company_administrator' and f.status='authorised' and (f.expires_at is null or f.expires_at>=current_date)))) into member_approve;
 if p_control!~'^[5-8]\.[0-9]{1,2}$' or not exists(select 1 from public.iso27001_control_catalog where control_id=p_control and active=true) then raise exception 'Invalid control';end if;
 if not exists(select 1 from public.assessment_soa_registers where id=(p_values->>'soa_register_id')::uuid and assessment_id=a.id and owner_id=a.owner_id) then raise exception 'Register outside assessment';end if;
 select * into old_entry from public.assessment_soa_entries where assessment_id=a.id and control_id=p_control for update;
 found_old:=found;
 if found_old and old_entry.updated_at is distinct from p_expected then raise exception 'This control changed. Reload before saving.';end if;
 if not found_old and p_expected is not null then raise exception 'This control changed. Reload before saving.';end if;
 if exists(select 1 from jsonb_object_keys(p_values) k where not(k=any(allowed))) then raise exception 'Unsupported SoA field';end if;
 payload:=p_values||jsonb_build_object('assessment_id',a.id,'owner_id',a.owner_id,'organization_id',a.organization_id,'control_id',p_control,'updated_at',now());
 foreach person_key in array array['control_owner_person_id','risk_owner_person_id','action_owner_person_id','action_verifier_person_id'] loop
  person_id:=nullif(payload->>person_key,'')::uuid;
  if person_id is not null and not exists(select 1 from public.organization_people p where p.id=person_id and p.organization_id=a.organization_id and p.account_status='active') then raise exception 'Owner outside active company directory';end if;
 end loop;
 if cardinality(coalesce(p_risks,'{}'::uuid[]))>100 or exists(select 1 from unnest(coalesce(p_risks,'{}'::uuid[])) r where not exists(select 1 from public.isms_risks x where x.id=r and x.organization_id=a.organization_id and x.owner_id=a.owner_id and x.status<>'archived')) then raise exception 'Linked risk outside current company';end if;
 if payload->>'applicability'='not_applicable' and cardinality(coalesce(p_risks,'{}'::uuid[]))>0 then raise exception 'Linked risk treatments cannot be excluded';end if;
 if nullif(trim(payload->>'action_required'),'') is not null and (nullif(payload->>'action_owner_person_id','') is null or nullif(payload->>'target_date','') is null or payload->>'action_status'='not_required') then raise exception 'Action owner, status and target date required';end if;
 if nullif(trim(payload->>'action_required'),'') is null and nullif(trim(old_entry.action_required),'') is not null then raise exception 'Cancel the recorded action instead of removing it';end if;
 if payload->>'action_status' in ('awaiting_verification','verified') then
  if nullif(payload->>'action_verifier_person_id','') is null or nullif(trim(payload->>'action_completion_evidence'),'') is null then raise exception 'Verifier and completion evidence required';end if;
  if payload->>'action_owner_person_id'=payload->>'action_verifier_person_id' or exists(select 1 from public.organization_people p join public.organization_people v on v.user_id=p.user_id where p.id=(payload->>'action_owner_person_id')::uuid and v.id=(payload->>'action_verifier_person_id')::uuid) then raise exception 'Independent verifier required';end if;
 end if;
 if payload->>'action_status'='verified' then
  if not(a.owner_id=p_actor or member_approve) then raise exception 'Approval access required for verification';end if;
  if old_entry.action_status not in ('awaiting_verification','verified') or old_entry.action_status is null then raise exception 'Submit the action for verification first';end if;
  if not exists(select 1 from public.organization_people p where p.id=(payload->>'action_verifier_person_id')::uuid and p.user_id=p_actor and p.account_status='active' and p.organization_id=a.organization_id) or nullif(trim(payload->>'action_verification_conclusion'),'') is null then raise exception 'Assigned independent reviewer and conclusion required';end if;
  payload:=payload||jsonb_build_object('action_verified_by',p_actor,'action_verified_at',now());
 else payload:=payload||jsonb_build_object('action_verified_by',null,'action_verified_at',null);end if;
 select string_agg(format('%I',k),',' order by k),string_agg(format('%I=excluded.%I',k,k),',' order by k) into columns_sql,update_sql from jsonb_object_keys(payload) k;
 execute format('insert into public.assessment_soa_entries (%s) select %s from jsonb_populate_record(null::public.assessment_soa_entries,$1) on conflict(assessment_id,control_id) do update set %s returning *',columns_sql,columns_sql,update_sql) using payload into saved;
 delete from public.isms_risk_controls where assessment_id=a.id and control_id=p_control and organization_id=a.organization_id and owner_id=a.owner_id and not(risk_id=any(coalesce(p_risks,'{}'::uuid[])));
 insert into public.isms_risk_controls(risk_id,assessment_id,control_id,organization_id,owner_id)
 select distinct r,a.id,p_control,a.organization_id,a.owner_id from unnest(coalesce(p_risks,'{}'::uuid[])) r on conflict(risk_id,assessment_id,control_id) do nothing;
 for file in select * from jsonb_array_elements(coalesce(p_files,'[]'::jsonb)) loop
  if file->>'evidence_kind' not in ('implementation','effectiveness') or (file->>'size_bytes')::integer not between 1 and 10485760 or left(file->>'storage_path',length(a.organization_id::text||'/'||a.id::text||'/'||replace(p_control,'.','_')||'/'))<>a.organization_id::text||'/'||a.id::text||'/'||replace(p_control,'.','_')||'/' then raise exception 'Invalid company evidence metadata';end if;
  insert into public.soa_control_evidence(assessment_id,organization_id,owner_id,control_id,evidence_kind,storage_path,file_name,mime_type,size_bytes,uploaded_by)
  values(a.id,a.organization_id,a.owner_id,p_control,file->>'evidence_kind',file->>'storage_path',file->>'file_name',file->>'mime_type',(file->>'size_bytes')::integer,p_actor);
 end loop;
 insert into public.soa_workflow_events(assessment_id,organization_id,control_id,actor_id,event_data)
 values(a.id,a.organization_id,p_control,p_actor,jsonb_build_object('previous',case when found_old then to_jsonb(old_entry) else null end,'saved',to_jsonb(saved),'risk_ids',p_risks,'evidence_files',p_files));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_soa_control_workflow(uuid,uuid,text,timestamptz,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.save_soa_control_workflow(uuid,uuid,text,timestamptz,jsonb,uuid[],jsonb) to service_role;
create or replace function public.guard_soa_risk_company() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.isms_risks r where r.id=new.risk_id and r.organization_id=new.organization_id and r.owner_id=new.owner_id) then raise exception 'Risk link outside company';end if;
 if new.assessment_id is not null and not exists(select 1 from public.assessments a where a.id=new.assessment_id and a.organization_id=new.organization_id and a.owner_id=new.owner_id and a.standard in ('ISO/IEC 27001:2022','ISO/IEC 27001:2022/Amd 1:2024')) then raise exception 'SoA link outside company';end if;
 if not exists(select 1 from public.iso27001_control_catalog where control_id=new.control_id and active=true) then raise exception 'Unknown control';end if;
 return new;
end $$;
revoke all on function public.guard_soa_risk_company() from public,anon,authenticated;
drop trigger if exists soa_risk_company on public.isms_risk_controls;
create trigger soa_risk_company before insert or update on public.isms_risk_controls for each row execute function public.guard_soa_risk_company();
-- Risk-workspace edits replace only their selected SoA's links, atomically.
create or replace function public.replace_isms_soa_links(p_risk uuid,p_actor uuid,p_assessment uuid,p_controls jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.isms_risks%rowtype;c jsonb;
begin
 select * into r from public.isms_risks where id=p_risk and owner_id=p_actor for update;
 if r.id is null then raise exception 'Risk outside authorised owner';end if;
 if p_assessment is not null and not exists(select 1 from public.assessments a where a.id=p_assessment and a.organization_id=r.organization_id and a.owner_id=r.owner_id and a.standard in ('ISO/IEC 27001:2022','ISO/IEC 27001:2022/Amd 1:2024')) then raise exception 'SoA outside risk company';end if;
 if jsonb_typeof(p_controls)<>'array' or jsonb_array_length(p_controls)>93 then raise exception 'Invalid control selection';end if;
 if exists(select 1 from jsonb_array_elements(p_controls) x where not exists(select 1 from public.iso27001_control_catalog cc where cc.control_id=x->>'control_id' and cc.active=true)) then raise exception 'Unknown control';end if;
 delete from public.isms_risk_controls where risk_id=r.id and owner_id=r.owner_id and assessment_id is not distinct from p_assessment;
 for c in select * from jsonb_array_elements(p_controls) loop
 insert into public.isms_risk_controls(risk_id,owner_id,organization_id,assessment_id,control_id,treatment_purpose,design_status,operating_effectiveness,evidence_reference,review_due_date)
 values(r.id,r.owner_id,r.organization_id,p_assessment,c->>'control_id',coalesce(c->>'treatment_purpose','Risk treatment'),coalesce(c->>'design_status','not_assessed'),coalesce(c->>'operating_effectiveness','not_tested'),nullif(c->>'evidence_reference',''),nullif(c->>'review_due_date','')::date);
 end loop;
end $$;
revoke all on function public.replace_isms_soa_links(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_isms_soa_links(uuid,uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
select 'soa_workflow' as check_name,has_function_privilege('service_role','public.save_soa_control_workflow(uuid,uuid,text,timestamptz,jsonb,uuid[],jsonb)','execute') as ready;
