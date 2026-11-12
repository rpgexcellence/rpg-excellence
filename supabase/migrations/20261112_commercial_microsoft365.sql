begin;
create table if not exists public.commercial_microsoft_connection(
 id text primary key check(id='primary'),mailbox text not null check(mailbox='info@rpgexcellence.com'),
 microsoft_user_id text not null,tokens text not null,expires_at timestamptz not null,
 connected_by uuid not null references auth.users(id),connected_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 lease_id uuid,lease_until timestamptz
);
create table if not exists public.commercial_outlook_drafts(
 id uuid primary key,prospect_id uuid not null references public.commercial_prospects(id),actor_id uuid not null references auth.users(id),
 fingerprint text not null,recipient text not null,subject text not null,body text not null,
 status text not null check(status in ('creating','draft','unknown')),microsoft_message_id text,outlook_url text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.commercial_microsoft_connection enable row level security;
alter table public.commercial_outlook_drafts enable row level security;
revoke all on public.commercial_microsoft_connection,public.commercial_outlook_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.commercial_microsoft_connection to service_role;
grant select,insert,update on public.commercial_outlook_drafts to service_role;
create or replace function public.claim_commercial_microsoft_refresh(p_actor uuid,p_lease uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare claimed public.commercial_microsoft_connection%rowtype;
begin
 if not public.commercial_actor_allowed(p_actor) or p_lease is null then raise exception 'Commercial account unavailable';end if;
 update public.commercial_microsoft_connection set lease_id=p_lease,lease_until=clock_timestamp()+interval '45 seconds'
 where id='primary' and (lease_until is null or lease_until<clock_timestamp()) returning * into claimed;
 if claimed.id is null then return null;end if;
 return to_jsonb(claimed);
end $$;
revoke all on function public.claim_commercial_microsoft_refresh(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_commercial_microsoft_refresh(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
select 'commercial_microsoft365' as check_name,has_function_privilege('service_role','public.claim_commercial_microsoft_refresh(uuid,uuid)','execute') as ready;
