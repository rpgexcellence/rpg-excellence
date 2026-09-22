alter table public.bcp_outsourced_process_assessments
  add column if not exists source_links jsonb not null
  default '{"siteProfiles":[],"contexts":[],"roles":[],"hazards":[],"bias":[]}'::jsonb;

update public.bcp_outsourced_process_assessments
set source_links = jsonb_build_object(
  'siteProfiles', case when site_profile_id is null then '[]'::jsonb else jsonb_build_array(site_profile_id) end,
  'contexts', case when context_assessment_id is null then '[]'::jsonb else jsonb_build_array(context_assessment_id) end,
  'roles', case when role_assessment_id is null then '[]'::jsonb else jsonb_build_array(role_assessment_id) end,
  'hazards', case when hazard_assessment_id is null then '[]'::jsonb else jsonb_build_array(hazard_assessment_id) end,
  'bias', case when bia_assessment_id is null then '[]'::jsonb else jsonb_build_array(bia_assessment_id) end
)
where source_links is null
   or source_links = '{"siteProfiles":[],"contexts":[],"roles":[],"hazards":[],"bias":[]}'::jsonb;

notify pgrst, 'reload schema';
