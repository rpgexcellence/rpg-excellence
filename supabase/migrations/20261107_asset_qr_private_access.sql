begin;

-- Access history written by authenticated application routes.
create table if not exists public.organization_asset_access_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null
   references public.organizations(id) on delete cascade,
 asset_id uuid not null
   references public.organization_assets(id) on delete cascade,
 actor_id uuid
   references auth.users(id) on delete set null,
 event_type text not null
   check(event_type in (
     'record_view',
     'label_download',
     'evidence_download'
   )),
 maintenance_id uuid
   references public.organization_asset_maintenance(id)
   on delete set null,
 created_at timestamptz not null default now()
);

create index if not exists asset_access_events_company_asset_date
 on public.organization_asset_access_events(
   organization_id,
   asset_id,
   created_at desc
 );

alter table public.organization_asset_access_events
 enable row level security;

revoke all on public.organization_asset_access_events
 from public, anon, authenticated;

grant select, insert on public.organization_asset_access_events
 to service_role;

create or replace function public.guard_asset_access_event_scope()
returns trigger
language plpgsql
set search_path=public
as $$
begin
 if not exists(
   select 1
   from public.organization_assets a
   where a.id=NEW.asset_id
     and a.organization_id=NEW.organization_id
 ) then
   raise exception 'Invalid asset event scope';
 end if;

 if NEW.maintenance_id is not null
   and not exists(
     select 1
     from public.organization_asset_maintenance m
     where m.id=NEW.maintenance_id
       and m.asset_id=NEW.asset_id
       and m.organization_id=NEW.organization_id
   )
 then
   raise exception 'Invalid maintenance event scope';
 end if;

 return NEW;
end
$$;

revoke all on function public.guard_asset_access_event_scope()
 from public, anon, authenticated;

drop trigger if exists guard_asset_access_event_scope
 on public.organization_asset_access_events;

create trigger guard_asset_access_event_scope
 before insert on public.organization_asset_access_events
 for each row
 execute function public.guard_asset_access_event_scope();

-- Keep asset maintenance evidence private.
update storage.buckets
 set public=false
 where id='asset-maintenance-evidence';

-- Block direct browser reads, including signed-URL creation.
drop policy if exists asset_evidence_server_download_only
 on storage.objects;

create policy asset_evidence_server_download_only
 on storage.objects
 as restrictive
 for select
 to anon, authenticated
 using (bucket_id <> 'asset-maintenance-evidence');

-- Block direct browser replacement of evidence.
drop policy if exists asset_evidence_no_browser_update
 on storage.objects;

create policy asset_evidence_no_browser_update
 on storage.objects
 as restrictive
 for update
 to anon, authenticated
 using (bucket_id <> 'asset-maintenance-evidence')
 with check (bucket_id <> 'asset-maintenance-evidence');

-- Block direct browser deletion of evidence.
drop policy if exists asset_evidence_no_browser_delete
 on storage.objects;

create policy asset_evidence_no_browser_delete
 on storage.objects
 as restrictive
 for delete
 to anon, authenticated
 using (bucket_id <> 'asset-maintenance-evidence');

commit;
