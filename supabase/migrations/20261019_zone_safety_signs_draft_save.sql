-- Draft-only setup correction. Apply after both existing zone migrations; do not rerun them.
begin;
create or replace function public.save_organization_zone(p_org uuid,p_actor uuid,p_site uuid,p_id uuid,p_version integer,p_values jsonb,p_assessments uuid[],p_programmes uuid[],p_inspections uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare old_zone public.organization_zones; new_signs jsonb; sign jsonb; result_id uuid; review_date date; signs_changed boolean; approved boolean; begin
 if p_id is not null then
  select * into old_zone from public.organization_zones where id=p_id and organization_id=p_org and site_id=p_site for update;
  if not found then raise exception 'Zone not found'; end if;
 end if;
 new_signs:=coalesce(p_values->'safety_signs',old_zone.safety_signs,'[]'::jsonb);
 if jsonb_typeof(new_signs)<>'array' or jsonb_array_length(new_signs)>12 then raise exception 'Choose no more than 12 signs per zone'; end if;
 if (select count(*) from jsonb_array_elements(new_signs))<>(select count(distinct s->>'code') from jsonb_array_elements(new_signs) s) then raise exception 'Duplicate safety sign'; end if;
 review_date:=coalesce(nullif(p_values->>'signs_review_date','')::date,case when not(p_values ? 'signs_review_date') then old_zone.signs_review_date end);
 approved:=coalesce((p_values->>'confirm_signs')::boolean,false);
 signs_changed:=new_signs is distinct from coalesce(old_zone.safety_signs,'[]'::jsonb);
 for sign in select value from jsonb_array_elements(new_signs) loop
  if jsonb_typeof(sign)<>'object' or not(coalesce(sign->>'code','')=any(array['W001','W011','W012','W014','W017','W021','W029','M003','M004','M008','M009','M010','M013','M014','M015','M017','M019','P002','P003','P004','P010','E003','E007','E011','F001','F016'])) then raise exception 'Unknown safety sign'; end if;
  if coalesce(sign->>'scope','') not in ('zone','task','sub_area') then raise exception 'Select a valid safety-sign scope'; end if;
  if length(coalesce(sign->>'instruction',''))>240 or length(coalesce(sign->>'applies_to',''))>120 then raise exception 'Safety-sign text is too long'; end if;
  if p_values->>'status'='published' and (sign->>'scope')<>'zone' and length(trim(coalesce(sign->>'applies_to','')))<3 then raise exception 'Specify the task or sub-area'; end if;
  if p_values->>'status'='published' and left(sign->>'code',1)='M' and coalesce(sign->>'assessment_id','')='' then raise exception 'PPE requirements need a linked approved risk assessment'; end if;
  if coalesce(sign->>'assessment_id','')<>'' then
   if not ((sign->>'assessment_id')::uuid=any(coalesce(p_assessments,array[]::uuid[]))) then raise exception 'Sign source must be selected in the zone assessment links'; end if;
   if p_values->>'status'='published' and not exists(select 1 from public.hs_risk_assessments a where a.id=(sign->>'assessment_id')::uuid and a.organization_id=p_org and a.administration_location_id=p_site::text and a.status in ('approved','communicated') and a.version=(sign->>'assessment_version')::integer) then raise exception 'Safety sign source must be a selected, approved assessment at this site and current version'; end if;
  end if;
  if p_values->>'status'='published' and length(trim(coalesce(sign->>'instruction','')))<5 then raise exception 'Give each published sign a specific instruction'; end if;
 end loop;
 if p_values->>'status'='published' then
  if jsonb_array_length(new_signs)>0 and (review_date is null or review_date<=current_date) then raise exception 'Choose a future safety-sign review date'; end if;
  if (signs_changed or (jsonb_array_length(new_signs)>0 and (old_zone.signs_reviewed_by is null or old_zone.signs_review_date is distinct from review_date or old_zone.signs_review_date<=current_date))) and not approved then raise exception 'Confirm review of the safety signs and PPE before publishing'; end if;
 end if;
 result_id:=public.save_organization_zone_base(p_org,p_actor,p_site,p_id,p_version,p_values,p_assessments,p_programmes,p_inspections);
 update public.organization_zones set safety_signs=new_signs,signs_review_date=review_date,
  signs_reviewed_by=case when approved then p_actor when signs_changed then null else signs_reviewed_by end,
  signs_reviewed_at=case when approved then now() when signs_changed then null else signs_reviewed_at end
 where id=result_id and organization_id=p_org;
 return result_id;
end $$;
revoke all on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) to service_role;
commit;
