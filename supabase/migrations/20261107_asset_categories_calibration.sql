begin;
alter table public.organization_assets
 add column if not exists asset_categories text[] not null default '{}',
 add column if not exists calibration_required boolean not null default false,
 add column if not exists last_calibration_date date,
 add column if not exists next_calibration_date date,
 add column if not exists calibration_frequency_value integer,
 add column if not exists calibration_frequency_unit text,
 add column if not exists calibration_interval_basis text,
 add column if not exists calibration_provider text,
 add column if not exists calibration_certificate_reference text,
 add column if not exists calibration_result text not null default 'not_assessed',
 add column if not exists calibration_scope text,
 add column if not exists calibration_acceptance_criteria text;
update public.organization_assets set asset_categories=array[asset_type] where cardinality(asset_categories)=0;
alter table public.organization_asset_maintenance
 add column if not exists calibration_result text,
 add column if not exists next_due_date date,
 add column if not exists initial_record_key text,
 add column if not exists calibration_acceptance_criteria text;
create unique index if not exists asset_initial_history_key on public.organization_asset_maintenance(asset_id,initial_record_key) where initial_record_key is not null;
do $$ begin
 alter table public.organization_assets add constraint asset_calibration_result_check check (calibration_result in ('not_assessed','within_limits','out_of_tolerance','conditional'));
exception when duplicate_object then null; end $$;
do $$ begin
 alter table public.organization_assets add constraint asset_calibration_interval_check check (not calibration_required or (next_calibration_date is not null and (last_calibration_date is null or next_calibration_date>last_calibration_date) and nullif(trim(calibration_interval_basis),'') is not null and ((calibration_frequency_value is null and calibration_frequency_unit is null) or (calibration_frequency_value is not null and calibration_frequency_unit is not null and calibration_frequency_value between 1 and 1000 and calibration_frequency_unit in ('days','weeks','months','years')))));
exception when duplicate_object then null; end $$;
create table if not exists public.organization_asset_save_requests (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 request_id uuid not null, asset_id uuid not null references public.organization_assets(id) on delete cascade,
 submitted_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(organization_id,request_id)
);
alter table public.organization_asset_save_requests enable row level security;
revoke all on public.organization_asset_save_requests from public,anon,authenticated;
grant select,insert on public.organization_asset_save_requests to service_role;
create or replace function public.save_asset_with_initial_history(p_company uuid,p_actor uuid,p_request uuid,p_asset_id uuid,p_create boolean,p_values jsonb,p_document_ids uuid[],p_records jsonb)
returns jsonb language plpgsql set search_path=public as $$
declare v public.organization_assets; company_owner uuid; previous public.organization_asset_save_requests; rec jsonb; retained jsonb;
begin
 select owner_id into company_owner from public.organizations where id=p_company;
 if company_owner is null then raise exception 'Company unavailable'; end if;
 if p_actor<>company_owner and not exists(
  select 1 from public.organization_people person where person.organization_id=p_company and person.user_id=p_actor and person.account_status='active' and person.account_type='system' and (
   exists(select 1 from public.organization_person_permissions perm where perm.person_id=person.id and perm.organization_id=p_company and perm.module_key='asset_management' and perm.access_level in ('contribute','review','approve','admin'))
   or (exists(select 1 from public.organization_person_permissions perm where perm.person_id=person.id and perm.organization_id=p_company and perm.module_key='people_access' and perm.access_level='admin') and exists(select 1 from public.organization_person_authorizations a where a.person_id=person.id and a.function_key='company_administrator' and a.status='authorised' and (a.expires_at is null or a.expires_at>=current_date)))
  )
 ) then raise exception 'Asset create/edit access is required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_company::text||p_request::text,0));
 select * into previous from public.organization_asset_save_requests where organization_id=p_company and request_id=p_request;
 if found then
  if previous.submitted_by<>p_actor then raise exception 'Submission identity mismatch'; end if;
  return jsonb_build_object('id',previous.asset_id,'reused',true,'retained_paths','[]'::jsonb);
 end if;
 if not p_create then
  select * into v from public.organization_assets where id=p_asset_id and organization_id=p_company and owner_id=company_owner for update;
  if not found then raise exception 'Asset unavailable in this company'; end if;
 end if;
 v:=jsonb_populate_record(v,p_values);
 v.calibration_result:=coalesce(v.calibration_result,'not_assessed');
 if not exists(select 1 from public.organization_people where id=v.asset_owner_person_id and organization_id=p_company and account_status='active') or not exists(select 1 from public.organization_people where id=v.maintenance_owner_person_id and organization_id=p_company and account_status='active') then raise exception 'Select current company owners'; end if;
 if v.maintenance_owner_type='supplier' and not exists(select 1 from public.suppliers where id=v.maintenance_supplier_id and organization_id=p_company and approval_status in ('approved','conditionally_approved')) then raise exception 'Select an approved company supplier'; end if;
 if cardinality(coalesce(p_document_ids,'{}'::uuid[]))<>(select count(*) from public.controlled_documents where id=any(coalesce(p_document_ids,'{}'::uuid[])) and status='Current' and audience in ('Customer','Both')) then raise exception 'Review the current document selection'; end if;
 if p_create then
  insert into public.organization_assets(id,organization_id,owner_id,asset_reference,asset_name,asset_type,asset_categories,site_location_id,site_location_label,area_department,description,manufacturer,model,serial_number,asset_owner_person_id,criticality,operational_status,ppm_required,ppm_frequency_value,ppm_frequency_unit,last_maintenance_date,next_maintenance_date,maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,maintenance_provider,maintenance_notes,change_control_required,calibration_required,last_calibration_date,next_calibration_date,calibration_frequency_value,calibration_frequency_unit,calibration_interval_basis,calibration_provider,calibration_certificate_reference,calibration_result,calibration_scope,calibration_acceptance_criteria,created_at,updated_at) values(p_asset_id,p_company,company_owner,v.asset_reference,v.asset_name,v.asset_type,v.asset_categories,v.site_location_id,v.site_location_label,v.area_department,v.description,v.manufacturer,v.model,v.serial_number,v.asset_owner_person_id,v.criticality,v.operational_status,v.ppm_required,v.ppm_frequency_value,v.ppm_frequency_unit,v.last_maintenance_date,v.next_maintenance_date,v.maintenance_owner_type,v.maintenance_owner_person_id,v.maintenance_supplier_id,v.maintenance_provider,v.maintenance_notes,v.change_control_required,v.calibration_required,v.last_calibration_date,v.next_calibration_date,v.calibration_frequency_value,v.calibration_frequency_unit,v.calibration_interval_basis,v.calibration_provider,v.calibration_certificate_reference,v.calibration_result,v.calibration_scope,v.calibration_acceptance_criteria,now(),now());
 else
  update public.organization_assets set asset_reference=v.asset_reference,asset_name=v.asset_name,asset_type=v.asset_type,asset_categories=v.asset_categories,site_location_id=v.site_location_id,site_location_label=v.site_location_label,area_department=v.area_department,description=v.description,manufacturer=v.manufacturer,model=v.model,serial_number=v.serial_number,asset_owner_person_id=v.asset_owner_person_id,criticality=v.criticality,operational_status=v.operational_status,ppm_required=v.ppm_required,ppm_frequency_value=v.ppm_frequency_value,ppm_frequency_unit=v.ppm_frequency_unit,last_maintenance_date=v.last_maintenance_date,next_maintenance_date=v.next_maintenance_date,maintenance_owner_type=v.maintenance_owner_type,maintenance_owner_person_id=v.maintenance_owner_person_id,maintenance_supplier_id=v.maintenance_supplier_id,maintenance_provider=v.maintenance_provider,maintenance_notes=v.maintenance_notes,change_control_required=v.change_control_required,calibration_required=v.calibration_required,last_calibration_date=v.last_calibration_date,next_calibration_date=v.next_calibration_date,calibration_frequency_value=v.calibration_frequency_value,calibration_frequency_unit=v.calibration_frequency_unit,calibration_interval_basis=v.calibration_interval_basis,calibration_provider=v.calibration_provider,calibration_certificate_reference=v.calibration_certificate_reference,calibration_result=v.calibration_result,calibration_scope=v.calibration_scope,calibration_acceptance_criteria=v.calibration_acceptance_criteria,updated_at=now() where id=p_asset_id and organization_id=p_company;
 end if;
 delete from public.organization_asset_document_links where asset_id=p_asset_id and organization_id=p_company;
 insert into public.organization_asset_document_links(organization_id,owner_id,asset_id,controlled_document_id,created_by) select p_company,company_owner,p_asset_id,document_id,p_actor from unnest(coalesce(p_document_ids,'{}'::uuid[])) document_id;
 for rec in select value from jsonb_array_elements(coalesce(p_records,'[]'::jsonb)) loop
  if (rec->>'date')::date>current_date or (rec->>'date') is null then raise exception 'Historical work must have a completed date on or before today'; end if;
  if nullif(rec->>'evidence_storage_path','') is not null and not starts_with(rec->>'evidence_storage_path',p_company::text||'/'||p_asset_id::text||'/') then raise exception 'Evidence company/asset mismatch'; end if;
  insert into public.organization_asset_maintenance(organization_id,owner_id,asset_id,maintenance_reference,maintenance_type,scheduled_date,completed_date,maintenance_owner_type,responsible_person_id,supplier_id,performed_by,work_completed,evidence_reference,status,created_by,evidence_storage_path,evidence_file_name,evidence_mime_type,evidence_size_bytes,calibration_result,calibration_acceptance_criteria,next_due_date,initial_record_key)
  values(p_company,company_owner,p_asset_id,rec->>'maintenance_reference',rec->>'maintenance_type',(rec->>'date')::date,(rec->>'date')::date,case when rec->>'maintenance_type'='calibration' then null else v.maintenance_owner_type end,v.maintenance_owner_person_id,case when rec->>'maintenance_type'='calibration' then null else v.maintenance_supplier_id end,rec->>'performed_by',rec->>'work_completed',rec->>'reference','completed',p_actor,rec->>'evidence_storage_path',rec->>'evidence_file_name',rec->>'evidence_mime_type',(rec->>'evidence_size_bytes')::bigint,rec->>'calibration_result',rec->>'calibration_acceptance_criteria',(rec->>'next_due_date')::date,p_request::text||':'||(rec->>'kind'));
 end loop;
 insert into public.organization_asset_save_requests(organization_id,request_id,asset_id,submitted_by) values(p_company,p_request,p_asset_id,p_actor);
 select coalesce(jsonb_agg(evidence_storage_path),'[]'::jsonb) into retained from public.organization_asset_maintenance where asset_id=p_asset_id and organization_id=p_company and initial_record_key like p_request::text||':%' and evidence_storage_path is not null;
 return jsonb_build_object('id',p_asset_id,'reused',false,'retained_paths',retained);
end; $$;
revoke all on function public.save_asset_with_initial_history(uuid,uuid,uuid,uuid,boolean,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.save_asset_with_initial_history(uuid,uuid,uuid,uuid,boolean,jsonb,uuid[],jsonb) to service_role;
commit;
