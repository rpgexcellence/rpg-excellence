begin;
-- Links only. Source findings/cases retain their existing ownership and workflow.
create table if not exists public.organization_asset_assurance_links (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 asset_id uuid not null references public.organization_assets(id) on delete cascade,
 finding_id uuid references public.internal_audit_findings(id) on delete cascade,
 rca_case_id uuid references public.rca_cases(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint asset_assurance_one_source check (num_nonnulls(finding_id,rca_case_id)=1)
);
create unique index if not exists asset_assurance_unique_finding on public.organization_asset_assurance_links(asset_id,finding_id) where finding_id is not null;
create unique index if not exists asset_assurance_unique_case on public.organization_asset_assurance_links(asset_id,rca_case_id) where rca_case_id is not null;
create index if not exists asset_assurance_company_idx on public.organization_asset_assurance_links(organization_id,asset_id);
create or replace function public.validate_asset_assurance_link()
returns trigger language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from public.organization_assets a where a.id=new.asset_id and a.organization_id=new.organization_id) then
  raise exception 'The linked asset must belong to the selected company';
 end if;
 if new.rca_case_id is not null and not exists(
  select 1 from public.rca_cases c join public.organizations o on o.id=c.organization_id
  where c.id=new.rca_case_id and c.organization_id=new.organization_id and c.owner_id=o.owner_id
 ) then raise exception 'The corrective-action case must belong to the asset company'; end if;
 if new.finding_id is not null and not exists(
  select 1 from public.internal_audit_findings f join public.internal_audits a on a.id=f.audit_id
  join public.organizations o on o.id=a.organization_id
  where f.id=new.finding_id and a.organization_id=new.organization_id and f.owner_id=a.owner_id and a.owner_id=o.owner_id and f.finding_type in ('major_nc','minor_nc') and (to_jsonb(f)->>'organization_id' is null or to_jsonb(f)->>'organization_id'=new.organization_id::text)
 ) then raise exception 'The NC must belong to an audit in the asset company'; end if;
 return new;
end; $$;
drop trigger if exists validate_asset_assurance_link on public.organization_asset_assurance_links;
create trigger validate_asset_assurance_link before insert or update on public.organization_asset_assurance_links for each row execute function public.validate_asset_assurance_link();
alter table public.organization_asset_assurance_links enable row level security;
-- No browser grants/policies: authenticated server actions validate asset AND source access.
revoke all on public.organization_asset_assurance_links from public,anon,authenticated;
grant select,insert,delete on public.organization_asset_assurance_links to service_role;
comment on table public.organization_asset_assurance_links is 'Asset dashboard source links; server-authorised reads and writes only. Does not grant access to source records.';
commit;
