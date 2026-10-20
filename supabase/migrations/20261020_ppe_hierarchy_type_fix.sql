-- Corrects PPE hierarchy validation for JSONB and PostgreSQL array columns.
-- Run once AFTER 20261020_assessment_ppe_engine.sql. No tables or access grants are changed.
begin;

create or replace function public.check_hazard_ppe(p_hazard public.hs_risk_hazards) returns void
language plpgsql set search_path=public as $$
declare item jsonb; begin
 if jsonb_typeof(p_hazard.ppe_requirements)<>'array' or jsonb_array_length(p_hazard.ppe_requirements)>16 then raise exception 'Choose no more than 16 PPE requirements per hazard'; end if;
 if (coalesce(to_jsonb(p_hazard.control_hierarchy),'[]'::jsonb) ? 'PPE') and jsonb_array_length(p_hazard.ppe_requirements)=0 then raise exception 'Specify the PPE selected for this hazard'; end if;
 if not((coalesce(to_jsonb(p_hazard.control_hierarchy),'[]'::jsonb) ? 'PPE')) and jsonb_array_length(p_hazard.ppe_requirements)>0 then raise exception 'Select PPE in the control hierarchy'; end if;
 for item in select value from jsonb_array_elements(p_hazard.ppe_requirements) loop
  if coalesce(item->>'code','') not in ('M003','M004','M008','M009','M010','M013','M014','M015','M017','M019') then raise exception 'Unknown PPE type'; end if;
  if coalesce(item->>'scope','') not in ('zone','task','sub_area') then raise exception 'Specify PPE scope'; end if;
  if length(trim(coalesce(item->>'specification','')))<5 or length(coalesce(item->>'specification',''))>160 or length(trim(coalesce(item->>'instruction','')))<5 or length(coalesce(item->>'instruction',''))>240 or length(coalesce(item->>'limitations',''))>160 or length(coalesce(item->>'applies_to',''))>120 then raise exception 'Complete the PPE specification and instructions within their limits'; end if;
  if item->>'scope'<>'zone' and length(trim(coalesce(item->>'applies_to','')))<3 then raise exception 'Specify the PPE task or sub-area'; end if;
  if coalesce(jsonb_typeof(item->'zone_ids'),'')<>'array' then raise exception 'Invalid PPE zone scope'; end if;
  if exists(select 1 from jsonb_array_elements_text(item->'zone_ids') selected where not exists(select 1 from public.organization_zone_assessments l join public.organization_zones z on z.id=l.zone_id where l.assessment_id=p_hazard.assessment_id and z.id=selected::uuid and z.organization_id=p_hazard.organization_id)) then raise exception 'PPE zones must be linked to this assessment'; end if;
 end loop;
end $$;

create or replace function public.guard_hazard_ppe() returns trigger language plpgsql set search_path=public as $$
declare parent public.hs_risk_assessments; begin
 select * into parent from public.hs_risk_assessments where id=new.assessment_id and organization_id=new.organization_id for update;
 if not found or parent.status not in ('draft','changes_required') then raise exception 'Create a draft revision before changing hazard PPE'; end if;
 -- Legacy draft revisions may retain an unresolved PPE flag; approval still rejects it.
 if (coalesce(to_jsonb(new.control_hierarchy),'[]'::jsonb) ? 'PPE') and new.ppe_requirements='[]'::jsonb then return new;end if;
 perform public.check_hazard_ppe(new);return new;
end $$;

create or replace function public.zone_ppe_candidate(p_org uuid,p_site uuid,p_zone uuid,p_assessments uuid[],p_today date) returns jsonb
language plpgsql security definer set search_path=public as $$
declare requirements jsonb; sources jsonb; issues jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb; source_record record; begin
 if not exists(select 1 from public.organization_sites where id=p_site and organization_id=p_org) then raise exception 'Site not found'; end if;
 if p_zone is not null and not exists(select 1 from public.organization_zones where id=p_zone and site_id=p_site and organization_id=p_org) then raise exception 'Zone not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assessment_id',id,'reference',assessment_reference,'version',version,'review_date',review_date) order by id),'[]'::jsonb) into sources from public.hs_risk_assessments where id=any(p_assessments) and organization_id=p_org and administration_location_id=p_site::text and status in ('approved','communicated');
 if jsonb_array_length(sources)=0 then issues:=issues||jsonb_build_array('Link at least one approved assessment before publishing assessment-driven PPE.');end if;
 for source_record in select * from public.hs_risk_assessments where id=any(p_assessments) and organization_id=p_org and administration_location_id=p_site::text and status in ('approved','communicated') loop
  if not exists(select 1 from public.hs_risk_hazards where assessment_id=source_record.id and organization_id=p_org) then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': no evaluated hazard controls are recorded.');end if;
  if source_record.review_date is null or source_record.review_date<=p_today then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': assessment review is due or missing.');end if;
  if exists(select 1 from public.hs_risk_hazards h where h.assessment_id=source_record.id and (coalesce(to_jsonb(h.control_hierarchy),'[]'::jsonb) ? 'PPE') and jsonb_array_length(h.ppe_requirements)=0) then issues:=issues||jsonb_build_array(coalesce(source_record.assessment_reference,source_record.id::text)||': legacy PPE needs structured specifications in a new draft revision.');end if;
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

commit;
