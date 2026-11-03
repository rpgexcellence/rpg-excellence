-- RPG Excellence Phase 2, file 1: stable export history and resumable pages.
-- Repository: supabase/migrations/20261103_integration_export_foundation.sql
-- Run this WHOLE file before deploying the new export API route.
-- Existing read routes, keys, portal roles, subscriptions and RLS are retained.
-- Security incidents use the already-released SUMMARY fields only.
-- A new complete snapshot is required when adopting this export protocol.
-- Retained history starts with this migration; earlier deletions are not invented.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';

do $preflight$
declare spec record; col text;
begin
 if to_regclass('public.integration_api_clients') is null or to_regclass('public.integration_events') is null then raise exception 'Apply the existing integration foundation first'; end if;
 if to_regprocedure('public.reserve_integration_request(uuid,uuid)') is null then raise exception 'The existing API request-budget function is missing'; end if;
 for spec in select * from jsonb_to_recordset('[{"resource":"audits","source_table":"internal_audits","permission":"audits:read","owner_required":true,"fields":["id","audit_reference","title","audit_type","audit_method","status","current_gate","planned_start_at","planned_end_at","updated_at"]},{"resource":"findings","source_table":"internal_audit_findings","permission":"findings:read","owner_required":true,"fields":["id","audit_id","supplier_id","finding_reference","finding_type","risk_level","title","failure_statement","criteria","process_area","responsible_owner_name","agreed_date","status","linked_rca_case_id","closure_verified","source_type","source_category","source_reference","detected_at","created_at","updated_at","closed_at","closure_verified_at"]},{"resource":"capa-8d","source_table":"rca_cases","permission":"capa:read","owner_required":true,"fields":["id","case_reference","title","problem_statement","case_type","source_type","severity","status","current_discipline","capa_current_stage","target_close_date","detected_at","created_at","closed_at","updated_at"]},{"resource":"assets","source_table":"organization_assets","permission":"assets:read","owner_required":true,"fields":["id","asset_reference","asset_name","asset_type","site_location_id","site_location_label","area_department","manufacturer","model","serial_number","asset_owner_person_id","criticality","operational_status","ppm_required","ppm_frequency_value","ppm_frequency_unit","last_maintenance_date","next_maintenance_date","maintenance_owner_type","maintenance_owner_person_id","maintenance_supplier_id","change_control_required","created_at","updated_at"]},{"resource":"suppliers","source_table":"suppliers","permission":"suppliers:read","owner_required":true,"fields":["id","supplier_reference","legal_name","trading_name","country","supply_description","supplier_types","applicable_standards","sites_and_scope","uses_subtier_suppliers","criticality","risk_result","assurance_result","approval_status","approval_scope","approval_conditions","approved_at","approval_expiry","review_frequency_months","next_review_date","version","created_at","updated_at"]},{"resource":"people","source_table":"organization_people","permission":"people:read","owner_required":false,"fields":["id","first_name","last_name","email","position","department","site","account_type","account_status","manager_person_id","functional_manager_person_id","deputy_person_id","created_at","updated_at"]},{"resource":"security-incidents","source_table":"isms_security_incidents","permission":"security_incidents:read","owner_required":true,"fields":["id","incident_reference","title","incident_type","severity","status","detected_at","awareness_at","administration_location_id","verification_result","verified_at","closed_at","created_at","updated_at"]},{"resource":"workplace-inspections","source_table":"hs_workplace_inspections","permission":"workplace_inspections:read","owner_required":true,"fields":["id","inspection_reference","title","inspection_type","programme_id","template_id","administration_location_id","administration_location_label","area_department","planned_start_at","planned_end_at","started_at","completed_at","status","lead_inspector_person_id","accountable_person_id","reviewer_person_id","planning_risk_score","planning_risk_band","planning_basis","scope","created_at","updated_at"]},{"resource":"inspection-programmes","source_table":"hs_inspection_programmes","permission":"workplace_inspections:read","owner_required":true,"fields":["id","programme_reference","title","template_id","administration_location_id","administration_location_label","area_department","accountable_person_id","lead_inspector_person_id","reviewer_person_id","frequency_amount","frequency_unit","last_inspection_date","next_inspection_date","risk_score","risk_band","planning_basis","area_profile","status","signals_last_synchronised_at","signals_synchronisation_summary","created_at","updated_at"]}]'::jsonb) as x(resource text,source_table text,permission text,owner_required boolean,fields text[]) loop
   foreach col in array spec.fields||array['organization_id']||(case when spec.owner_required then array['owner_id'] else array[]::text[] end) loop
     if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=spec.source_table and c.column_name=col) then raise exception 'Export prerequisite missing: %.%. All changes will roll back.',spec.source_table,col; end if;
   end loop;
   if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=spec.source_table and c.column_name='id' and c.udt_name='uuid') then raise exception 'Export resource % requires a UUID record identity',spec.resource; end if;
 end loop;
end $preflight$;

create table if not exists public.integration_export_sources(
 resource text primary key,
 source_table text not null unique,
 required_permission text not null,
 owner_required boolean not null,
 export_fields text[] not null,
 payload_version integer not null default 1 check(payload_version=1),
 initialized_xid bigint,
 seeded_records bigint not null default 0,
 excluded_existing_records bigint not null default 0,
 initialized_at timestamptz
);
create table if not exists public.integration_export_changes(
 change_id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 owner_id uuid not null,
 resource text not null references public.integration_export_sources(resource),
 record_id uuid not null,
 operation text not null check(operation in ('upsert','delete')),
 record_data jsonb,
 source_xid bigint not null,
 recorded_at timestamptz not null default clock_timestamp(),
 baseline boolean not null default false,
 payload_version integer not null default 1 check(payload_version=1),
 constraint integration_export_payload_shape check((operation='delete' and record_data is null) or (operation='upsert' and jsonb_typeof(record_data)='object'))
);
create index if not exists integration_export_change_page_idx on public.integration_export_changes(organization_id,owner_id,resource,change_id);
create index if not exists integration_export_snapshot_idx on public.integration_export_changes(organization_id,owner_id,resource,record_id,change_id desc);
create index if not exists integration_export_xid_idx on public.integration_export_changes(organization_id,owner_id,resource,source_xid,change_id);
create table if not exists public.integration_export_pages(
 token uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 owner_id uuid not null,
 resource text not null references public.integration_export_sources(resource),
 kind text not null check(kind in ('snapshot','changes','checkpoint')),
 lower_xid bigint not null default 0,
 upper_xid bigint not null,
 after_change_id bigint not null default 0,
 after_record_id uuid,
 page_size integer not null check(page_size between 1 and 100),
 next_token uuid,
 checkpoint_token uuid,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 constraint integration_export_xid_order check(lower_xid>=0 and upper_xid>=lower_xid)
);
create index if not exists integration_export_page_expiry_idx on public.integration_export_pages(organization_id,expires_at);
alter table public.integration_export_sources enable row level security;
alter table public.integration_export_changes enable row level security;
alter table public.integration_export_pages enable row level security;
revoke all on public.integration_export_sources,public.integration_export_changes,public.integration_export_pages from public,anon,authenticated,service_role;
grant select on public.integration_export_sources,public.integration_export_changes,public.integration_export_pages to service_role;
revoke all on sequence public.integration_export_changes_change_id_seq from public,anon,authenticated,service_role;

do $register$
declare spec record; current_spec public.integration_export_sources;
begin
 for spec in select * from jsonb_to_recordset('[{"resource":"audits","source_table":"internal_audits","permission":"audits:read","owner_required":true,"fields":["id","audit_reference","title","audit_type","audit_method","status","current_gate","planned_start_at","planned_end_at","updated_at"]},{"resource":"findings","source_table":"internal_audit_findings","permission":"findings:read","owner_required":true,"fields":["id","audit_id","supplier_id","finding_reference","finding_type","risk_level","title","failure_statement","criteria","process_area","responsible_owner_name","agreed_date","status","linked_rca_case_id","closure_verified","source_type","source_category","source_reference","detected_at","created_at","updated_at","closed_at","closure_verified_at"]},{"resource":"capa-8d","source_table":"rca_cases","permission":"capa:read","owner_required":true,"fields":["id","case_reference","title","problem_statement","case_type","source_type","severity","status","current_discipline","capa_current_stage","target_close_date","detected_at","created_at","closed_at","updated_at"]},{"resource":"assets","source_table":"organization_assets","permission":"assets:read","owner_required":true,"fields":["id","asset_reference","asset_name","asset_type","site_location_id","site_location_label","area_department","manufacturer","model","serial_number","asset_owner_person_id","criticality","operational_status","ppm_required","ppm_frequency_value","ppm_frequency_unit","last_maintenance_date","next_maintenance_date","maintenance_owner_type","maintenance_owner_person_id","maintenance_supplier_id","change_control_required","created_at","updated_at"]},{"resource":"suppliers","source_table":"suppliers","permission":"suppliers:read","owner_required":true,"fields":["id","supplier_reference","legal_name","trading_name","country","supply_description","supplier_types","applicable_standards","sites_and_scope","uses_subtier_suppliers","criticality","risk_result","assurance_result","approval_status","approval_scope","approval_conditions","approved_at","approval_expiry","review_frequency_months","next_review_date","version","created_at","updated_at"]},{"resource":"people","source_table":"organization_people","permission":"people:read","owner_required":false,"fields":["id","first_name","last_name","email","position","department","site","account_type","account_status","manager_person_id","functional_manager_person_id","deputy_person_id","created_at","updated_at"]},{"resource":"security-incidents","source_table":"isms_security_incidents","permission":"security_incidents:read","owner_required":true,"fields":["id","incident_reference","title","incident_type","severity","status","detected_at","awareness_at","administration_location_id","verification_result","verified_at","closed_at","created_at","updated_at"]},{"resource":"workplace-inspections","source_table":"hs_workplace_inspections","permission":"workplace_inspections:read","owner_required":true,"fields":["id","inspection_reference","title","inspection_type","programme_id","template_id","administration_location_id","administration_location_label","area_department","planned_start_at","planned_end_at","started_at","completed_at","status","lead_inspector_person_id","accountable_person_id","reviewer_person_id","planning_risk_score","planning_risk_band","planning_basis","scope","created_at","updated_at"]},{"resource":"inspection-programmes","source_table":"hs_inspection_programmes","permission":"workplace_inspections:read","owner_required":true,"fields":["id","programme_reference","title","template_id","administration_location_id","administration_location_label","area_department","accountable_person_id","lead_inspector_person_id","reviewer_person_id","frequency_amount","frequency_unit","last_inspection_date","next_inspection_date","risk_score","risk_band","planning_basis","area_profile","status","signals_last_synchronised_at","signals_synchronisation_summary","created_at","updated_at"]}]'::jsonb) as x(resource text,source_table text,permission text,owner_required boolean,fields text[]) loop
   select * into current_spec from public.integration_export_sources where resource=spec.resource;
   if found and (current_spec.source_table<>spec.source_table or current_spec.required_permission<>spec.permission or current_spec.owner_required<>spec.owner_required or current_spec.export_fields<>spec.fields) then raise exception 'Existing export definition for % differs; use a versioned migration rather than silently changing exported fields',spec.resource; end if;
   insert into public.integration_export_sources(resource,source_table,required_permission,owner_required,export_fields) values(spec.resource,spec.source_table,spec.permission,spec.owner_required,spec.fields) on conflict(resource) do nothing;
 end loop;
end $register$;

-- UUID tenant binding is verified against the current organisation owner.
-- Directory rows have no owner_id; all other resources retain their own binding.
create or replace function public.integration_export_binding(spec_resource text,row_data jsonb)
returns table(organization_id uuid,owner_id uuid)
language plpgsql volatile security definer set search_path='' as $fn$
declare spec public.integration_export_sources; org uuid; owner uuid;
begin
 if row_data is null then return; end if;
 select * into spec from public.integration_export_sources where resource=spec_resource;
 if not found then raise exception 'Unregistered export resource'; end if;
 org:=nullif(row_data->>'organization_id','')::uuid;
 if org is null then return; end if;
 select o.owner_id into owner from public.organizations o where o.id=org;
 if owner is null then return; end if;
 if spec.owner_required and nullif(row_data->>'owner_id','')::uuid is distinct from owner then return; end if;
 organization_id:=org;owner_id:=owner;return next;
end $fn$;
create or replace function public.integration_export_eligible(spec_resource text,row_data jsonb)
returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare b record;
begin
 select * into b from public.integration_export_binding(spec_resource,row_data);
 if not found then return false; end if;
 if spec_resource='findings' then
   if coalesce(row_data->>'finding_type','') not in ('major_nc','minor_nc') then return false; end if;
   if row_data->>'audit_id' is not null and not exists(select 1 from public.internal_audits a where a.id=(row_data->>'audit_id')::uuid and a.owner_id=b.owner_id and a.organization_id=b.organization_id) then return false; end if;
 end if;
 return true;
end $fn$;
create or replace function public.integration_export_payload(spec_resource text,row_data jsonb)
returns jsonb language sql stable security definer set search_path='' as $fn$
 select coalesce(jsonb_object_agg(f.key,row_data->f.key),'{}'::jsonb)
 from public.integration_export_sources s cross join lateral unnest(s.export_fields) as f(key)
 where s.resource=spec_resource
$fn$;
create or replace function public.integration_export_append(spec_resource text,row_data jsonb,deleted boolean,is_baseline boolean default false)
returns void language plpgsql volatile security definer set search_path='' as $fn$
declare b record;
begin
 select * into b from public.integration_export_binding(spec_resource,row_data);
 if not found then return; end if;
 insert into public.integration_export_changes(organization_id,owner_id,resource,record_id,operation,record_data,source_xid,baseline)
 values(b.organization_id,b.owner_id,spec_resource,(row_data->>'id')::uuid,case when deleted then 'delete' else 'upsert' end,case when deleted then null else public.integration_export_payload(spec_resource,row_data) end,txid_current(),is_baseline);
end $fn$;
create or replace function public.integration_export_capture()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare spec public.integration_export_sources; oldj jsonb; newj jsonb; old_org uuid;old_owner uuid;new_org uuid;new_owner uuid;new_ok boolean;old_visible boolean;
begin
 select * into spec from public.integration_export_sources where source_table=TG_TABLE_NAME;
 if not found then raise exception 'Unregistered export source'; end if;
 if TG_OP<>'INSERT' then oldj:=to_jsonb(old);select organization_id,owner_id into old_org,old_owner from public.integration_export_binding(spec.resource,oldj);end if;
 -- Read the current row, rather than a possibly stale outer NEW tuple:
 -- another AFTER trigger may already have performed a nested revision.
 execute format('select to_jsonb(t) from public.%I t where id=$1',spec.source_table)
 into newj using (case when TG_OP='DELETE' then old.id else new.id end);
 if newj is not null then select organization_id,owner_id into new_org,new_owner from public.integration_export_binding(spec.resource,newj);end if;
 new_ok:=coalesce(public.integration_export_eligible(spec.resource,newj),false);
 if TG_OP='UPDATE' and old_org is not distinct from new_org and old_owner is not distinct from new_owner and public.integration_export_payload(spec.resource,oldj)=public.integration_export_payload(spec.resource,newj) and public.integration_export_eligible(spec.resource,oldj)=new_ok then return null; end if;
 old_visible:=coalesce(public.integration_export_eligible(spec.resource,oldj),false);
 if not old_visible and old_org is not null then select coalesce((select c.operation='upsert' from public.integration_export_changes c where c.organization_id=old_org and c.owner_id=old_owner and c.resource=spec.resource and c.record_id=(oldj->>'id')::uuid order by c.change_id desc limit 1),false) into old_visible;end if;
 if TG_OP<>'INSERT' and old_visible and old_org is not null and (not new_ok or old_org is distinct from new_org or old_owner is distinct from new_owner or (oldj->>'id') is distinct from (newj->>'id')) then perform public.integration_export_append(spec.resource,oldj,true);end if;
 if new_ok then perform public.integration_export_append(spec.resource,newj,false);end if;
 return null;
end $fn$;

-- A parent audit move/delete must also remove its now-ineligible finding rows
-- from the old feed, even when those child rows are retained by the source module.
create or replace function public.integration_export_audit_children()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare f record; audit_identity uuid; previous_visible boolean;
begin
 audit_identity:=case when TG_OP='DELETE' then old.id else new.id end;
 if TG_OP='UPDATE' and old.owner_id is not distinct from new.owner_id and old.organization_id is not distinct from new.organization_id and old.id is not distinct from new.id then return null;end if;
 for f in select * from public.internal_audit_findings where audit_id=audit_identity or (TG_OP='UPDATE' and audit_id=old.id) loop
   select coalesce((select c.operation='upsert' from public.integration_export_changes c where c.resource='findings' and c.record_id=f.id and c.organization_id=f.organization_id and c.owner_id=f.owner_id order by c.change_id desc limit 1),false) into previous_visible;
   if public.integration_export_eligible('findings',to_jsonb(f)) then
     perform public.integration_export_append('findings',to_jsonb(f),false);
   elsif previous_visible then
     perform public.integration_export_append('findings',to_jsonb(f),true);
   end if;
 end loop;
 return null;
end $fn$;
create or replace function public.integration_export_guard_truncate()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin raise exception 'Export-tracked registers require controlled DELETE operations; TRUNCATE would bypass deletion history';end $fn$;

-- Trigger installation locks each table against concurrent writes through commit.
-- Backfill and trigger installation therefore leave no untracked-write window.
do $capture$
declare spec public.integration_export_sources; r record; eligible_rows bigint; total_rows bigint;
begin
 for spec in select * from public.integration_export_sources order by source_table loop
   execute format('lock table public.%I in share row exclusive mode',spec.source_table);
   execute format('drop trigger if exists integration_export_capture_row on public.%I',spec.source_table);
   execute format('create trigger integration_export_capture_row after insert or update or delete on public.%I for each row execute function public.integration_export_capture()',spec.source_table);
   execute format('drop trigger if exists integration_export_no_truncate on public.%I',spec.source_table);
   execute format('create trigger integration_export_no_truncate before truncate on public.%I for each statement execute function public.integration_export_guard_truncate()',spec.source_table);
   if spec.initialized_xid is null then
     eligible_rows:=0;total_rows:=0;
     for r in execute format('select to_jsonb(t) as row_data from public.%I t order by id',spec.source_table) loop
       total_rows:=total_rows+1;
       if public.integration_export_eligible(spec.resource,r.row_data) then perform public.integration_export_append(spec.resource,r.row_data,false,true);eligible_rows:=eligible_rows+1;end if;
     end loop;
     update public.integration_export_sources set initialized_xid=txid_current(),seeded_records=eligible_rows,excluded_existing_records=total_rows-eligible_rows,initialized_at=clock_timestamp() where resource=spec.resource;
   end if;
 end loop;
end $capture$;
drop trigger if exists integration_export_audit_children on public.internal_audits;
create trigger integration_export_audit_children after insert or update or delete on public.internal_audits for each row execute function public.integration_export_audit_children();

-- All rows below a snapshot xmin are from completed transactions. Do NOT use
-- max(change_id) alone: sequence allocation is not transaction commit order.
-- This prevents a slow earlier transaction being missed after a checkpoint.
create or replace function public.integration_export_safe_cutoff()
returns bigint language sql volatile security definer set search_path='' as $fn$
 select txid_snapshot_xmin(txid_current_snapshot())
$fn$;

-- Trusted server only. Existing authentication still checks entitlement, rate
-- budget and ingress IP; this function rechecks live key, company and read scope.
-- Cursors are opaque, database-bound UUIDs, not client-editable offsets.
create or replace function public.read_integration_export_page(p_client uuid,p_resource text,p_cursor uuid default null,p_page_size integer default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare client public.integration_api_clients; spec public.integration_export_sources; page public.integration_export_pages;
 cutoff bigint; size integer; rows_json jsonb; has_more boolean; next_id uuid; checkpoint_id uuid; last_change bigint; last_record uuid; count_rows integer; result jsonb;
begin
 select c.* into client from public.integration_api_clients c join public.organizations o on o.id=c.organization_id and o.owner_id=c.owner_id
 where c.id=p_client and c.active and c.revoked_at is null and c.environment='live' and (c.expires_at is null or c.expires_at>clock_timestamp());
 if not found then raise exception 'export_key_unavailable';end if;
 select * into spec from public.integration_export_sources where resource=p_resource;
 if not found or spec.initialized_xid is null then raise exception 'export_resource_unavailable';end if;
 if not coalesce(spec.required_permission=any(client.permissions),false) then raise exception 'export_scope_required';end if;
 if p_page_size is not null and (p_page_size<1 or p_page_size>100) then raise exception 'export_invalid_page_size';end if;
 cutoff:=public.integration_export_safe_cutoff();
 if cutoff<=spec.initialized_xid then raise exception 'export_capture_initialising';end if;
 if p_cursor is null then
   insert into public.integration_export_pages(organization_id,owner_id,resource,kind,upper_xid,page_size,expires_at)
   values(client.organization_id,client.owner_id,p_resource,'snapshot',cutoff,coalesce(p_page_size,100),clock_timestamp()+interval '48 hours') returning * into page;
 else
   select * into page from public.integration_export_pages where token=p_cursor and organization_id=client.organization_id and owner_id=client.owner_id and resource=p_resource for update;
   if not found then raise exception 'export_cursor_invalid';end if;
   if page.expires_at<=clock_timestamp() then raise exception 'export_cursor_expired_full_resync_required';end if;
   if p_page_size is not null and p_page_size<>page.page_size then raise exception 'export_cursor_page_size_mismatch';end if;
   if page.kind='checkpoint' then
     if page.next_token is null then
       insert into public.integration_export_pages(organization_id,owner_id,resource,kind,lower_xid,upper_xid,page_size,expires_at)
       values(page.organization_id,page.owner_id,page.resource,'changes',page.upper_xid,greatest(cutoff,page.upper_xid),page.page_size,clock_timestamp()+interval '48 hours') returning token into next_id;
       update public.integration_export_pages set next_token=next_id where token=page.token;
     else next_id:=page.next_token;end if;
     select * into page from public.integration_export_pages where token=next_id for update;
     if page.expires_at<=clock_timestamp() then raise exception 'export_cursor_expired_full_resync_required';end if;
   end if;
 end if;
 size:=page.page_size;
 if page.kind='snapshot' then
   with latest as (
     select distinct on(c.record_id) c.change_id,c.record_id,c.operation,c.record_data
     from public.integration_export_changes c
     where c.organization_id=page.organization_id and c.owner_id=page.owner_id and c.resource=page.resource and c.source_xid<page.upper_xid
     order by c.record_id,c.change_id desc
   ), picked as (
     select * from latest where operation='upsert' and (page.after_record_id is null or record_id>page.after_record_id) order by record_id limit size+1
   )
   select coalesce(jsonb_agg(jsonb_build_object('change_id',change_id::text,'record_id',record_id,'operation',operation,'record',record_data) order by record_id),'[]'::jsonb) into rows_json from picked;
 else
   select coalesce(jsonb_agg(jsonb_build_object('change_id',q.change_id::text,'record_id',q.record_id,'operation',q.operation,'record',q.record_data) order by q.change_id),'[]'::jsonb) into rows_json
   from(select c.change_id,c.record_id,c.operation,c.record_data from public.integration_export_changes c
     where c.organization_id=page.organization_id and c.owner_id=page.owner_id and c.resource=page.resource and c.source_xid>=page.lower_xid and c.source_xid<page.upper_xid and c.change_id>page.after_change_id order by c.change_id limit size+1) q;
 end if;
 count_rows:=jsonb_array_length(rows_json);has_more:=count_rows>size;
 if has_more then
   rows_json:=rows_json-(count_rows-1);
   last_change:=(rows_json->(size-1)->>'change_id')::bigint;
   last_record:=(rows_json->(size-1)->>'record_id')::uuid;
   if page.next_token is null then
     insert into public.integration_export_pages(organization_id,owner_id,resource,kind,lower_xid,upper_xid,after_change_id,after_record_id,page_size,expires_at)
     values(page.organization_id,page.owner_id,page.resource,page.kind,page.lower_xid,page.upper_xid,last_change,last_record,size,page.expires_at) returning token into next_id;
     update public.integration_export_pages set next_token=next_id where token=page.token;
   else next_id:=page.next_token;end if;
   checkpoint_id:=null;
 else
   next_id:=null;
   if page.checkpoint_token is null then
     insert into public.integration_export_pages(organization_id,owner_id,resource,kind,lower_xid,upper_xid,page_size,expires_at)
     values(page.organization_id,page.owner_id,page.resource,'checkpoint',page.upper_xid,page.upper_xid,size,clock_timestamp()+interval '30 days') returning token into checkpoint_id;
     update public.integration_export_pages set checkpoint_token=checkpoint_id where token=page.token;
   else checkpoint_id:=page.checkpoint_token;end if;
 end if;
 result:=jsonb_build_object('resource',page.resource,'mode',page.kind,'data',rows_json,'complete',not has_more,'next_cursor',next_id,'checkpoint',checkpoint_id,'cursor_expires_at',page.expires_at,'payload_version',1);
 return result;
end $fn$;

revoke all on function public.integration_export_binding(text,jsonb),public.integration_export_eligible(text,jsonb),public.integration_export_payload(text,jsonb),public.integration_export_append(text,jsonb,boolean,boolean),public.integration_export_capture(),public.integration_export_audit_children(),public.integration_export_guard_truncate(),public.integration_export_safe_cutoff(),public.read_integration_export_page(uuid,text,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_integration_export_page(uuid,text,uuid,integer) to service_role;
comment on table public.integration_export_changes is 'Versioned, allow-listed export history. Retain until a separately reviewed retention/resynchronisation policy is deployed. change_id is a record version, not a commit watermark.';
comment on function public.read_integration_export_page(uuid,text,uuid,integer) is 'Service-only bounded snapshots and delta pages; initial API authentication and request budgeting remain mandatory. A stable record_id plus change_id supports idempotent receiver upserts.';
notify pgrst,'reload schema';
commit;
select resource,'READY'::text as capture_status,seeded_records,excluded_existing_records,cardinality(export_fields) as exported_fields from public.integration_export_sources order by resource;
