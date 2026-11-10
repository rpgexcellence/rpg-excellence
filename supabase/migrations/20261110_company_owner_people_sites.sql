-- Company owners use their existing login; people select controlled company locations.
-- Preserves company IDs, people IDs, site text, permissions, credentials and subscriptions.
begin;

alter table public.organization_people add column if not exists site_id uuid;
alter table public.organization_people add column if not exists site_legacy_text text;
update public.organization_people set site_legacy_text=site where site_legacy_text is null and nullif(btrim(site),'') is not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.organization_people'::regclass and conname='organization_people_site_id_fkey') then
  alter table public.organization_people add constraint organization_people_site_id_fkey foreign key(site_id) references public.organization_sites(id) on delete set null;
 end if;
end $$;
create index if not exists organization_people_site_id_idx on public.organization_people(organization_id,site_id);

create or replace function public.guard_company_person_site()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare location public.organization_sites;
begin
 if NEW.site_id is null then return NEW;end if;
 select * into location from public.organization_sites s where s.id=NEW.site_id and s.organization_id=NEW.organization_id;
 if not found then raise exception 'Person site must belong to the same company';end if;
 if TG_OP='INSERT' then
  if location.status<>'active' then raise exception 'Select an active company location';end if;
 elsif NEW.site_id is distinct from OLD.site_id or NEW.organization_id is distinct from OLD.organization_id then
  if location.status<>'active' then raise exception 'Select an active company location';end if;
 end if;
 -- Keep a readable compatibility snapshot for existing APIs, invitations and history.
 NEW.site=concat_ws(' · ',location.site_reference,location.site_name);
 return NEW;
end;
$fn$;
revoke all on function public.guard_company_person_site() from public,anon,authenticated,service_role;
drop trigger if exists guard_company_person_site on public.organization_people;
create trigger guard_company_person_site before insert or update of site_id,organization_id,site on public.organization_people for each row execute function public.guard_company_person_site();

-- Only unambiguous exact matches within the same company are linked. Unmatched
-- or duplicate names remain as legacy text for explicit review, never discarded.
with matches as (
 select p.id,min(s.id::text)::uuid as site_id
 from public.organization_people p join public.organization_sites s on s.organization_id=p.organization_id and s.status='active'
 and lower(btrim(p.site)) in (lower(btrim(s.site_name)),lower(btrim(s.site_reference)),lower(btrim(concat_ws(' · ',s.site_reference,s.site_name))))
 where p.site_id is null and nullif(btrim(p.site),'') is not null
 group by p.id having count(*)=1
)
update public.organization_people p set site_id=m.site_id from matches m where p.id=m.id;

create or replace function public.ensure_company_owner_person(p_company uuid)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare company_owner uuid; actor_email text; metadata jsonb; first_name_value text; last_name_value text;
 person_id uuid; linked_user uuid; person_status text; person_type text; was_confirmed timestamptz;
begin
 select owner_id into company_owner from public.organizations where id=p_company for update;
 if not found or company_owner is null then return null;end if;
 select lower(email),coalesce(raw_user_meta_data,'{}'::jsonb),email_confirmed_at into actor_email,metadata,was_confirmed from auth.users where id=company_owner;
 if nullif(actor_email,'') is null or was_confirmed is null then return null;end if;
 -- Authentication metadata supplies display names only, never permissions.
 first_name_value=left(coalesce(nullif(btrim(metadata->>'first_name'),''),nullif(btrim(metadata->>'given_name'),''),''),100);
 last_name_value=left(coalesce(nullif(btrim(metadata->>'last_name'),''),nullif(btrim(metadata->>'family_name'),''),''),100);
 select id,user_id,account_status,account_type into person_id,linked_user,person_status,person_type
 from public.organization_people where organization_id=p_company and user_id=company_owner order by created_at limit 1;
 if person_id is not null then
  if person_status not in ('suspended','closed') and (person_status<>'active' or person_type<>'system') then
   update public.organization_people set account_type='system',account_status='active',updated_at=now() where id=person_id;
   insert into public.organization_access_events(organization_id,person_id,actor_id,event_type,event_summary)
   values(p_company,person_id,company_owner,'company_owner_directory_linked','Verified company owner activated their existing linked directory record');
  end if;
  return person_id;
 end if;
 select id,user_id,account_status,account_type into person_id,linked_user,person_status,person_type
 from public.organization_people where organization_id=p_company and lower(email)=actor_email order by created_at limit 1;
 if person_id is not null then
  -- Do not claim another account's row or override a suspension/closure.
  if linked_user is not null or person_status in ('suspended','closed') then return null;end if;
  update public.organization_people set user_id=company_owner,account_type='system',account_status='active',updated_at=now() where id=person_id;
  insert into public.organization_access_events(organization_id,person_id,actor_id,event_type,event_summary)
  values(p_company,person_id,company_owner,'company_owner_directory_linked','Verified company owner linked to their existing directory record');
 else
  insert into public.organization_people(organization_id,user_id,first_name,last_name,email,account_type,account_status,created_by)
  values(p_company,company_owner,first_name_value,last_name_value,actor_email,'system','active',company_owner) returning id into person_id;
  insert into public.organization_access_events(organization_id,person_id,actor_id,event_type,event_summary)
  values(p_company,person_id,company_owner,'company_owner_directory_created','Company owner directory record created for their existing verified login');
 end if;
 return person_id;
end;
$fn$;
revoke all on function public.ensure_company_owner_person(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ensure_company_owner_person(uuid) to service_role;

create or replace function public.bootstrap_company_owner_person()
returns trigger language plpgsql security definer set search_path=''
as $$begin perform public.ensure_company_owner_person(NEW.id);return NEW;end$$;
revoke all on function public.bootstrap_company_owner_person() from public,anon,authenticated,service_role;
drop trigger if exists bootstrap_company_owner_person on public.organizations;
create trigger bootstrap_company_owner_person after insert or update of owner_id on public.organizations for each row execute function public.bootstrap_company_owner_person();

-- Backfill owners of existing companies; per-company row lock makes retries safe.
do $$declare company record;begin
 for company in select id from public.organizations order by id loop
  perform public.ensure_company_owner_person(company.id);
 end loop;
end$$;

commit;
