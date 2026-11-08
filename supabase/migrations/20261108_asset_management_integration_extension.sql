-- Apply AFTER the released Phase 2 export foundation and Asset Management migrations.
-- New resources start their own snapshot; existing assets cursors and payloads are unchanged.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
do $preflight$ declare spec record; col text; begin
 if to_regclass('public.integration_export_sources') is null then raise exception 'Apply Phase 2 export foundation first';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='area_department') then raise exception 'Missing prerequisite: organization_assets.area_department';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='asset_categories') then raise exception 'Missing prerequisite: organization_assets.asset_categories';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='asset_name') then raise exception 'Missing prerequisite: organization_assets.asset_name';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='asset_owner_person_id') then raise exception 'Missing prerequisite: organization_assets.asset_owner_person_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='asset_reference') then raise exception 'Missing prerequisite: organization_assets.asset_reference';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='asset_type') then raise exception 'Missing prerequisite: organization_assets.asset_type';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_acceptance_criteria') then raise exception 'Missing prerequisite: organization_assets.calibration_acceptance_criteria';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_certificate_reference') then raise exception 'Missing prerequisite: organization_assets.calibration_certificate_reference';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_frequency_unit') then raise exception 'Missing prerequisite: organization_assets.calibration_frequency_unit';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_frequency_value') then raise exception 'Missing prerequisite: organization_assets.calibration_frequency_value';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_interval_basis') then raise exception 'Missing prerequisite: organization_assets.calibration_interval_basis';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_provider') then raise exception 'Missing prerequisite: organization_assets.calibration_provider';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_required') then raise exception 'Missing prerequisite: organization_assets.calibration_required';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_result') then raise exception 'Missing prerequisite: organization_assets.calibration_result';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='calibration_scope') then raise exception 'Missing prerequisite: organization_assets.calibration_scope';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='change_control_required') then raise exception 'Missing prerequisite: organization_assets.change_control_required';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='created_at') then raise exception 'Missing prerequisite: organization_assets.created_at';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='criticality') then raise exception 'Missing prerequisite: organization_assets.criticality';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='id') then raise exception 'Missing prerequisite: organization_assets.id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='last_calibration_date') then raise exception 'Missing prerequisite: organization_assets.last_calibration_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='last_maintenance_date') then raise exception 'Missing prerequisite: organization_assets.last_maintenance_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='maintenance_owner_person_id') then raise exception 'Missing prerequisite: organization_assets.maintenance_owner_person_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='maintenance_owner_type') then raise exception 'Missing prerequisite: organization_assets.maintenance_owner_type';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='maintenance_supplier_id') then raise exception 'Missing prerequisite: organization_assets.maintenance_supplier_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='manufacturer') then raise exception 'Missing prerequisite: organization_assets.manufacturer';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='model') then raise exception 'Missing prerequisite: organization_assets.model';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='next_calibration_date') then raise exception 'Missing prerequisite: organization_assets.next_calibration_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='next_maintenance_date') then raise exception 'Missing prerequisite: organization_assets.next_maintenance_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='operational_status') then raise exception 'Missing prerequisite: organization_assets.operational_status';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='organization_id') then raise exception 'Missing prerequisite: organization_assets.organization_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='owner_id') then raise exception 'Missing prerequisite: organization_assets.owner_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='ppm_frequency_unit') then raise exception 'Missing prerequisite: organization_assets.ppm_frequency_unit';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='ppm_frequency_value') then raise exception 'Missing prerequisite: organization_assets.ppm_frequency_value';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='ppm_required') then raise exception 'Missing prerequisite: organization_assets.ppm_required';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='serial_number') then raise exception 'Missing prerequisite: organization_assets.serial_number';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='site_location_id') then raise exception 'Missing prerequisite: organization_assets.site_location_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='site_location_label') then raise exception 'Missing prerequisite: organization_assets.site_location_label';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_assets' and column_name='updated_at') then raise exception 'Missing prerequisite: organization_assets.updated_at';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='asset_id') then raise exception 'Missing prerequisite: organization_asset_maintenance.asset_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='calibration_acceptance_criteria') then raise exception 'Missing prerequisite: organization_asset_maintenance.calibration_acceptance_criteria';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='calibration_result') then raise exception 'Missing prerequisite: organization_asset_maintenance.calibration_result';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='completed_date') then raise exception 'Missing prerequisite: organization_asset_maintenance.completed_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='created_at') then raise exception 'Missing prerequisite: organization_asset_maintenance.created_at';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='evidence_reference') then raise exception 'Missing prerequisite: organization_asset_maintenance.evidence_reference';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='id') then raise exception 'Missing prerequisite: organization_asset_maintenance.id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='maintenance_owner_type') then raise exception 'Missing prerequisite: organization_asset_maintenance.maintenance_owner_type';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='maintenance_reference') then raise exception 'Missing prerequisite: organization_asset_maintenance.maintenance_reference';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='maintenance_type') then raise exception 'Missing prerequisite: organization_asset_maintenance.maintenance_type';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='next_due_date') then raise exception 'Missing prerequisite: organization_asset_maintenance.next_due_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='organization_id') then raise exception 'Missing prerequisite: organization_asset_maintenance.organization_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='owner_id') then raise exception 'Missing prerequisite: organization_asset_maintenance.owner_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='performed_by') then raise exception 'Missing prerequisite: organization_asset_maintenance.performed_by';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='responsible_person_id') then raise exception 'Missing prerequisite: organization_asset_maintenance.responsible_person_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='scheduled_date') then raise exception 'Missing prerequisite: organization_asset_maintenance.scheduled_date';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='status') then raise exception 'Missing prerequisite: organization_asset_maintenance.status';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='supplier_id') then raise exception 'Missing prerequisite: organization_asset_maintenance.supplier_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_maintenance' and column_name='work_completed') then raise exception 'Missing prerequisite: organization_asset_maintenance.work_completed';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='asset_id') then raise exception 'Missing prerequisite: organization_asset_document_links.asset_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='controlled_document_id') then raise exception 'Missing prerequisite: organization_asset_document_links.controlled_document_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='created_at') then raise exception 'Missing prerequisite: organization_asset_document_links.created_at';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='id') then raise exception 'Missing prerequisite: organization_asset_document_links.id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='organization_id') then raise exception 'Missing prerequisite: organization_asset_document_links.organization_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_document_links' and column_name='owner_id') then raise exception 'Missing prerequisite: organization_asset_document_links.owner_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='asset_id') then raise exception 'Missing prerequisite: organization_asset_assurance_links.asset_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='created_at') then raise exception 'Missing prerequisite: organization_asset_assurance_links.created_at';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='finding_id') then raise exception 'Missing prerequisite: organization_asset_assurance_links.finding_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='id') then raise exception 'Missing prerequisite: organization_asset_assurance_links.id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='organization_id') then raise exception 'Missing prerequisite: organization_asset_assurance_links.organization_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='organization_asset_assurance_links' and column_name='rca_case_id') then raise exception 'Missing prerequisite: organization_asset_assurance_links.rca_case_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hs_moc_changes' and column_name='id') then raise exception 'Missing prerequisite: hs_moc_changes.id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hs_moc_changes' and column_name='organization_asset_id') then raise exception 'Missing prerequisite: hs_moc_changes.organization_asset_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hs_moc_changes' and column_name='organization_id') then raise exception 'Missing prerequisite: hs_moc_changes.organization_id';end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='hs_moc_changes' and column_name='owner_id') then raise exception 'Missing prerequisite: hs_moc_changes.owner_id';end if;
end $preflight$;
alter table public.integration_api_clients drop constraint if exists integration_api_permissions_valid;
alter table public.integration_api_clients add constraint integration_api_permissions_valid check(permissions <@ array[
 'audits:read','findings:read','capa:read','assets:read','suppliers:read','people:read','workplace_inspections:read','security_incidents:read','security_incidents:detail',
 'audits:write','findings:write','capa:write','assets:write','suppliers:write','webhooks:manage','assets:maintenance:read','assets:links:read']::text[]);
create table if not exists public.integration_asset_controls as select organization_id,owner_id,id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,manufacturer,model,serial_number,asset_owner_person_id,criticality,operational_status,ppm_required,ppm_frequency_value,ppm_frequency_unit,last_maintenance_date,next_maintenance_date,maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,change_control_required,created_at,updated_at,asset_categories,calibration_required,last_calibration_date,next_calibration_date,calibration_frequency_value,calibration_frequency_unit,calibration_interval_basis,calibration_provider,calibration_certificate_reference,calibration_result,calibration_scope,calibration_acceptance_criteria from public.organization_assets with no data;
create unique index if not exists integration_asset_controls_id on public.integration_asset_controls(id);
alter table public.integration_asset_controls enable row level security;
revoke all on public.integration_asset_controls from public,anon,authenticated,service_role;
grant select on public.integration_asset_controls to service_role;
create or replace function public.integration_export_eligible(spec_resource text,row_data jsonb)
returns boolean language plpgsql volatile security definer set search_path='' as $fn$
declare b record;
begin
 select * into b from public.integration_export_binding(spec_resource,row_data);
 if not found then return false; end if;
 if spec_resource in ('asset-maintenance','asset-documents','asset-assurance-links','asset-moc-links') then
   if not exists(select 1 from public.organization_assets a where a.id=nullif(coalesce(row_data->>'asset_id',row_data->>'organization_asset_id'),'')::uuid and a.organization_id=b.organization_id and a.owner_id=b.owner_id) then return false;end if;
 end if;
 if spec_resource='findings' then
   if coalesce(row_data->>'finding_type','') not in ('major_nc','minor_nc') then return false; end if;
   if row_data->>'audit_id' is not null and not exists(select 1 from public.internal_audits a where a.id=(row_data->>'audit_id')::uuid and a.owner_id=b.owner_id and a.organization_id=b.organization_id) then return false; end if;
 end if;
 return true;
end $fn$;
do $register$ declare spec record; current_spec public.integration_export_sources; begin for spec in select * from jsonb_to_recordset('[{"resource":"asset-controls","source_table":"integration_asset_controls","permission":"assets:read","owner_required":true,"fields":["id","asset_reference","asset_name","asset_type","site_location_id","site_location_label","area_department","manufacturer","model","serial_number","asset_owner_person_id","criticality","operational_status","ppm_required","ppm_frequency_value","ppm_frequency_unit","last_maintenance_date","next_maintenance_date","maintenance_owner_type","maintenance_owner_person_id","maintenance_supplier_id","change_control_required","created_at","updated_at","asset_categories","calibration_required","last_calibration_date","next_calibration_date","calibration_frequency_value","calibration_frequency_unit","calibration_interval_basis","calibration_provider","calibration_certificate_reference","calibration_result","calibration_scope","calibration_acceptance_criteria"]},{"resource":"asset-maintenance","source_table":"organization_asset_maintenance","permission":"assets:maintenance:read","owner_required":true,"fields":["id","asset_id","maintenance_reference","maintenance_type","scheduled_date","completed_date","status","maintenance_owner_type","responsible_person_id","supplier_id","performed_by","work_completed","evidence_reference","calibration_result","calibration_acceptance_criteria","next_due_date","created_at"]},{"resource":"asset-documents","source_table":"organization_asset_document_links","permission":"assets:links:read","owner_required":true,"fields":["id","asset_id","controlled_document_id","created_at"]},{"resource":"asset-assurance-links","source_table":"organization_asset_assurance_links","permission":"assets:links:read","owner_required":false,"fields":["id","asset_id","finding_id","rca_case_id","created_at"]},{"resource":"asset-moc-links","source_table":"hs_moc_changes","permission":"assets:links:read","owner_required":true,"fields":["id","organization_asset_id"]}]'::jsonb) as x(resource text,source_table text,permission text,owner_required boolean,fields text[]) loop
 select * into current_spec from public.integration_export_sources where resource=spec.resource;
 if found and (current_spec.source_table<>spec.source_table or current_spec.required_permission<>spec.permission or current_spec.export_fields<>spec.fields) then raise exception 'Existing asset export definition differs';end if;
 insert into public.integration_export_sources(resource,source_table,required_permission,owner_required,export_fields) values(spec.resource,spec.source_table,spec.permission,spec.owner_required,spec.fields) on conflict(resource) do nothing;
 end loop;end $register$;
create or replace function public.sync_integration_asset_controls() returns trigger language plpgsql security definer set search_path='' as $fn$
declare spec public.integration_export_sources; row_data jsonb; previous record; begin
 delete from public.integration_asset_controls where id=old.id and (TG_OP='DELETE' or old.id<>new.id);
 if TG_OP<>'DELETE' then
 insert into public.integration_asset_controls(organization_id,owner_id,id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,manufacturer,model,serial_number,asset_owner_person_id,criticality,operational_status,ppm_required,ppm_frequency_value,ppm_frequency_unit,last_maintenance_date,next_maintenance_date,maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,change_control_required,created_at,updated_at,asset_categories,calibration_required,last_calibration_date,next_calibration_date,calibration_frequency_value,calibration_frequency_unit,calibration_interval_basis,calibration_provider,calibration_certificate_reference,calibration_result,calibration_scope,calibration_acceptance_criteria) values(new.organization_id,new.owner_id,new.id,new.asset_reference,new.asset_name,new.asset_type,new.site_location_id,new.site_location_label,new.area_department,new.manufacturer,new.model,new.serial_number,new.asset_owner_person_id,new.criticality,new.operational_status,new.ppm_required,new.ppm_frequency_value,new.ppm_frequency_unit,new.last_maintenance_date,new.next_maintenance_date,new.maintenance_owner_type,new.maintenance_owner_person_id,new.maintenance_supplier_id,new.change_control_required,new.created_at,new.updated_at,new.asset_categories,new.calibration_required,new.last_calibration_date,new.next_calibration_date,new.calibration_frequency_value,new.calibration_frequency_unit,new.calibration_interval_basis,new.calibration_provider,new.calibration_certificate_reference,new.calibration_result,new.calibration_scope,new.calibration_acceptance_criteria) on conflict(id) do update set organization_id=excluded.organization_id,owner_id=excluded.owner_id,asset_reference=excluded.asset_reference,asset_name=excluded.asset_name,asset_type=excluded.asset_type,site_location_id=excluded.site_location_id,site_location_label=excluded.site_location_label,area_department=excluded.area_department,manufacturer=excluded.manufacturer,model=excluded.model,serial_number=excluded.serial_number,asset_owner_person_id=excluded.asset_owner_person_id,criticality=excluded.criticality,operational_status=excluded.operational_status,ppm_required=excluded.ppm_required,ppm_frequency_value=excluded.ppm_frequency_value,ppm_frequency_unit=excluded.ppm_frequency_unit,last_maintenance_date=excluded.last_maintenance_date,next_maintenance_date=excluded.next_maintenance_date,maintenance_owner_type=excluded.maintenance_owner_type,maintenance_owner_person_id=excluded.maintenance_owner_person_id,maintenance_supplier_id=excluded.maintenance_supplier_id,change_control_required=excluded.change_control_required,created_at=excluded.created_at,updated_at=excluded.updated_at,asset_categories=excluded.asset_categories,calibration_required=excluded.calibration_required,last_calibration_date=excluded.last_calibration_date,next_calibration_date=excluded.next_calibration_date,calibration_frequency_value=excluded.calibration_frequency_value,calibration_frequency_unit=excluded.calibration_frequency_unit,calibration_interval_basis=excluded.calibration_interval_basis,calibration_provider=excluded.calibration_provider,calibration_certificate_reference=excluded.calibration_certificate_reference,calibration_result=excluded.calibration_result,calibration_scope=excluded.calibration_scope,calibration_acceptance_criteria=excluded.calibration_acceptance_criteria;
 end if;
 if TG_OP='DELETE' or (TG_OP='UPDATE' and (old.organization_id is distinct from new.organization_id or old.owner_id is distinct from new.owner_id or old.id is distinct from new.id)) then
  for spec in select * from public.integration_export_sources where resource in ('asset-maintenance','asset-documents','asset-assurance-links','asset-moc-links') loop
   for previous in select distinct on(record_id) * from public.integration_export_changes where resource=spec.resource and organization_id=old.organization_id and owner_id=old.owner_id order by record_id,change_id desc loop
    if previous.operation='upsert' and coalesce(previous.record_data->>'asset_id',previous.record_data->>'organization_asset_id')=old.id::text then
     insert into public.integration_export_changes(organization_id,owner_id,resource,record_id,operation,source_xid) values(previous.organization_id,previous.owner_id,spec.resource,previous.record_id,'delete',txid_current());
    end if;
   end loop;
   -- Restore newly eligible children after a controlled parent move back.
   if TG_OP<>'DELETE' then
    for row_data in execute format('select to_jsonb(t) from public.%I t where %I=$1',spec.source_table,case when spec.resource='asset-moc-links' then 'organization_asset_id' else 'asset_id' end) using new.id loop
     if public.integration_export_eligible(spec.resource,row_data) then perform public.integration_export_append(spec.resource,row_data,false);end if;
    end loop;
   end if;
  end loop;
 end if;
 return null;end $fn$;
lock table public.organization_assets in share row exclusive mode;
drop trigger if exists sync_integration_asset_controls on public.organization_assets;
create trigger sync_integration_asset_controls after insert or update or delete on public.organization_assets for each row execute function public.sync_integration_asset_controls();
do $capture$ declare spec public.integration_export_sources; r record; n bigint; begin for spec in select * from public.integration_export_sources where resource in ('asset-controls','asset-maintenance','asset-documents','asset-assurance-links','asset-moc-links') order by source_table loop
 execute format('lock table public.%I in share row exclusive mode',spec.source_table);
 execute format('drop trigger if exists integration_export_capture_row on public.%I',spec.source_table);
 execute format('create trigger integration_export_capture_row after insert or update or delete on public.%I for each row execute function public.integration_export_capture()',spec.source_table);
 execute format('drop trigger if exists integration_export_no_truncate on public.%I',spec.source_table);
 execute format('create trigger integration_export_no_truncate before truncate on public.%I for each statement execute function public.integration_export_guard_truncate()',spec.source_table);
 if spec.initialized_xid is null then
 if spec.resource='asset-controls' then insert into public.integration_asset_controls(organization_id,owner_id,id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,manufacturer,model,serial_number,asset_owner_person_id,criticality,operational_status,ppm_required,ppm_frequency_value,ppm_frequency_unit,last_maintenance_date,next_maintenance_date,maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,change_control_required,created_at,updated_at,asset_categories,calibration_required,last_calibration_date,next_calibration_date,calibration_frequency_value,calibration_frequency_unit,calibration_interval_basis,calibration_provider,calibration_certificate_reference,calibration_result,calibration_scope,calibration_acceptance_criteria) select organization_id,owner_id,id,asset_reference,asset_name,asset_type,site_location_id,site_location_label,area_department,manufacturer,model,serial_number,asset_owner_person_id,criticality,operational_status,ppm_required,ppm_frequency_value,ppm_frequency_unit,last_maintenance_date,next_maintenance_date,maintenance_owner_type,maintenance_owner_person_id,maintenance_supplier_id,change_control_required,created_at,updated_at,asset_categories,calibration_required,last_calibration_date,next_calibration_date,calibration_frequency_value,calibration_frequency_unit,calibration_interval_basis,calibration_provider,calibration_certificate_reference,calibration_result,calibration_scope,calibration_acceptance_criteria from public.organization_assets on conflict(id) do nothing;else
 n:=0;for r in execute format('select to_jsonb(t) row_data from public.%I t order by id',spec.source_table) loop if public.integration_export_eligible(spec.resource,r.row_data) then perform public.integration_export_append(spec.resource,r.row_data,false,true);n:=n+1;end if;end loop;end if;
 update public.integration_export_sources set initialized_xid=txid_current(),initialized_at=clock_timestamp(),seeded_records=(select count(distinct record_id) from public.integration_export_changes c where c.resource=spec.resource) where resource=spec.resource;
 end if;end loop;end $capture$;
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
 if p_resource in ('asset-maintenance','asset-documents','asset-assurance-links','asset-moc-links') and not coalesce('assets:read'=any(client.permissions),false) then raise exception 'export_scope_required';end if;
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

revoke all on function public.sync_integration_asset_controls() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
