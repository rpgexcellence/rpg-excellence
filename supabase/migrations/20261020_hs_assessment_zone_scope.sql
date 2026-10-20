-- Apply after the existing Buildings & Zones / Safety Signs migrations.
-- Uses the existing organization_zone_assessments links; no duplicate scope store.
begin;
create table public.hs_assessment_scope_events (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.hs_risk_assessments(id) on delete cascade,
 organization_id uuid not null references public.organizations(id), actor_id uuid references auth.users(id),
 previous_zone_ids uuid[] not null, zone_ids uuid[] not null, site_id uuid not null,
 created_at timestamptz not null default now()
);
alter table public.hs_assessment_scope_events enable row level security;
revoke all on public.hs_assessment_scope_events from public,anon,authenticated;
grant all on public.hs_assessment_scope_events to service_role;
create index on public.hs_assessment_scope_events(organization_id,assessment_id,created_at);

create function public.save_hs_assessment_scope(
 p_org uuid,p_actor uuid,p_id uuid,p_values jsonb,p_zone_ids uuid[],
 p_expected_zone_ids uuid[],p_expected_updated_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare
 current_assessment public.hs_risk_assessments;
 result_id uuid:=coalesce(p_id,gen_random_uuid()); scope_site_id uuid; org_owner uuid;
 old_ids uuid[]:=array[]::uuid[]; new_ids uuid[]; changed_ids uuid[]; expected_ids uuid[];
 payload jsonb:=p_values; columns_sql text; assignments_sql text; key_name text;
 allowed text[]:=array['title','assessment_type','site_location','administration_location_id','area_department','section_lab','project_number','task_description','assessor_name','assessor_person_id','assessor_user_id','assessor_competence_basis','assessment_date','review_date','review_frequency_months','coshh_msds_reference','safe_system_reference','permit_required','linked_permit_id','permit_reference','associated_documents','persons_at_risk','vulnerable_persons_considered','consultation_summary','emergency_arrangements'];
begin
 if p_org is null or p_actor is null or not exists(select 1 from auth.users where id=p_actor) then raise exception 'Invalid assessment actor'; end if;
 if coalesce(jsonb_typeof(payload),'')<>'object' then raise exception 'Invalid assessment details'; end if;
 if cardinality(coalesce(p_zone_ids,array[]::uuid[]))>500 or array_position(p_zone_ids,null) is not null then raise exception 'Invalid zone selection'; end if;
 select coalesce(array_agg(distinct x order by x),array[]::uuid[]) into new_ids from unnest(p_zone_ids) x;
 select owner_id into org_owner from public.organizations where id=p_org;
 if not found then raise exception 'Organisation not found'; end if;
 if p_id is not null then
  select * into current_assessment from public.hs_risk_assessments where id=p_id and organization_id=p_org for update;
  if not found then raise exception 'Assessment not found'; end if;
  if current_assessment.status not in ('draft','changes_required') then raise exception 'This controlled assessment version is locked'; end if;
  if p_expected_updated_at is null or current_assessment.updated_at is distinct from p_expected_updated_at then raise exception 'This assessment changed. Reload before saving'; end if;
  select coalesce(array_agg(zone_id order by zone_id),array[]::uuid[]) into old_ids from public.organization_zone_assessments where assessment_id=p_id;
  select coalesce(array_agg(distinct x order by x),array[]::uuid[]) into expected_ids from unnest(p_expected_zone_ids) x;
  if p_expected_zone_ids is null or old_ids is distinct from expected_ids then raise exception 'Zone links changed. Reload before saving'; end if;
 else
  if payload ? 'organization_id' and (payload->>'organization_id')::uuid is distinct from p_org then raise exception 'Invalid organisation'; end if;
  if payload ? 'owner_id' and (payload->>'owner_id')::uuid is distinct from org_owner then raise exception 'Invalid owner'; end if;
  payload:=payload-'owner_id'-'organization_id';
 end if;
 for key_name in select jsonb_object_keys(payload) loop
  if not(key_name=any(allowed)) then raise exception 'Unsupported assessment field: %',key_name; end if;
 end loop;
 scope_site_id:=coalesce(payload->>'administration_location_id',current_assessment.administration_location_id)::uuid;
 perform 1 from public.organization_sites s where s.id=scope_site_id and s.organization_id=p_org and s.status='active' for share;
 if not found then raise exception 'Select an active Administration Site Profile'; end if;
 -- Lock affected zones in a stable order before replacing any links.
 perform 1 from public.organization_zones z where z.id=any(old_ids||new_ids) order by z.id for update;
 if exists(select 1 from unnest(new_ids) x where not exists(
  select 1 from public.organization_zones z where z.id=x and z.organization_id=p_org and z.site_id=scope_site_id and (z.status<>'archived' or z.id=any(old_ids))
 )) then raise exception 'Each zone must belong to the selected site and organisation; archived zones cannot be newly linked'; end if;
 if payload ? 'assessor_person_id' and not exists(select 1 from public.organization_people p where p.id=(payload->>'assessor_person_id')::uuid and p.organization_id=p_org and p.account_status='active') then raise exception 'Select an active company assessor'; end if;
 if payload ? 'assessor_user_id' and (payload->>'assessor_user_id')::uuid is distinct from p_actor then raise exception 'Invalid assessment user'; end if;
 if p_id is null then
  payload:=payload||jsonb_build_object('organization_id',p_org,'owner_id',org_owner);
  select string_agg(format('%I',key),',' order by key) into columns_sql from jsonb_object_keys(payload) key;
  execute format('insert into public.hs_risk_assessments(id,%s) select $1,%s from jsonb_populate_record(null::public.hs_risk_assessments,$2)',columns_sql,columns_sql) using result_id,payload;
 else
  select string_agg(format('%1$I=r.%1$I',key),',' order by key) into assignments_sql from jsonb_object_keys(payload) key;
  if assignments_sql is not null then
   execute format('update public.hs_risk_assessments a set %s,updated_at=clock_timestamp() from jsonb_populate_record(null::public.hs_risk_assessments,$1) r where a.id=$2 and a.organization_id=$3',assignments_sql) using payload,result_id,p_org;
  end if;
 end if;
 select coalesce(array_agg(x order by x),array[]::uuid[]) into changed_ids from (
  (select unnest(old_ids) x except select unnest(new_ids)) union (select unnest(new_ids) x except select unnest(old_ids))
 ) changed;
 delete from public.organization_zone_assessments where assessment_id=result_id and not(zone_id=any(new_ids));
 insert into public.organization_zone_assessments(zone_id,assessment_id) select x,result_id from unnest(new_ids) x on conflict do nothing;
 update public.organization_zones set version=version+1,updated_at=clock_timestamp(),updated_by=p_actor where id=any(changed_ids) and organization_id=p_org;
 insert into public.organization_zone_events(zone_id,organization_id,actor_id,event,snapshot)
 select x,p_org,p_actor,'assessment_scope_changed',jsonb_build_object('assessment_id',result_id,'linked',x=any(new_ids)) from unnest(changed_ids) x;
 insert into public.hs_assessment_scope_events(assessment_id,organization_id,actor_id,previous_zone_ids,zone_ids,site_id) values(result_id,p_org,p_actor,old_ids,new_ids,scope_site_id);
 return result_id;
end $$;
revoke all on function public.save_hs_assessment_scope(uuid,uuid,uuid,jsonb,uuid[],uuid[],timestamptz) from public,anon,authenticated;
grant execute on function public.save_hs_assessment_scope(uuid,uuid,uuid,jsonb,uuid[],uuid[],timestamptz) to service_role;
commit;
