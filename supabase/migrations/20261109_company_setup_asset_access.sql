-- Company Setup: retain company/site IDs and reproduce the live Asset Management boundary.
-- No company, address, location, building, zone or subscription data is deleted.
begin;

create or replace function public.has_asset_management_access(target_organization uuid, minimum_level text default 'view')
returns boolean language sql stable security definer set search_path=public
as $$
 select public.is_organization_people_admin(target_organization)
 or exists (
  select 1 from public.organization_people p
  join public.organization_person_permissions m on m.person_id=p.id and m.organization_id=p.organization_id
  where p.organization_id=target_organization and p.user_id=auth.uid()
   and p.account_type='system' and p.account_status='active'
   and m.module_key='asset_management'
   and array_position(array['none','view','contribute','review','approve','admin'],m.access_level)
       >= array_position(array['none','view','contribute','review','approve','admin'],minimum_level)
   and m.access_level<>'none'
 );
$$;
revoke all on function public.has_asset_management_access(uuid,text) from public,anon;
grant execute on function public.has_asset_management_access(uuid,text) to authenticated,service_role;

alter table public.organization_assets enable row level security;
drop policy if exists "Company users view active assets" on public.organization_assets;
drop policy if exists "Company contributors manage assets" on public.organization_assets;
drop policy if exists asset_module_read on public.organization_assets;
create policy asset_module_read on public.organization_assets for select to authenticated using (public.has_asset_management_access(organization_id,'view'));
drop policy if exists asset_module_insert on public.organization_assets;
create policy asset_module_insert on public.organization_assets for insert to authenticated with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organizations o where o.id=organization_assets.organization_id and o.owner_id=organization_assets.owner_id));
drop policy if exists asset_module_update on public.organization_assets;
create policy asset_module_update on public.organization_assets for update to authenticated using (public.has_asset_management_access(organization_id,'contribute')) with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organizations o where o.id=organization_assets.organization_id and o.owner_id=organization_assets.owner_id));

alter table public.organization_asset_maintenance enable row level security;
drop policy if exists "Company users view asset maintenance" on public.organization_asset_maintenance;
drop policy if exists "Company contributors manage asset maintenance" on public.organization_asset_maintenance;
drop policy if exists asset_maintenance_read on public.organization_asset_maintenance;
create policy asset_maintenance_read on public.organization_asset_maintenance for select to authenticated using (public.has_asset_management_access(organization_id,'view'));
drop policy if exists asset_maintenance_insert on public.organization_asset_maintenance;
create policy asset_maintenance_insert on public.organization_asset_maintenance for insert to authenticated with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organization_assets a where a.id=organization_asset_maintenance.asset_id and a.organization_id=organization_asset_maintenance.organization_id and a.owner_id=organization_asset_maintenance.owner_id));
drop policy if exists asset_maintenance_update on public.organization_asset_maintenance;
create policy asset_maintenance_update on public.organization_asset_maintenance for update to authenticated using (public.has_asset_management_access(organization_id,'contribute')) with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organization_assets a where a.id=organization_asset_maintenance.asset_id and a.organization_id=organization_asset_maintenance.organization_id and a.owner_id=organization_asset_maintenance.owner_id));

alter table public.organization_asset_document_links enable row level security;
drop policy if exists "Company users view asset document links" on public.organization_asset_document_links;
drop policy if exists "Company contributors manage asset document links" on public.organization_asset_document_links;
drop policy if exists asset_documents_read on public.organization_asset_document_links;
create policy asset_documents_read on public.organization_asset_document_links for select to authenticated using (public.has_asset_management_access(organization_id,'view'));
drop policy if exists asset_documents_insert on public.organization_asset_document_links;
create policy asset_documents_insert on public.organization_asset_document_links for insert to authenticated with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organization_assets a where a.id=organization_asset_document_links.asset_id and a.organization_id=organization_asset_document_links.organization_id and a.owner_id=organization_asset_document_links.owner_id));
drop policy if exists asset_documents_update on public.organization_asset_document_links;
create policy asset_documents_update on public.organization_asset_document_links for update to authenticated using (public.has_asset_management_access(organization_id,'contribute')) with check (public.has_asset_management_access(organization_id,'contribute') and exists(select 1 from public.organization_assets a where a.id=organization_asset_document_links.asset_id and a.organization_id=organization_asset_document_links.organization_id and a.owner_id=organization_asset_document_links.owner_id));
drop policy if exists asset_documents_unlink on public.organization_asset_document_links;
create policy asset_documents_unlink on public.organization_asset_document_links for delete to authenticated using (public.has_asset_management_access(organization_id,'contribute'));

-- Used only by an authenticated server action after verifying the company owner.
-- Never callable with a browser or anonymous credential.
create or replace function public.add_company_owner_person(p_company uuid,p_actor uuid,p_first_name text,p_last_name text)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare actor_email text; person_id uuid; existing_user uuid; existing_status text;
begin
 if nullif(btrim(p_first_name),'') is null or nullif(btrim(p_last_name),'') is null or length(p_first_name)>100 or length(p_last_name)>100 then
  raise exception 'Valid owner name required';
 end if;
 perform 1 from public.organizations where id=p_company and owner_id=p_actor for update;
 if not found then raise exception 'Company owner required';end if;
 select lower(email) into actor_email from auth.users where id=p_actor;
 if actor_email is null then raise exception 'Owner account unavailable';end if;
 select id,user_id,account_status into person_id,existing_user,existing_status from public.organization_people
 where organization_id=p_company and (lower(email)=actor_email or user_id=p_actor) order by created_at limit 1;
 if person_id is not null then
  if existing_user=p_actor and existing_status='active' then return person_id;end if;
  raise exception 'Review existing company-user record';
 end if;
 insert into public.organization_people(organization_id,user_id,first_name,last_name,email,account_type,account_status,created_by)
 values(p_company,p_actor,btrim(p_first_name),btrim(p_last_name),actor_email,'system','active',p_actor) returning id into person_id;
 insert into public.organization_access_events(organization_id,person_id,actor_id,event_type,event_summary)
 values(p_company,person_id,p_actor,'company_owner_directory_added','Company owner added their existing account to the company directory');
 return person_id;
end;
$fn$;
revoke all on function public.add_company_owner_person(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.add_company_owner_person(uuid,uuid,text,text) to service_role;

commit;
