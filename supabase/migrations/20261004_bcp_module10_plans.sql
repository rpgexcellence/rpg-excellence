-- Module 10: apply after the existing BCP Modules 1–9 migrations.
-- Saving and approved version preservation happen in one transaction.
begin;
create table if not exists public.bcp_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_profile_id uuid not null references public.bcp_site_profiles(id) on delete restrict,
  incident_assessment_id uuid references public.bcp_incident_management_assessments(id) on delete restrict,
  bia_assessment_id uuid references public.bcp_bia_assessments(id) on delete restrict,
  plan_reference text not null unique, plan_title text not null,
  status text not null default 'draft' check(status in ('draft','ready_for_review','approved')),
  version integer not null default 1 check(version > 0),
  plan_data jsonb not null default '{}'::jsonb,
  source_ids jsonb not null default '{}'::jsonb,
  source_versions jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_document jsonb not null default '{}'::jsonb,
  completion_percent integer not null default 0 check(completion_percent between 0 and 100),
  next_review_date date, approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default clock_timestamp()
);
create index if not exists bcp_plans_org_updated on public.bcp_plans(organization_id,updated_at desc);
create table if not exists public.bcp_plan_versions (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.bcp_plans(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check(version>0), snapshot jsonb not null,
  approved_by uuid not null references auth.users(id), approved_at timestamptz not null,
  created_at timestamptz not null default now(), unique(plan_id,version)
);
alter table public.bcp_plans enable row level security;
alter table public.bcp_plan_versions enable row level security;
drop policy if exists "Read own BCP plans" on public.bcp_plans;
create policy "Read own BCP plans" on public.bcp_plans for select to authenticated using(owner_id=auth.uid());
drop policy if exists "Read own approved BCP versions" on public.bcp_plan_versions;
create policy "Read own approved BCP versions" on public.bcp_plan_versions for select to authenticated using(owner_id=auth.uid());
revoke all on public.bcp_plans, public.bcp_plan_versions from anon, authenticated;
grant select on public.bcp_plans, public.bcp_plan_versions to authenticated;

create or replace function public.bcp_save_plan(p_id uuid, p_expected_updated_at timestamptz, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor uuid := auth.uid(); org_id uuid := (p_payload->>'organization_id')::uuid;
  current_plan public.bcp_plans%rowtype; saved public.bcp_plans%rowtype;
  next_version integer; row_data jsonb; source_rows jsonb := '{}'::jsonb;
  source_key text; source_table text; link_field text; source_id uuid; source_meta jsonb;
  requested_status text := p_payload->>'status';
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.organizations where id=org_id and owner_id=actor) then raise exception 'Organisation access denied'; end if;
  if requested_status not in ('draft','ready_for_review','approved') then raise exception 'Invalid plan status'; end if;
  if p_id is not null then
    select * into current_plan from public.bcp_plans where id=p_id and owner_id=actor and organization_id=org_id for update;
    if not found then raise exception 'Plan not found'; end if;
    if current_plan.updated_at is distinct from p_expected_updated_at then raise exception 'This plan changed in another session. Reload before saving.'; end if;
    if current_plan.status='approved' and requested_status<>'draft' then raise exception 'Create a draft amendment before review or approval'; end if;
    next_version := current_plan.version + case when current_plan.status='approved' then 1 else 0 end;
  else
    next_version := 1;
  end if;
  if (p_payload->>'version')::integer is distinct from next_version then raise exception 'Plan version conflict'; end if;
  -- The table name is selected from a fixed whitelist. Lock source rows so a
  -- source edit cannot slip between validation and the saved plan snapshot.
  for source_key,source_table in select * from (values
    ('site','bcp_site_profiles'),('context','bcp_context_assessments'),('roles','bcp_role_assessments'),
    ('hazards','bcp_hazard_assessments'),('bia','bcp_bia_assessments'),('outsourced','bcp_outsourced_process_assessments'),
    ('strategy','bcp_strategy_assessments'),('incident','bcp_incident_management_assessments')
  ) as sources(key_name,table_name) loop
    source_id := nullif(p_payload->'source_ids'->>source_key,'')::uuid;
    if source_id is not null then
      execute format('select to_jsonb(s) from public.%I s where id=$1 and organization_id=$2 and owner_id=$3 and status<>''archived'' for share',source_table) into row_data using source_id,org_id,actor;
      if row_data is null then raise exception 'Source % is missing or inaccessible',source_key; end if;
      source_meta := p_payload->'source_versions'->source_key;
      if (source_meta->>'id')::uuid is distinct from source_id or (source_meta->>'version')::integer is distinct from coalesce((row_data->>'version')::integer,1) or (source_meta->>'updatedAt')::timestamptz is distinct from (row_data->>'updated_at')::timestamptz then raise exception 'Source % changed. Refresh before saving.',source_key; end if;
      if requested_status='approved' and row_data->>'status'<>'approved' then raise exception 'Approve source % first',source_key; end if;
      if source_key in ('incident','bia','hazards','roles','context') and row_data->>'site_profile_id' is distinct from p_payload->>'site_profile_id' then raise exception 'Source % belongs to a different site',source_key; end if;
      source_rows := source_rows || jsonb_build_object(source_key,row_data);
    end if;
  end loop;
  if source_rows->'site' is null or source_rows->'site'->>'id' is distinct from p_payload->>'site_profile_id' then raise exception 'A valid Site Profile is required'; end if;
  if p_payload->>'incident_assessment_id' is distinct from source_rows->'incident'->>'id' or p_payload->>'bia_assessment_id' is distinct from source_rows->'bia'->>'id' then raise exception 'Invalid incident or BIA link'; end if;
  if source_rows->'incident' is not null then
    for source_key,link_field in select * from (values ('context','context_assessment_id'),('roles','role_assessment_id'),('hazards','hazard_assessment_id'),('strategy','strategy_assessment_id'),('bia','bia_assessment_id')) as links(key_name,field_name) loop
      if nullif(source_rows->'incident'->>link_field,'') is not null and source_rows->'incident'->>link_field is distinct from source_rows->source_key->>'id' then raise exception 'Incident source % does not match the selected record',source_key; end if;
    end loop;
  end if;
  for source_key in select key_name from (values ('bia'),('strategy')) as keys(key_name) loop
    if nullif(source_rows->source_key->>'hazard_assessment_id','') is not null and source_rows->source_key->>'hazard_assessment_id' is distinct from source_rows->'hazards'->>'id' then raise exception 'Hazard source link does not match %',source_key; end if;
  end loop;
  if source_rows->'outsourced' is not null and source_rows->'outsourced'->>'site_profile_id' is distinct from p_payload->>'site_profile_id' and not coalesce((source_rows->'outsourced'->'source_links'->'siteProfiles') ? (p_payload->>'site_profile_id'),false) then raise exception 'Outsourced source must include the selected site'; end if;
  if nullif(source_rows->'strategy'->>'outsourced_assessment_id','') is not null and source_rows->'strategy'->>'outsourced_assessment_id' is distinct from source_rows->'outsourced'->>'id' then raise exception 'Outsourced source does not match strategy'; end if;
  if source_rows->'strategy' is not null and source_rows->'strategy'->>'bia_assessment_id' is distinct from source_rows->'bia'->>'id' then raise exception 'Strategy and BIA links do not match'; end if;
  if p_payload->'generated_document'->>'status' is distinct from requested_status or (p_payload->'generated_document'->>'version')::integer is distinct from next_version then raise exception 'Document status or version mismatch'; end if;
  if requested_status in ('ready_for_review','approved') and ((p_payload->>'completion_percent')::integer<>100 or source_rows->'incident' is null or source_rows->'bia' is null or source_rows->'strategy' is null or source_rows->'hazards' is null or source_rows->'roles' is null) then raise exception 'Complete all plan checks first'; end if;
  if p_id is null then
    insert into public.bcp_plans(owner_id,organization_id,site_profile_id,plan_reference,plan_title)
    values(actor,org_id,(p_payload->>'site_profile_id')::uuid,p_payload->>'plan_reference',p_payload->>'plan_title') returning * into saved;
    p_id := saved.id;
  end if;
  update public.bcp_plans set
    site_profile_id=(p_payload->>'site_profile_id')::uuid,
    incident_assessment_id=nullif(p_payload->>'incident_assessment_id','')::uuid,
    bia_assessment_id=nullif(p_payload->>'bia_assessment_id','')::uuid,
    plan_title=p_payload->>'plan_title', version=next_version, status=requested_status,
    plan_data=p_payload->'plan_data', source_ids=p_payload->'source_ids', source_versions=p_payload->'source_versions',
    source_snapshot=jsonb_build_object('sources',source_rows,'people',coalesce(p_payload->'source_snapshot'->'people','[]'::jsonb)),
    generated_document=p_payload->'generated_document', completion_percent=(p_payload->>'completion_percent')::integer,
    next_review_date=nullif(p_payload->>'next_review_date','')::date,
    approved_by=case when requested_status='approved' then actor else null end,
    approved_at=case when requested_status='approved' then (p_payload->>'approved_at')::timestamptz else null end,
    updated_at=clock_timestamp()
  where id=p_id returning * into saved;
  if requested_status='approved' then
    insert into public.bcp_plan_versions(plan_id,owner_id,organization_id,version,snapshot,approved_by,approved_at)
    values(saved.id,actor,org_id,saved.version,to_jsonb(saved),actor,saved.approved_at);
  end if;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.bcp_save_plan(uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.bcp_save_plan(uuid,timestamptz,jsonb) to authenticated;
commit;
