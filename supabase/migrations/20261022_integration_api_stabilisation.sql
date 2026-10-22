-- Stabilise the released read API. Apply after the existing integration foundation.
-- This does not grant portal roles, change subscriptions, or assign ambiguous legacy records.
begin;
do $$ declare tab text; begin
 foreach tab in array array['integration_api_clients','integration_events','organizations','internal_audits','internal_audit_findings','rca_cases','isms_security_incidents'] loop
  if to_regclass('public.'||tab) is null then raise exception 'Required table public.% is missing; apply the existing module migrations first.',tab;end if;
 end loop;
end $$;
alter table public.integration_api_clients add column if not exists requests_per_minute integer not null default 60 check(requests_per_minute between 1 and 10000);
alter table public.integration_events add column if not exists external_request_id text check(length(external_request_id)<=128);
alter table public.integration_api_clients drop constraint if exists integration_api_permissions_valid;
-- Generated from lib/integration-policy.mjs, retaining already-issued legacy metadata.
alter table public.integration_api_clients add constraint integration_api_permissions_valid check(permissions <@ array[
 'audits:read','findings:read','capa:read','assets:read','suppliers:read','people:read','workplace_inspections:read','security_incidents:read','security_incidents:detail',
 'audits:write','findings:write','capa:write','assets:write','suppliers:write','webhooks:manage']::text[]);
create table if not exists public.integration_api_limits(
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 requests_per_minute integer not null default 300 check(requests_per_minute between 1 and 100000)
);
create table if not exists public.integration_request_buckets(
 organization_id uuid not null references public.organizations(id) on delete cascade,
 bucket_key text not null,window_start timestamptz not null,request_count integer not null default 0 check(request_count>=0),
 primary key(organization_id,bucket_key,window_start)
);
create index if not exists integration_buckets_expiry_idx on public.integration_request_buckets(window_start);
alter table public.integration_api_limits enable row level security;
alter table public.integration_request_buckets enable row level security;
revoke all on public.integration_api_limits,public.integration_request_buckets from public,anon,authenticated;
grant select,insert,update,delete on public.integration_api_limits,public.integration_request_buckets to service_role;
create or replace function public.reserve_integration_request(p_client uuid,p_org uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare win timestamptz:=date_trunc('minute',clock_timestamp());key_limit integer;org_limit integer;key_used integer;org_used integer;reset_epoch bigint;allowed boolean;
begin
 select c.requests_per_minute into key_limit from public.integration_api_clients c join public.organizations o on o.id=c.organization_id and o.owner_id=c.owner_id
 where c.id=p_client and c.organization_id=p_org and c.active and c.revoked_at is null and (c.expires_at is null or c.expires_at>clock_timestamp());
 if not found then raise exception 'Active organisation-bound API client required';end if;
 perform pg_advisory_xact_lock(hashtextextended('integration-budget:'||p_org::text,0));
 select requests_per_minute into org_limit from public.integration_api_limits where organization_id=p_org;
 org_limit:=coalesce(org_limit,300);
 delete from public.integration_request_buckets where organization_id=p_org and window_start<win-interval '24 hours';
 insert into public.integration_request_buckets(organization_id,bucket_key,window_start) values(p_org,'organisation',win),(p_org,p_client::text,win) on conflict do nothing;
 select request_count into key_used from public.integration_request_buckets where organization_id=p_org and bucket_key=p_client::text and window_start=win;
 select request_count into org_used from public.integration_request_buckets where organization_id=p_org and bucket_key='organisation' and window_start=win;
 allowed:=key_used<key_limit and org_used<org_limit;
 if allowed then
  update public.integration_request_buckets set request_count=request_count+1 where organization_id=p_org and bucket_key in ('organisation',p_client::text) and window_start=win;
  key_used:=key_used+1;org_used:=org_used+1;
 end if;
 reset_epoch:=extract(epoch from win+interval '1 minute')::bigint;
 return jsonb_build_object('allowed',allowed,'client_limit',key_limit,'client_remaining',greatest(0,key_limit-key_used),'organization_limit',org_limit,'organization_remaining',greatest(0,org_limit-org_used),'reset_at',reset_epoch,'retry_after',greatest(1,ceil(extract(epoch from win+interval '1 minute'-clock_timestamp()))::integer));
end $$;
revoke all on function public.reserve_integration_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_integration_request(uuid,uuid) to service_role;

-- Findings did not consistently carry a tenant key. Derive only from an explicit parent audit.
alter table public.internal_audit_findings add column if not exists organization_id uuid references public.organizations(id);
update public.internal_audit_findings f set organization_id=a.organization_id
from public.internal_audits a where f.audit_id=a.id and f.owner_id=a.owner_id and f.organization_id is null and a.organization_id is not null;
create index if not exists integration_findings_org_idx on public.internal_audit_findings(organization_id,created_at,id);
create or replace function public.integration_finding_tenant() returns trigger language plpgsql security definer set search_path=public as $$
declare parent_org uuid;parent_owner uuid;
begin
 if new.audit_id is not null then
  select organization_id,owner_id into parent_org,parent_owner from public.internal_audits where id=new.audit_id;
  if parent_owner is distinct from new.owner_id then raise exception 'Finding owner must match its parent audit';end if;
  if new.organization_id is not null and new.organization_id is distinct from parent_org then raise exception 'Finding organisation must match its parent audit';end if;
  new.organization_id:=parent_org;
 elsif new.organization_id is not null and not exists(select 1 from public.organizations where id=new.organization_id and owner_id=new.owner_id) then
  raise exception 'A standalone finding needs an explicit owner-matched organisation';
 end if;
 return new;
end $$;
drop trigger if exists integration_finding_tenant on public.internal_audit_findings;
create trigger integration_finding_tenant before insert or update of audit_id,owner_id,organization_id on public.internal_audit_findings for each row execute function public.integration_finding_tenant();
revoke all on function public.integration_finding_tenant() from public,anon,authenticated;
-- Conflicting historic assignments fail closed in the export view without rewriting them.
create or replace view public.integration_finding_export as
 select f.* from public.internal_audit_findings f
 where f.organization_id is not null and (
  (f.audit_id is not null and exists(select 1 from public.internal_audits a where a.id=f.audit_id and a.organization_id=f.organization_id and a.owner_id=f.owner_id))
  or (f.audit_id is null and exists(select 1 from public.organizations o where o.id=f.organization_id and o.owner_id=f.owner_id))
 );
revoke all on public.integration_finding_export from public,anon,authenticated;
grant select on public.integration_finding_export to service_role;
notify pgrst,'reload schema';
commit;
