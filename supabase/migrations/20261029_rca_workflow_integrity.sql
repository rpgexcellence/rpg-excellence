-- Run this whole file once in Supabase SQL Editor BEFORE deploying the JS files.
-- Additive: preserves existing case/evidence/action records and historical closures.
begin;
do $preflight$
declare item record; col text;
begin
 for item in select * from (values
 ('rca_cases',array['id','owner_id','organization_id','case_type','status','closed_at','current_discipline','capa_current_stage','leader_person_id','sponsor_person_id','leader_name','sponsor_name','detected_at','updated_at','assessment_finding_id','closure_summary','problem_statement','title']),
 ('rca_8d_disciplines',array['id','case_id','owner_id','discipline','status','narrative','human_approved','approved_by','approved_at','completion_score','no_action_required','no_action_justification']),
 ('rca_actions',array['id','case_id','owner_id','discipline','selection_status','action_owner_person_id','cause_id','status','due_date','effectiveness_criteria','selection_rationale','effectiveness_result','verified_by','verified_at','effectiveness_verification_method','effectiveness_verification_conclusion','d6_submitted_at']),
 ('rca_causes',array['id','case_id','owner_id','status','cause_type','validation_method','validation_result','validated_by','validated_at']),
 ('rca_capa_stages',array['id','case_id','owner_id','stage','stage_order','narrative','evidence_reference','decision','completed_at','completed_by']),
 ('rca_evidence',array['id','case_id','owner_id','action_id','discipline','storage_path']),
 ('rca_case_events',array['case_id','owner_id','event_type','discipline','summary','event_data']),
 ('rca_team_members',array['case_id','owner_id','active']),
 ('organization_people',array['id','user_id','organization_id','account_status']),
 ('internal_audit_findings',array['id','linked_rca_case_id','status']),
 ('internal_audit_action_access',array['id','rca_case_id','status','updated_at','d6_verification_completed_at'])
 ) as required(table_name,columns) loop
   foreach col in array item.columns loop
     if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=item.table_name and c.column_name=col) then raise exception 'Existing database prerequisite missing: %.%. No package changes have been committed.',item.table_name,col;end if;
   end loop;
 end loop;
end $preflight$;
alter table public.rca_cases add column if not exists workflow_profile text not null default 'general_8d';
alter table public.rca_8d_disciplines add column if not exists gate_data jsonb not null default '{}'::jsonb;
alter table public.rca_capa_stages add column if not exists review_data jsonb not null default '{}'::jsonb;
alter table public.rca_cases drop constraint if exists rca_workflow_profile_check;
alter table public.rca_cases add constraint rca_workflow_profile_check check(workflow_profile in ('general_8d','rm13000'));

alter table public.rca_8d_disciplines drop constraint if exists rca_gate_data_object;
alter table public.rca_8d_disciplines add constraint rca_gate_data_object check(jsonb_typeof(gate_data)='object');
alter table public.rca_capa_stages drop constraint if exists rca_review_data_object;
alter table public.rca_capa_stages add constraint rca_review_data_object check(jsonb_typeof(review_data)='object');

-- Evidence can now be retained from D0 and D1 as well as later stages.
do $$declare r record; att smallint;begin
 select attnum into att from pg_catalog.pg_attribute where attrelid='public.rca_evidence'::regclass and attname='discipline' and not attisdropped;
 for r in select conname from pg_catalog.pg_constraint where conrelid='public.rca_evidence'::regclass and contype='c' and conkey=array[att]::smallint[] loop execute format('alter table public.rca_evidence drop constraint %I',r.conname);end loop;
end $$;
alter table public.rca_evidence add constraint rca_evidence_workflow_discipline check(discipline between 0 and 8);

-- Internal only: parent lock serialises a child edit against final closure.
create or replace function public.rca_guard_child_write() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.rca_cases; cid uuid;
begin
 cid := case when TG_OP='DELETE' then old.case_id else new.case_id end;
 if TG_OP='UPDATE' and (new.case_id is distinct from old.case_id or new.owner_id is distinct from old.owner_id) then raise exception 'Controlled RCA parent references cannot be changed'; end if;
 select * into c from public.rca_cases where id=cid for update;
 if not found then if TG_OP='DELETE' then return old; end if; raise exception 'RCA case not found'; end if;
 if c.status='closed' or c.closed_at is not null or c.capa_current_stage='closed' then raise exception 'This case is closed. Use its authorised reopening process before editing.'; end if;
 if (case when TG_OP='DELETE' then old.owner_id else new.owner_id end) is distinct from c.owner_id then raise exception 'RCA owner mismatch'; end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;

-- Internal approval reset, invoked inside the same transaction as the edit.
create or replace function public.rca_withdraw_approvals(cid uuid, first_gate integer, reason text, previous_record jsonb default null) returns void language plpgsql security definer set search_path='' as $$
declare c public.rca_cases; approvals jsonb; previous_setting text;
begin
 if current_setting('rpg.rca_internal',true)='on' then return; end if;
 select * into c from public.rca_cases where id=cid for update;
 if not found then return; end if;
 if c.status='closed' or c.closed_at is not null then raise exception 'Closed case cannot be revised'; end if;
 select jsonb_agg(to_jsonb(d)) into approvals from public.rca_8d_disciplines d where d.case_id=cid and d.discipline>=first_gate and (d.status in ('approved','ready_for_review') or d.human_approved or d.approved_at is not null);
 -- Invalidate recorded action-effectiveness decisions when the causal basis or
 -- selected solution changes. Preserve the previous decisions in the event.
 if (first_gate<=5 or reason in ('Changed rca_8d_disciplines record requires renewed D6 onward review','Changed rca_evidence record requires renewed D6 onward review')) and exists(select 1 from public.rca_actions a where a.case_id=cid and a.discipline=5 and (a.verified_at is not null or a.d6_submitted_at is not null)) then
   insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data)
   select cid,c.owner_id,'action_verification_withdrawn',first_gate,'Investigation changed; implementation and effectiveness require renewed submission and verification',jsonb_build_object('reason',reason,'previous_actions',jsonb_agg(to_jsonb(a))) from public.rca_actions a where a.case_id=cid and a.discipline=5;
 end if;
 if approvals is not null or previous_record is not null then
   insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data) values(cid,c.owner_id,'dependent_approvals_withdrawn',least(first_gate,8),reason,jsonb_build_object('previous_approvals',approvals,'previous_record',previous_record,'actor_id',auth.uid()));
 end if;
 previous_setting:=current_setting('rpg.rca_internal',true); perform set_config('rpg.rca_internal','on',true);
 update public.rca_8d_disciplines set status='in_progress',human_approved=false,approved_by=null,approved_at=null,completion_score=0 where case_id=cid and discipline>=first_gate;
 if (first_gate<=5 or reason in ('Changed rca_8d_disciplines record requires renewed D6 onward review','Changed rca_evidence record requires renewed D6 onward review')) then update public.rca_actions set effectiveness_result=null,verified_by=null,verified_at=null,effectiveness_verification_method=null,effectiveness_verification_conclusion=null,d6_submitted_at=null,status=case when status='verified' then 'open' else status end where case_id=cid and discipline=5; end if;
 -- A changed investigation cannot reuse an accepted/submitted final response.
 if exists(select 1 from public.internal_audit_action_access x where x.rca_case_id=cid and x.status in ('submitted','accepted','verified_effective')) then
   insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data)
   select cid,c.owner_id,'final_response_review_withdrawn',least(first_gate,8),'Investigation revised; the final owner response requires renewed submission and review',jsonb_build_object('reason',reason,'previous_responses',jsonb_agg(jsonb_build_object('id',x.id,'status',x.status,'reviewed_at',to_jsonb(x)->'auditor_response_at','verified_at',to_jsonb(x)->'verified_at'))) from public.internal_audit_action_access x where x.rca_case_id=cid and x.status in ('submitted','accepted','verified_effective');
   update public.internal_audit_action_access set status='returned',d6_verification_completed_at=null,updated_at=clock_timestamp() where rca_case_id=cid and status in ('submitted','accepted','verified_effective');
 end if;
 update public.rca_cases set current_discipline=coalesce((select min(n) from generate_series(0,8)n where not exists(select 1 from public.rca_8d_disciplines d where d.case_id=cid and d.discipline=n and d.status='approved' and d.human_approved)),8),status=case when status='draft' then status else 'active' end where id=cid;
 perform set_config('rpg.rca_internal',coalesce(previous_setting,''),true);
end $$;

create or replace function public.rca_after_child_revision() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid; n integer; oldj jsonb; newj jsonb;
begin
 if current_setting('rpg.rca_internal',true)='on' then return null; end if;
 if TG_OP<>'INSERT' then oldj:=to_jsonb(old); end if; if TG_OP<>'DELETE' then newj:=to_jsonb(new); end if;
 cid:=coalesce((newj->>'case_id')::uuid,(oldj->>'case_id')::uuid);
 if TG_OP='UPDATE' and (oldj-'updated_at')=(newj-'updated_at') then return null; end if;
 if TG_TABLE_NAME='rca_8d_disciplines' then
   if TG_OP<>'UPDATE' then return null; end if;
   if oldj->'narrative' is not distinct from newj->'narrative' and oldj->'gate_data' is not distinct from newj->'gate_data' and oldj->'reviewer_person_id' is not distinct from newj->'reviewer_person_id' and old.status is not distinct from new.status and oldj->'no_action_justification' is not distinct from newj->'no_action_justification' and oldj->'no_action_required' is not distinct from newj->'no_action_required' then return null; end if;
   n:=new.discipline+1;
 elsif TG_TABLE_NAME='rca_causes' or TG_TABLE_NAME in ('rca_analysis_models','rca_analysis_nodes') then n:=4;
 elsif TG_TABLE_NAME='rca_team_members' then n:=1;
 elsif TG_TABLE_NAME='rca_evidence' then n:=coalesce((newj->>'discipline')::integer,(oldj->>'discipline')::integer,2);
 elsif TG_TABLE_NAME='rca_actions' then
   if coalesce((newj->>'discipline')::integer,(oldj->>'discipline')::integer,5)=3 then n:=3;
   elsif TG_OP='UPDATE' and (oldj-array['updated_at','status','effectiveness_result','verified_by','verified_at','effectiveness_verification_method','effectiveness_verification_conclusion','implementation_result','implementation_evidence','implementation_evidence_reference','d6_submitted_at','d6_submitted_by','d6_verification_requested_at'])=(newj-array['updated_at','status','effectiveness_result','verified_by','verified_at','effectiveness_verification_method','effectiveness_verification_conclusion','implementation_result','implementation_evidence','implementation_evidence_reference','d6_submitted_at','d6_submitted_by','d6_verification_requested_at']) then n:=6;
   else n:=coalesce((newj->>'discipline')::integer,(oldj->>'discipline')::integer,5); end if;
 else return null;
 end if;
 if n<=9 then perform public.rca_withdraw_approvals(cid,n,'Changed '||TG_TABLE_NAME||' record requires renewed D'||n||' onward review',oldj); end if;
 return null;
end $$;


create or replace function public.rca_gate_data_complete(n integer,profile text,data jsonb) returns boolean language sql immutable set search_path='' as $$
select not exists(select 1 from jsonb_array_elements_text('{"0":{"general_8d":[],"rm13000":["quantified_symptom","shipment_control","initial_boundaries","immediate_protection","affected_scope","notification","recurrence_check","milestone_due_at"]},"1":{"general_8d":[],"rm13000":["team_goal","trained_practitioner_person_id","competence_evidence","resources"]},"2":{"general_8d":[],"rm13000":["measurable_problem","discovery","impact","boundaries","customer_review"]},"3":{"general_8d":[],"rm13000":["containment_implementation","containment_effectiveness","resumption_authority"]},"4":{"general_8d":["human_factors","human_performance_actions"],"rm13000":["human_factors","human_performance_actions"]},"5":{"general_8d":[],"rm13000":["solution_validation","adverse_effects","milestone_due_at"]},"6":{"general_8d":[],"rm13000":["monitoring_start","monitoring_end","monitoring_results","adverse_effects","containment_release","process_updates"]},"7":{"general_8d":["read_across","system_changes","implementation_evidence","champion_review"],"rm13000":["read_across","system_changes","implementation_evidence","champion_review"]},"8":{"general_8d":["records_complete","distribution","recognition","closure_authorisation"],"rm13000":["records_complete","distribution","recognition","closure_authorisation"]}}'::jsonb->n::text->profile) k where nullif(trim(data->>k),'') is null)
$$;
revoke all on function public.rca_gate_data_complete(integer,text,jsonb) from public,anon,authenticated;

create or replace function public.rca_guard_case_write() returns trigger language plpgsql security definer set search_path='' as $$
declare first_unapproved integer; a jsonb;
begin
 if old.status='closed' or old.closed_at is not null or old.capa_current_stage='closed' then
   if current_setting('rpg.rca_reopen',true)<>old.id::text or current_setting('rpg.rca_reopen',true) is null then
     -- The existing Findings & Actions transaction reopens its finding first.
     if not(coalesce(auth.role(),'')='service_role' and new.status<>'closed' and new.closed_at is null and exists(select 1 from public.internal_audit_findings f where f.linked_rca_case_id=old.id and f.status<>'closed')) then raise exception 'This case is closed. Use its authorised reopening process.'; end if;
   end if;
 end if;
 if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id or new.organization_id is distinct from old.organization_id then raise exception 'Controlled RCA company/owner cannot be changed'; end if;
 if new.case_type is distinct from old.case_type and old.status<>'draft' then raise exception 'An established corrective-action route cannot be changed'; end if;
 if new.workflow_profile='rm13000' and coalesce(new.case_type,'8d')<>'8d' then raise exception 'RM13000 requires the full 8D route'; end if;
 if new.status='closed' and old.status<>'closed' then
   if coalesce(new.case_type,'8d')='8d' then
     if auth.uid() is not null and exists(select 1 from public.organization_people p where p.id=new.leader_person_id and p.user_id=auth.uid()) then raise exception 'Final closure must be independent of the investigation leader'; end if;
     if (select count(distinct d.discipline) from public.rca_8d_disciplines d where d.case_id=new.id and d.discipline between 0 and 8 and d.status='approved' and d.human_approved and d.approved_by is not null and d.approved_at is not null)<>9 then raise exception 'All D0-D8 gates require explicit human approval before closure'; end if;
     if exists(select 1 from public.rca_8d_disciplines d where d.case_id=new.id and not public.rca_gate_data_complete(d.discipline,new.workflow_profile,d.gate_data)) then raise exception 'Review required approval evidence at each gate before final closure'; end if;
     if not exists(select 1 from public.rca_actions x where x.case_id=new.id and x.discipline=5 and x.selection_status='selected') or exists(select 1 from public.rca_actions x where x.case_id=new.id and x.discipline=5 and x.selection_status='selected' and (x.status<>'verified' or x.effectiveness_result not in ('effective','effective_verified') or x.effectiveness_result is null or x.verified_by is null or x.verified_at is null or nullif(trim(x.effectiveness_verification_method),'') is null or nullif(trim(x.effectiveness_verification_conclusion),'') is null or x.d6_submitted_at is null or x.verified_at<x.d6_submitted_at or not exists(select 1 from public.organization_people p where p.id=x.action_owner_person_id and p.organization_id=new.organization_id and p.user_id is not null and p.user_id<>x.verified_by) or not exists(select 1 from public.rca_evidence e where e.case_id=new.id and e.action_id=x.id and e.discipline=6 and e.storage_path is not null))) then raise exception 'Selected actions require independent, evidenced effectiveness verification'; end if;
   else
     if (select count(*) from public.rca_capa_stages s where s.case_id=new.id and s.completed_at is not null and s.completed_by is not null)<>4 or not exists(select 1 from public.rca_capa_stages s where s.case_id=new.id and s.stage='effectiveness_review' and s.decision='effective' and nullif(trim(s.evidence_reference),'') is not null and nullif(trim(s.review_data->>'method'),'') is not null and nullif(trim(s.review_data->>'monitoring_period'),'') is not null and not exists(select 1 from public.rca_capa_stages prior where prior.case_id=new.id and prior.stage<>'effectiveness_review' and prior.completed_by=s.completed_by)) then raise exception 'CAPA closure requires completed stages and an independent effectiveness review'; end if;
   end if;
 end if;
 if current_setting('rpg.rca_internal',true) is distinct from 'on' and coalesce(new.case_type,'8d')='8d' and new.status not in ('closed','draft') then
   select min(n) into first_unapproved from generate_series(0,8) n where not exists(select 1 from public.rca_8d_disciplines d where d.case_id=new.id and d.discipline=n and d.status='approved' and d.human_approved);
   new.current_discipline:=coalesce(first_unapproved,8);
   if first_unapproved is not null and new.status='effectiveness_review' then new.status:='active'; end if;
 end if;
 return new;
end $$;

drop trigger if exists rca_workflow_case_guard on public.rca_cases;
create trigger rca_workflow_case_guard before update on public.rca_cases for each row execute function public.rca_guard_case_write();
do $$declare t text; begin
 foreach t in array array['rca_8d_disciplines','rca_causes','rca_actions','rca_evidence','rca_team_members','rca_analysis_models','rca_analysis_nodes','rca_cost_entries','rca_capa_stages'] loop
   if to_regclass('public.'||t) is not null then
     execute format('drop trigger if exists rca_workflow_closed_guard on public.%I',t);
     execute format('create trigger rca_workflow_closed_guard before insert or update or delete on public.%I for each row execute function public.rca_guard_child_write()',t);
     if t not in ('rca_cost_entries','rca_capa_stages') then
       execute format('drop trigger if exists rca_workflow_revision on public.%I',t);
       execute format('create trigger rca_workflow_revision after insert or update or delete on public.%I for each row execute function public.rca_after_child_revision()',t);
     end if;
   end if;
 end loop;
end $$;

create or replace function public.rca_after_case_revision() returns trigger language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if current_setting('rpg.rca_internal',true)='on' or new.status='closed' then return null; end if;
 if new.workflow_profile is distinct from old.workflow_profile or new.detected_at is distinct from old.detected_at then n:=0;
 elsif new.sponsor_person_id is distinct from old.sponsor_person_id or new.leader_person_id is distinct from old.leader_person_id then n:=1;
 elsif new.problem_statement is distinct from old.problem_statement or new.title is distinct from old.title then n:=2;
 else return null; end if;
 if coalesce(new.case_type,'8d')='8d' then perform public.rca_withdraw_approvals(new.id,n,'Case definition or workflow profile changed',to_jsonb(old)); end if;
 return null;
end $$;
drop trigger if exists rca_workflow_case_revision on public.rca_cases;
create trigger rca_workflow_case_revision after update on public.rca_cases for each row execute function public.rca_after_case_revision();

create or replace function public.rca_after_capa_revision() returns trigger language plpgsql security definer set search_path='' as $$
declare previous_setting text;
begin
 if current_setting('rpg.rca_internal',true)='on' then return null; end if;
 if TG_OP='UPDATE' and old.narrative is not distinct from new.narrative and old.evidence_reference is not distinct from new.evidence_reference and old.review_data is not distinct from new.review_data and old.decision is not distinct from new.decision and not(old.completed_at is not null and new.completed_at is null) then return null; end if;
 insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data) values(new.case_id,new.owner_id,'capa_stage_revised',new.stage_order,'CAPA stage revised; later completion decisions withdrawn',jsonb_build_object('previous_stage',to_jsonb(old),'actor_id',auth.uid()));
 previous_setting:=current_setting('rpg.rca_internal',true);perform set_config('rpg.rca_internal','on',true);
 update public.rca_capa_stages set completed_at=null,completed_by=null where case_id=new.case_id and (stage_order>new.stage_order or (new.stage='effectiveness_review' and new.decision='ineffective' and stage_order>=3));
 update public.rca_cases set status='active',capa_current_stage=case when new.stage='effectiveness_review' and new.decision='ineffective' then 'corrective_action' else new.stage end where id=new.case_id;
 perform set_config('rpg.rca_internal',coalesce(previous_setting,''),true);
 return null;
end $$;
drop trigger if exists rca_workflow_capa_revision on public.rca_capa_stages;
create trigger rca_workflow_capa_revision after update on public.rca_capa_stages for each row execute function public.rca_after_capa_revision();

-- Service-only RPC. The server resolves the current company role before calling.
-- Locking, evidence checks, update and history are one database transaction.
create or replace function public.manage_standalone_rca_workflow(p_case_id uuid,p_organization_id uuid,p_actor_id uuid,p_operation text,p_reason text,p_expected_updated_at timestamptz,p_values jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.rca_cases; a public.rca_actions; previous_setting text; internal_setting text; previous_stages jsonb; now_at timestamptz:=clock_timestamp();
begin
 if p_actor_id is null or length(trim(coalesce(p_reason,'')))<20 then raise exception 'A reviewer and recorded reason are required'; end if;
 select * into c from public.rca_cases where id=p_case_id and organization_id=p_organization_id for update;
 if not found then raise exception 'Case not found in the authorised company'; end if;
 if c.updated_at is distinct from p_expected_updated_at then raise exception 'The case changed. Refresh before recording this decision'; end if;
 if c.assessment_finding_id is not null or exists(select 1 from public.internal_audit_findings f where f.linked_rca_case_id=c.id) or exists(select 1 from public.internal_audit_action_access x where x.rca_case_id=c.id) then raise exception 'Use the linked finding review, closure and reopening process'; end if;
 perform set_config('request.jwt.claim.sub',p_actor_id::text,true);
 if p_operation='reopen' then
   if c.status<>'closed' and c.closed_at is null and c.capa_current_stage is distinct from 'closed' then raise exception 'This case is already open'; end if;
   previous_setting:=current_setting('rpg.rca_reopen',true);perform set_config('rpg.rca_reopen',c.id::text,true);
   update public.rca_cases set status='active',closed_at=null,capa_current_stage=case when case_type='capa' then 'corrective_action' else capa_current_stage end,updated_at=now_at where id=c.id;
   if c.case_type='capa' then
     select jsonb_agg(to_jsonb(s)) into previous_stages from public.rca_capa_stages s where s.case_id=c.id;
     internal_setting:=current_setting('rpg.rca_internal',true);perform set_config('rpg.rca_internal','on',true);
     update public.rca_capa_stages set completed_at=null,completed_by=null where case_id=c.id and stage_order>=3;
     perform set_config('rpg.rca_internal',coalesce(internal_setting,''),true);
   else perform public.rca_withdraw_approvals(c.id,6,'Controlled standalone case reopening',to_jsonb(c)); end if;
   perform set_config('rpg.rca_reopen',coalesce(previous_setting,''),true);
 elsif p_operation='verify_action' then
   if c.status='closed' or c.closed_at is not null then raise exception 'Reopen the case before verification'; end if;
   select * into a from public.rca_actions where id=(p_values->>'action_id')::uuid and case_id=c.id and owner_id=c.owner_id and discipline=5 and selection_status='selected' for update;
   if not found or a.d6_submitted_at is null then raise exception 'Select an action with submitted D6 implementation evidence'; end if;
   if not exists(select 1 from public.organization_people p where p.id=a.action_owner_person_id and p.organization_id=c.organization_id and p.account_status='active' and p.user_id is not null and p.user_id<>p_actor_id) then raise exception 'A linked action owner and a different independent reviewer are required'; end if;
   if not exists(select 1 from public.rca_evidence e where e.case_id=c.id and e.action_id=a.id and e.discipline=6 and e.storage_path is not null) then raise exception 'Retained action-specific D6 evidence is required'; end if;
   if nullif(trim(p_values->>'method'),'') is null or nullif(trim(p_values->>'conclusion'),'') is null or coalesce(p_values->>'result','') not in ('effective_verified','not_effective') then raise exception 'Record a verification method, conclusion and supported result'; end if;
   update public.rca_actions set effectiveness_result=case when p_values->>'result'='effective_verified' then 'effective' else 'not_effective' end,status=case when p_values->>'result'='effective_verified' then 'verified' else 'open' end,effectiveness_verification_method=p_values->>'method',effectiveness_verification_conclusion=p_values->>'conclusion',verified_by=p_actor_id,verified_at=now_at where id=a.id;
 elsif p_operation='close_8d' then
   if coalesce(c.case_type,'8d')<>'8d' then raise exception 'Use the CAPA effectiveness stage to close this case'; end if;
   if c.status='closed' or c.closed_at is not null then raise exception 'This case is already closed'; end if;
   if not exists(select 1 from public.organization_people p where p.id=c.leader_person_id and p.organization_id=c.organization_id and p.user_id is not null and p.user_id<>p_actor_id) then raise exception 'Final closure requires a reviewer independent of the investigation leader'; end if;
   update public.rca_cases set status='closed',closed_at=now_at,closure_summary=p_reason,updated_at=now_at where id=c.id;
 else raise exception 'Unsupported controlled operation'; end if;
 insert into public.rca_case_events(case_id,owner_id,event_type,discipline,summary,event_data) values(c.id,c.owner_id,'controlled_'||p_operation,case when p_operation='close_8d' then 8 else 6 end,p_reason,jsonb_build_object('actor_id',p_actor_id,'previous_case',to_jsonb(c),'previous_action',to_jsonb(a),'previous_stages',previous_stages,'decision',p_values));
 return jsonb_build_object('case_id',c.id,'operation',p_operation);
end $$;
revoke all on function public.manage_standalone_rca_workflow(uuid,uuid,uuid,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.manage_standalone_rca_workflow(uuid,uuid,uuid,text,text,timestamptz,jsonb) to service_role;
revoke all on function public.rca_after_case_revision(),public.rca_after_capa_revision() from public,anon,authenticated;


create or replace function public.rca_check_gate_approval() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.rca_cases; key text; required_fields jsonb:='{"0":{"general_8d":[],"rm13000":["quantified_symptom","shipment_control","initial_boundaries","immediate_protection","affected_scope","notification","recurrence_check","milestone_due_at"]},"1":{"general_8d":[],"rm13000":["team_goal","trained_practitioner_person_id","competence_evidence","resources"]},"2":{"general_8d":[],"rm13000":["measurable_problem","discovery","impact","boundaries","customer_review"]},"3":{"general_8d":[],"rm13000":["containment_implementation","containment_effectiveness","resumption_authority"]},"4":{"general_8d":["human_factors","human_performance_actions"],"rm13000":["human_factors","human_performance_actions"]},"5":{"general_8d":[],"rm13000":["solution_validation","adverse_effects","milestone_due_at"]},"6":{"general_8d":[],"rm13000":["monitoring_start","monitoring_end","monitoring_results","adverse_effects","containment_release","process_updates"]},"7":{"general_8d":["read_across","system_changes","implementation_evidence","champion_review"],"rm13000":["read_across","system_changes","implementation_evidence","champion_review"]},"8":{"general_8d":["records_complete","distribution","recognition","closure_authorisation"],"rm13000":["records_complete","distribution","recognition","closure_authorisation"]}}'::jsonb; due_at timestamptz;
begin
 if current_setting('rpg.rca_internal',true)='on' or new.status<>'approved' then return new; end if;
 select * into c from public.rca_cases where id=new.case_id for update;
 if new.discipline not between 0 and 8 then raise exception 'Invalid discipline'; end if;
 if not new.human_approved or new.approved_by is null or new.approved_at is null or nullif(trim(new.narrative),'') is null then raise exception 'Explicit human approval and an evidence-based conclusion are required'; end if;
 if auth.uid() is not null and new.approved_by<>auth.uid() then raise exception 'The approval actor must be the signed-in reviewer'; end if;
 if (select count(distinct d.discipline) from public.rca_8d_disciplines d where d.case_id=c.id and d.discipline<new.discipline and d.status='approved' and d.human_approved and d.approved_by is not null and d.approved_at is not null)<>new.discipline then raise exception 'Every preceding gate requires explicit approval'; end if;
 for key in select jsonb_array_elements_text(required_fields->new.discipline::text->c.workflow_profile) loop
   if nullif(trim(new.gate_data->>key),'') is null then raise exception 'Required gate evidence is missing: %',key; end if;
 end loop;
 if c.workflow_profile='rm13000' and new.discipline in (0,5) then
   due_at:=(new.gate_data->>'milestone_due_at')::timestamptz;
   if c.detected_at is null or due_at<c.detected_at then raise exception 'A valid detection date and milestone are required'; end if;
   if due_at>c.detected_at+(case when new.discipline=0 then interval '2 days' else interval '30 days' end) and nullif(trim(new.gate_data->>'customer_agreement'),'') is null then raise exception 'A later milestone requires documented customer agreement'; end if;
 end if;
 if new.discipline=1 then
   if nullif(trim(c.sponsor_name),'') is null or nullif(trim(c.leader_name),'') is null or not exists(select 1 from public.rca_team_members t where t.case_id=c.id and t.active is distinct from false) then raise exception 'Sponsor, leader and cross-functional team are required'; end if;
 end if;
 if new.discipline=2 and nullif(trim(c.problem_statement),'') is null then raise exception 'Record the problem definition before D2 approval'; end if;
 if new.discipline=3 and not exists(select 1 from public.rca_actions x where x.case_id=c.id and x.discipline=3) and not(new.no_action_required and nullif(trim(new.no_action_justification),'') is not null) then raise exception 'Record containment actions or an evidence-based no-containment decision'; end if;
 if new.discipline=5 then
   if not exists(select 1 from public.rca_actions x where x.case_id=c.id and x.discipline=5 and x.selection_status='selected') or exists(select 1 from public.rca_causes x where x.case_id=c.id and x.status='validated' and not exists(select 1 from public.rca_actions a where a.case_id=c.id and a.cause_id=x.id and a.discipline=5 and a.selection_status='selected')) then raise exception 'Select permanent actions covering every validated cause'; end if;
   if exists(select 1 from public.rca_actions x where x.case_id=c.id and x.discipline=5 and x.selection_status='selected' and (x.action_owner_person_id is null or x.due_date is null or nullif(trim(x.effectiveness_criteria),'') is null or nullif(trim(x.selection_rationale),'') is null)) then raise exception 'Selected actions require an owner, due date, criteria and selection rationale'; end if;
 end if;
 if new.discipline=4 then
   if not exists(select 1 from public.rca_causes x where x.case_id=c.id and x.status='validated' and x.cause_type='occurrence') then raise exception 'Validate an occurrence cause'; end if;
   for key in select unnest(array['escape','systemic']) loop
     if not exists(select 1 from public.rca_causes x where x.case_id=c.id and x.status='validated' and x.cause_type=key) and nullif(trim(new.gate_data->>(key||'_not_applicable')),'') is null then raise exception 'Review every causal stream: %',key; end if;
   end loop;
   if exists(select 1 from public.rca_causes x where x.case_id=c.id and x.status='validated' and (nullif(trim(x.validation_method),'') is null or nullif(trim(x.validation_result),'') is null or x.validated_by is null or x.validated_at is null)) then raise exception 'Validated causes require a test, result, reviewer and date'; end if;
 end if;
 if new.discipline in (6,8) then
   if not exists(select 1 from public.rca_actions x where x.case_id=c.id and x.discipline=5 and x.selection_status='selected') or exists(select 1 from public.rca_actions x where x.case_id=c.id and x.discipline=5 and x.selection_status='selected' and (x.status is distinct from 'verified' or coalesce(x.effectiveness_result,'') not in ('effective','effective_verified') or x.verified_by is null or x.verified_at is null or x.d6_submitted_at is null or x.verified_at<x.d6_submitted_at or nullif(trim(x.effectiveness_verification_method),'') is null or nullif(trim(x.effectiveness_verification_conclusion),'') is null or not exists(select 1 from public.organization_people p where p.id=x.action_owner_person_id and p.organization_id=c.organization_id and p.user_id is not null and p.user_id<>x.verified_by) or not exists(select 1 from public.rca_evidence e where e.case_id=c.id and e.action_id=x.id and e.discipline=6 and e.storage_path is not null))) then raise exception 'All selected actions require independent, current effectiveness verification and action-specific evidence'; end if;
 end if;
 if new.discipline=6 and c.workflow_profile='rm13000' and ((new.gate_data->>'monitoring_start')::date>(new.gate_data->>'monitoring_end')::date or (new.gate_data->>'monitoring_end')::date>current_date) then raise exception 'Complete the monitoring period before approval'; end if;
 return new;
end $$;
drop trigger if exists rca_workflow_gate_approval on public.rca_8d_disciplines;
create trigger rca_workflow_gate_approval before insert or update on public.rca_8d_disciplines for each row execute function public.rca_check_gate_approval();
revoke all on function public.rca_check_gate_approval() from public,anon,authenticated;

create or replace function public.rca_check_capa_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('rpg.rca_internal',true)='on' or new.completed_at is null then return new; end if;
 if new.completed_by is null or (auth.uid() is not null and new.completed_by<>auth.uid()) or nullif(trim(new.narrative),'') is null or nullif(trim(new.evidence_reference),'') is null then raise exception 'CAPA completion requires the actual actor, conclusion and objective evidence'; end if;
 if (select count(distinct s.stage_order) from public.rca_capa_stages s where s.case_id=new.case_id and s.stage_order<new.stage_order and s.completed_at is not null and s.completed_by is not null)<>new.stage_order-1 then raise exception 'Complete all preceding CAPA stages'; end if;
 if new.stage='effectiveness_review' then
   if coalesce(new.decision,'') not in ('effective','ineffective') or nullif(trim(new.review_data->>'method'),'') is null or nullif(trim(new.review_data->>'monitoring_period'),'') is null then raise exception 'Record the effectiveness decision, method and completed monitoring period'; end if;
   if exists(select 1 from public.rca_capa_stages s where s.case_id=new.case_id and s.stage_order<4 and s.completed_by=new.completed_by) then raise exception 'An implementer cannot perform their own final CAPA review'; end if;
 end if;
 return new;
end $$;
drop trigger if exists rca_workflow_capa_completion on public.rca_capa_stages;
create trigger rca_workflow_capa_completion before insert or update on public.rca_capa_stages for each row execute function public.rca_check_capa_completion();
revoke all on function public.rca_check_capa_completion() from public,anon,authenticated;
create or replace function public.rca_check_action_verifier() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('rpg.rca_internal',true)='on' then return new; end if;
 if coalesce(new.effectiveness_result,'') in ('effective','effective_verified') and (TG_OP='INSERT' or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at or new.effectiveness_result is distinct from old.effectiveness_result) then
   if new.verified_by is null or new.verified_at is null or (auth.uid() is not null and new.verified_by<>auth.uid()) then raise exception 'Verification must identify the actual signed-in reviewer and date'; end if;
   if not exists(select 1 from public.organization_people p where p.id=new.action_owner_person_id and p.user_id is not null and p.user_id<>new.verified_by) then raise exception 'An action implementer cannot verify their own work'; end if;
   if nullif(trim(new.effectiveness_verification_method),'') is null or nullif(trim(new.effectiveness_verification_conclusion),'') is null then raise exception 'Record a verification method and evidence-based conclusion'; end if;
 end if;
 return new;
end $$;
drop trigger if exists rca_workflow_action_verifier on public.rca_actions;
create trigger rca_workflow_action_verifier before insert or update on public.rca_actions for each row execute function public.rca_check_action_verifier();
revoke all on function public.rca_check_action_verifier() from public,anon,authenticated;
create or replace function public.rca_guard_case_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='closed' or old.closed_at is not null or old.capa_current_stage='closed' then raise exception 'Closed case records are retained. Use controlled reopening rather than deletion.'; end if;
 return old;
end $$;
drop trigger if exists rca_workflow_case_delete_guard on public.rca_cases;
create trigger rca_workflow_case_delete_guard before delete on public.rca_cases for each row execute function public.rca_guard_case_delete();
revoke all on function public.rca_guard_case_delete() from public,anon,authenticated;
revoke all on function public.rca_guard_child_write(),public.rca_after_child_revision(),public.rca_guard_case_write(),public.rca_withdraw_approvals(uuid,integer,text,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
select 'RCA workflow fields and transactional closure/revision guards' as check_name,'READY' as readiness;
