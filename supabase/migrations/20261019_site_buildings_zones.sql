-- Apply after the existing Site Profile and Workplace Inspection migrations.
begin;
create table public.organization_buildings (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 site_id uuid not null references public.organization_sites(id), name text not null check(length(name) between 1 and 120),
 created_at timestamptz not null default now(), unique(organization_id,site_id,name)
);
create table public.organization_zones (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 site_id uuid not null references public.organization_sites(id), building_id uuid references public.organization_buildings(id),
 public_token uuid not null unique default gen_random_uuid(), reference text not null check(length(reference) between 1 and 40),
 name text not null check(length(name) between 1 and 160), floor_level text not null default '', description text not null default '',
 owner_person_id uuid not null references public.organization_people(id), deputy_person_id uuid references public.organization_people(id),
 access_mode text not null default 'company' check(access_mode in ('company','link')),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 restriction text not null default '', key_controls text not null default '', emergency_information text not null default '',
 show_inspections boolean not null default true, show_assessments boolean not null default true,
 show_owner boolean not null default false, version integer not null default 1,
 updated_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,site_id,reference)
);
create table public.organization_zone_assessments (
 zone_id uuid not null references public.organization_zones(id) on delete cascade,
 assessment_id uuid not null references public.hs_risk_assessments(id) on delete cascade,
 primary key(zone_id,assessment_id)
);
create table public.organization_zone_events (
 id uuid primary key default gen_random_uuid(), zone_id uuid not null references public.organization_zones(id),
 organization_id uuid not null references public.organizations(id), actor_id uuid references auth.users(id),
 event text not null, snapshot jsonb not null, created_at timestamptz not null default now()
);
create table public.organization_zone_concerns (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 zone_id uuid not null references public.organization_zones(id), reporter_user_id uuid not null references auth.users(id),
 description text not null check(length(description) between 10 and 3000),
 status text not null default 'open' check(status in ('open','in_progress','closed')),
 resolution text not null default '', updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.hs_inspection_programmes add column zone_id uuid references public.organization_zones(id);
alter table public.hs_workplace_inspections add column zone_id uuid references public.organization_zones(id);
create index on public.organization_zones(organization_id,site_id);
create index on public.hs_inspection_programmes(organization_id,zone_id);
create index on public.hs_workplace_inspections(organization_id,zone_id);
create index on public.organization_zone_concerns(organization_id,zone_id,created_at);

-- The app uses server-only service-role queries after membership/administrator checks.
-- No table or mutation function is exposed directly through the anonymous client.
do $$ declare t text; begin
 foreach t in array array['organization_buildings','organization_zones','organization_zone_assessments','organization_zone_events','organization_zone_concerns'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.validate_zone_location() returns trigger language plpgsql set search_path=public as $$
declare z public.organization_zones; begin
 if new.zone_id is null then return new; end if;
 select * into z from public.organization_zones where id=new.zone_id;
 if not found or z.organization_id<>new.organization_id or z.site_id::text<>new.administration_location_id then
  raise exception 'Zone must belong to the same organisation and controlled site';
 end if;
 if z.status='archived' then raise exception 'An archived zone cannot receive inspection records'; end if;
 return new;
end $$;
create trigger programme_zone_location before insert or update of zone_id,organization_id,administration_location_id on public.hs_inspection_programmes for each row execute function public.validate_zone_location();
create trigger inspection_zone_location before insert or update of zone_id,organization_id,administration_location_id on public.hs_workplace_inspections for each row execute function public.validate_zone_location();

-- Save zone details, assessment links and explicit inspection assignments atomically.
-- Only the server may invoke this function, after checking administrator authority.
create function public.save_organization_zone(p_org uuid,p_actor uuid,p_site uuid,p_id uuid,p_version integer,p_values jsonb,p_assessments uuid[],p_programmes uuid[],p_inspections uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare z public.organization_zones; result_id uuid; b uuid; owner_person uuid; deputy uuid; target_status text; begin
 if not exists(select 1 from public.organization_sites where id=p_site and organization_id=p_org and status='active') then raise exception 'Select an active site'; end if;
 b:=nullif(p_values->>'building_id','')::uuid;
 owner_person:=(p_values->>'owner_person_id')::uuid; deputy:=nullif(p_values->>'deputy_person_id','')::uuid;
 if b is not null and not exists(select 1 from public.organization_buildings where id=b and organization_id=p_org and site_id=p_site) then raise exception 'Invalid building'; end if;
 if not exists(select 1 from public.organization_people where id=owner_person and organization_id=p_org and account_status='active') or (deputy is not null and not exists(select 1 from public.organization_people where id=deputy and organization_id=p_org and account_status='active')) then raise exception 'Select active Company Users'; end if;
 if owner_person=deputy then raise exception 'Choose a different deputy'; end if;
 target_status:=p_values->>'status';
 if target_status='published' and length(trim(coalesce(p_values->>'emergency_information','')))=0 then raise exception 'Add local emergency instructions before publishing'; end if;
 if p_id is not null then
  select * into z from public.organization_zones where id=p_id and organization_id=p_org and site_id=p_site for update;
  if not found then raise exception 'Zone not found'; end if;
  if z.version<>p_version then raise exception 'This zone changed. Reload before saving'; end if;
  result_id:=z.id;
 else result_id:=gen_random_uuid(); end if;
 -- Serialize competing assignments so a programme/inspection cannot be stolen by concurrent saves.
 perform 1 from public.hs_inspection_programmes where id=any(p_programmes) order by id for update;
 perform 1 from public.hs_workplace_inspections where id=any(p_inspections) order by id for update;
 if exists(select 1 from unnest(p_assessments) x where not exists(select 1 from public.hs_risk_assessments a where a.id=x and a.organization_id=p_org and a.administration_location_id=p_site::text)) then raise exception 'Assessment must belong to this controlled site'; end if;
 if exists(select 1 from unnest(p_programmes) x where not exists(select 1 from public.hs_inspection_programmes a where a.id=x and a.organization_id=p_org and a.administration_location_id=p_site::text and (a.zone_id is null or a.zone_id=result_id))) then raise exception 'Programme unavailable or already assigned to another zone'; end if;
 if exists(select 1 from unnest(p_inspections) x where not exists(select 1 from public.hs_workplace_inspections a where a.id=x and a.organization_id=p_org and a.administration_location_id=p_site::text and (a.zone_id is null or a.zone_id=result_id))) then raise exception 'Inspection unavailable or already assigned to another zone'; end if;
 insert into public.organization_zones(id,organization_id,site_id,building_id,reference,name,floor_level,description,owner_person_id,deputy_person_id,access_mode,status,restriction,key_controls,emergency_information,show_inspections,show_assessments,show_owner,updated_by)
 values(result_id,p_org,p_site,b,p_values->>'reference',p_values->>'name',p_values->>'floor_level',p_values->>'description',owner_person,deputy,p_values->>'access_mode',target_status,p_values->>'restriction',p_values->>'key_controls',p_values->>'emergency_information',(p_values->>'show_inspections')::boolean,(p_values->>'show_assessments')::boolean,(p_values->>'show_owner')::boolean,p_actor)
 on conflict(id) do update set building_id=excluded.building_id,reference=excluded.reference,name=excluded.name,floor_level=excluded.floor_level,description=excluded.description,owner_person_id=excluded.owner_person_id,deputy_person_id=excluded.deputy_person_id,access_mode=excluded.access_mode,status=excluded.status,restriction=excluded.restriction,key_controls=excluded.key_controls,emergency_information=excluded.emergency_information,show_inspections=excluded.show_inspections,show_assessments=excluded.show_assessments,show_owner=excluded.show_owner,updated_by=p_actor,updated_at=now(),version=public.organization_zones.version+1;
 delete from public.organization_zone_assessments where zone_id=result_id;
 insert into public.organization_zone_assessments select result_id,x from (select distinct unnest(p_assessments) x) a;
 -- Historic records change only when explicitly selected or deselected here.
 update public.hs_inspection_programmes set zone_id=null where organization_id=p_org and zone_id=result_id and not(id=any(p_programmes));
 update public.hs_inspection_programmes set zone_id=result_id where organization_id=p_org and id=any(p_programmes) and zone_id is distinct from result_id;
 update public.hs_workplace_inspections set zone_id=null where organization_id=p_org and zone_id=result_id and not(id=any(p_inspections));
 update public.hs_workplace_inspections set zone_id=result_id where organization_id=p_org and id=any(p_inspections) and zone_id is distinct from result_id;
 insert into public.organization_zone_events(zone_id,organization_id,actor_id,event,snapshot) values(result_id,p_org,p_actor,target_status,p_values || jsonb_build_object('assessment_ids',p_assessments,'programme_ids',p_programmes,'inspection_ids',p_inspections));
 return result_id;
end $$;
revoke all on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.save_organization_zone(uuid,uuid,uuid,uuid,integer,jsonb,uuid[],uuid[],uuid[]) to service_role;
commit;
