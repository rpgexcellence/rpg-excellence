-- Apply once, after the zone draft-save and assessment zone-scope migrations.
begin;
alter table public.hs_risk_hazards add column ppe_requirements jsonb not null default '[]'::jsonb;
alter table public.organization_zones add column ppe_source_mode text not null default 'manual' check(ppe_source_mode in ('manual','assessment')),add column ppe_snapshot jsonb not null default '{}'::jsonb;

create function public.check_hazard_ppe(p_hazard public.hs_risk_hazards) returns void
language plpgsql set search_path=public as $$
declare item jsonb; begin
 if jsonb_typeof(p_hazard.ppe_requirements)<>'array' or jsonb_array_length(p_hazard.ppe_requirements)>16 then raise exception 'Choose no more than 16 PPE requirements per hazard'; end if;
 if 'PPE'=any(coalesce(p_hazard.control_hierarchy,array[]::text[])) and jsonb_array_length(p_hazard.ppe_requirements)=0 then raise exception 'Specify the PPE selected for this hazard'; end if;
 if not('PPE'=any(coalesce(p_hazard.control_hierarchy,array[]::text[]))) and jsonb_array_length(p_hazard.ppe_requirements)>0 then raise exception 'Select PPE in the control hierarchy'; end if;
 for item in select value from jsonb_array_elements(p_hazard.ppe_requirements) loop
  if coalesce(item->>'code','') not in ('M003','M004','M008','M009','M010','M013','M014','M015','M017','M019') then raise exception 'Unknown PPE type'; end if;
  if coalesce(item->>'scope','') not in ('zone','task','sub_area') then raise exception 'Specify PPE scope'; end if;
  if length(trim(coalesce(item->>'specification','')))<5 or length(coalesce(item->>'specification',''))>160 or length(trim(coalesce(item->>'instruction','')))<5 or length(coalesce(item->>'instruction',''))>240 or length(coalesce(item->>'limitations',''))>160 or length(coalesce(item->>'applies_to',''))>120 then raise exception 'Complete the PPE specification and instructions within their limits'; end if;
  if item->>'scope'<>'zone' and length(trim(coalesce(item->>'applies_to','')))<3 then raise exception 'Specify the PPE task or sub-area'; end if;
  if coalesce(jsonb_typeof(item->'zone_ids'),'')<>'array' then raise exception 'Invalid PPE zone scope'; end if;
  if exists(select 1 from jsonb_array_elements_text(item->'zone_ids') selected where not exists(select 1 from public.organization_zone_assessments l join public.organization_zones z on z.id=l.zone_id where l.assessment_id=p_hazard.assessment_id and z.id=selected::uuid and z.organization_id=p_hazard.organization_id)) then raise exception 'PPE zones must be linked to this assessment'; end if;
 end loop;
end $$;
create function public.guard_hazard_ppe() returns trigger language plpgsql set search_path=public as $$
declare parent public.hs_risk_assessments; begin
 select * into parent from public.hs_risk_assessments where id=new.assessment_id and organization_id=new.organization_id for update;
 if not found or parent.status not in ('draft','changes_required') then raise exception 'Create a draft revision before changing hazard PPE'; end if;
 -- Legacy draft revisions may retain an unresolved PPE flag; approval still rejects it.
 if 'PPE'=any(coalesce(new.control_hierarchy,array[]::text[])) and new.ppe_requirements='[]'::jsonb then return new;end if;
 perform public.check_hazard_ppe(new);return new;
end $$;
create trigger hazard_ppe_guard before insert or update of ppe_requirements,control_hierarchy on public.hs_risk_hazards for each row execute function public.guard_hazard_ppe();
create function public.guard_ppe_approval() returns trigger language plpgsql set search_path=public as $$
declare hazard public.hs_risk_hazards; begin
 if new.status in ('in_review','approved') and new.status is distinct from old.status then
  for hazard in select * from public.hs_risk_hazards where assessment_id=new.id and organization_id=new.organization_id loop perform public.check_hazard_ppe(hazard);end loop;
 end if;
 if new.status='communicated' and old.status<>'approved' and new.status is distinct from old.status then raise exception 'Approve the assessment before communication';end if;
 return new;
end $$;
create trigger assessment_ppe_approval before update of status on public.hs_risk_assessments for each row execute function public.guard_ppe_approval();

create function public.zone_ppe_candidate(p_org uuid,p_site uuid,p_zone uuid,p_assessments uuid[],p_today date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare requirements jsonb; sources jsonb; issues jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb; source_record record; begin
 if not exists(select 1 from public.organization_sites where id=p_site and organization_id=p_org) then raise exception 'Site not found'; end if;
 if p_zone is not null and not exists(select 1 from public.organization_zones where id=p_zone and site_id=p_site and organization_id=p_org) then raise exception 'Zone not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assessment_id',id,'reference',assessment_reference,'version',version,'review_date',review_date) order by id),'[]'::jsonb) into sources from public.hs_risk_assessments where id=any(p_assessments) and organization_id=p_org and administration_location_id=p_site::text and status in ('approved','communicated');
 if jsonb_array_length(sources)=0 then issues:=issues||jsonb_build_array('Link at least one approved assessment before publishing assessment-driven PPE.');end if;
 for source_record in select * from public.hs_risk_assessments where id=any(p_assessments) and organization_id=p_org and administration_location_id=p_site::text and status in ('approved','communicated') loop
  if not exists(select 1 from public.hs_risk_hazards where assessment_id=source_record.id and organization_id=p_org) then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': no evaluated hazard controls are recorded.');end if;
  if source_record.review_date is null or source_record.review_date<=p_today then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': assessment review is due or missing.');end if;
  if exists(select 1 from public.hs_risk_hazards h where h.assessment_id=source_record.id and 'PPE'=any(coalesce(h.control_hierarchy,array[]::text[])) and jsonb_array_length(h.ppe_requirements)=0) then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': legacy PPE needs structured specifications in a new draft revision.');end if;
 end loop;
 with items as (
  select item, a.id aid,a.assessment_reference ref,a.version,h.id hid,h.hazard_description description
  from public.hs_risk_assessments a join public.hs_risk_hazards h on h.assessment_id=a.id and h.organization_id=p_org
  cross join lateral jsonb_array_elements(h.ppe_requirements) item
  where a.id=any(p_assessments) and a.organization_id=p_org and a.administration_location_id=p_site::text and a.status in ('approved','communicated') and a.review_date>p_today
  and (jsonb_array_length(item->'zone_ids')=0 or (p_zone is not null and (item->'zone_ids') ? p_zone::text))
 ), grouped as (
  select item->>'code' code,item->>'scope' scope,coalesce(item->>'applies_to','') applies_to,item->>'specification' specification,item->>'instruction' instruction,coalesce(item->>'limitations','') limitations,
  jsonb_agg(distinct jsonb_build_object('assessment_id',aid,'reference',ref,'version',version,'hazard_id',hid,'hazard',description) order by jsonb_build_object('assessment_id',aid,'reference',ref,'version',version,'hazard_id',hid,'hazard',description)) source_list
  from items group by 1,2,3,4,5,6
 ) select coalesce(jsonb_agg(jsonb_build_object('code',code,'scope',scope,'applies_to',applies_to,'specification',specification,'instruction',instruction,'limitations',limitations,'sources',source_list) order by code,scope,applies_to,specification,instruction,limitations),'[]'::jsonb) into requirements from grouped;
 if exists(select 1 from jsonb_array_elements(requirements) r group by r->>'code' having count(distinct r->>'specification')>1) then warnings:=jsonb_build_array('Different specifications exist for the same PPE type. Review task boundaries and compatibility; no specification has been automatically preferred.');end if;
 return jsonb_build_object('schema_version',1,'requirements',requirements,'sources',sources,'issues',issues,'warnings',warnings);
end $$;
revoke all on function public.zone_ppe_candidate(uuid,uuid,uuid,uuid[],date) from public,anon,authenticated;
grant execute on function public.zone_ppe_candidate(uuid,uuid,uuid,uuid[],date) to service_role;

alter function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) rename to save_organization_zone_before_ppe;
create function public.save_organization_zone(p_org uuid,p_actor uuid,p_site uuid,p_id uuid,p_version integer,p_values jsonb,p_assessments uuid[],p_programmes uuid[],p_inspections uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare previous public.organization_zones; mode text; candidate jsonb; result_id uuid; review_day date; local_day date; changed boolean; values_json jsonb:=p_values; begin
 if p_id is not null then select * into previous from public.organization_zones where id=p_id and organization_id=p_org and site_id=p_site for update;if not found then raise exception 'Zone not found';end if;end if;
 mode:=coalesce(p_values->>'ppe_source_mode',previous.ppe_source_mode,'manual');
 if mode not in ('manual','assessment') then raise exception 'Choose a valid PPE source mode';end if;
 select (current_timestamp at time zone coalesce(timezone,'Europe/London'))::date into local_day from public.organization_sites where id=p_site and organization_id=p_org;
 if mode='assessment' then
  -- Lock approved source records while recording the reviewed snapshot.
  perform 1 from public.hs_risk_assessments where id=any(p_assessments) and organization_id=p_org order by id for share;
  candidate:=public.zone_ppe_candidate(p_org,p_site,p_id,p_assessments,local_day);
 else candidate:='{}'::jsonb;end if;
 changed:=mode is distinct from coalesce(previous.ppe_source_mode,'manual') or candidate is distinct from coalesce(previous.ppe_snapshot,'{}'::jsonb);
 review_day:=coalesce(nullif(p_values->>'signs_review_date','')::date,case when not(p_values ? 'signs_review_date') then previous.signs_review_date end);
 if p_values->>'status'='published' and mode='assessment' then
  if p_values->'ppe_expected' is distinct from candidate then raise exception 'PPE sources changed. Refresh the PPE preview and review before publishing';end if;
  if jsonb_array_length(candidate->'issues')>0 then raise exception '%',candidate->'issues';end if;
  if review_day is null or review_day<=local_day then raise exception 'Choose a future PPE and safety-sign review date';end if;
  if (changed or previous.signs_reviewed_by is null or previous.signs_review_date is distinct from review_day or previous.signs_review_date<=local_day) and not coalesce((p_values->>'confirm_signs')::boolean,false) then raise exception 'Confirm review of the assessment-derived PPE before publishing';end if;
 end if;
 if mode='assessment' and values_json ? 'safety_signs' then
  if exists(select 1 from jsonb_array_elements(values_json->'safety_signs') s where left(s->>'code',1)='M') then raise exception 'Assessment-driven mode replaces manually selected PPE. Keep warnings and emergency signs separately';end if;
 end if;
 result_id:=public.save_organization_zone_before_ppe(p_org,p_actor,p_site,p_id,p_version,values_json,p_assessments,p_programmes,p_inspections);
 update public.organization_zones set ppe_source_mode=mode,ppe_snapshot=candidate,
 signs_reviewed_by=case when coalesce((p_values->>'confirm_signs')::boolean,false) then p_actor when changed then null else signs_reviewed_by end,
 signs_reviewed_at=case when coalesce((p_values->>'confirm_signs')::boolean,false) then now() when changed then null else signs_reviewed_at end
 where id=result_id and organization_id=p_org;
 insert into public.organization_zone_events(zone_id,organization_id,actor_id,event,snapshot) values(result_id,p_org,p_actor,'ppe_snapshot_saved',jsonb_build_object('mode',mode,'ppe',candidate,'review_confirmed',coalesce((p_values->>'confirm_signs')::boolean,false)));
 return result_id;
end $$;
revoke all on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) to service_role;
create or replace function public.update_zone_poster_revision() returns trigger language plpgsql set search_path=public as $$
begin
 if row(new.reference,new.name,new.floor_level,new.building_id,new.restriction,new.key_controls,new.emergency_information,new.safety_signs,new.signs_review_date,new.access_mode,new.show_inspections,new.show_assessments,new.ppe_source_mode,new.ppe_snapshot)
 is distinct from row(old.reference,old.name,old.floor_level,old.building_id,old.restriction,old.key_controls,old.emergency_information,old.safety_signs,old.signs_review_date,old.access_mode,old.show_inspections,old.show_assessments,old.ppe_source_mode,old.ppe_snapshot) then new.poster_revision:=old.poster_revision+1;else new.poster_revision:=old.poster_revision;end if;return new;
end $$;
revoke all on function public.check_hazard_ppe(public.hs_risk_hazards) from public,anon,authenticated;
grant execute on function public.check_hazard_ppe(public.hs_risk_hazards) to service_role;
commit;
