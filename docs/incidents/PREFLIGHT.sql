-- Read-only checks. Run in the target project's SQL editor BEFORE installation.
-- Every required dependency must be present. Do not create empty substitute
-- tables in production to bypass a missing earlier migration.
select name, to_regclass('public.'||name) is not null as available
from unnest(array['organizations','organization_people','organization_person_permissions',
'organization_person_authorizations','organization_sites','organization_buildings',
'organization_zones','organization_zone_concerns','rca_cases','rca_case_events',
'isms_security_incidents','bcp_plans','hs_risk_assessments',
'hs_inspection_programmes','hs_inspection_risk_signals',
'hs_inspection_question_packs','hs_inspection_programme_packs']) name;
select to_regprocedure('public.assert_active_organisation_person(uuid,uuid,text)') is not null as active_person_validation_available;
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and
 ((table_name='rca_cases' and column_name in ('case_type','accountable_person_id','effectiveness_verifier_person_id'))
 or(table_name='organization_zones' and column_name='public_token')
 or(table_name='hs_inspection_programmes' and column_name='zone_id'))
order by table_name,column_name;
-- If question-pack tables are unavailable, apply the previous inspection-pack
-- repair first. That older schema-cache issue is not repaired by this migration.
-- New incident intake can store reports independently, but dynamic inspection
-- planning cannot be accepted as operational until those dependencies are restored.
