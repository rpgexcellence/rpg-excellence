begin;
create table if not exists public.commercial_prospects(
 id uuid primary key default gen_random_uuid(),company_key text not null unique,record jsonb not null,
 revision integer not null default 1,created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 check(jsonb_typeof(record)='object' and length(trim(record->>'company')) between 1 and 200)
);
create table if not exists public.commercial_import_batches(
 id uuid primary key default gen_random_uuid(),batch_key text not null unique,actor_id uuid not null references auth.users(id),
 inserted_count integer not null default 0,skipped_count integer not null default 0,created_at timestamptz not null default clock_timestamp()
);
create table if not exists public.commercial_prospect_events(
 id uuid primary key default gen_random_uuid(),prospect_id uuid not null references public.commercial_prospects(id),actor_id uuid not null references auth.users(id),
 event_type text not null,revision integer not null,event_data jsonb not null,created_at timestamptz not null default clock_timestamp()
);
alter table public.commercial_prospects enable row level security;
alter table public.commercial_import_batches enable row level security;
alter table public.commercial_prospect_events enable row level security;
-- Commercial data is served only by authenticated server routes for the two accounts.
revoke all on public.commercial_prospects,public.commercial_import_batches,public.commercial_prospect_events from anon,authenticated;
grant select,insert,update on public.commercial_prospects,public.commercial_import_batches to service_role;
grant select,insert on public.commercial_prospect_events to service_role;
create or replace function public.commercial_actor_allowed(p_actor uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null and lower(email) in ('r.pereszczako@sky.com','info@rpgexcellence.com'));
$$;
revoke all on function public.commercial_actor_allowed(uuid) from public,anon,authenticated;
grant execute on function public.commercial_actor_allowed(uuid) to service_role;
create or replace function public.save_commercial_prospect(p_actor uuid,p_id uuid,p_key text,p_record jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare saved public.commercial_prospects%rowtype;previous public.commercial_prospects%rowtype;
begin
 if not public.commercial_actor_allowed(p_actor) then raise exception 'Commercial account unavailable';end if;
 if p_key is null or length(p_key) not between 1 and 300 or p_record is null or jsonb_typeof(p_record)<>'object' or coalesce(length(trim(p_record->>'company')),0) not between 1 and 200 or octet_length(p_record::text)>100000 then raise exception 'Invalid company data';end if;
 if p_id is null then
  insert into public.commercial_prospects(company_key,record,created_by,updated_by) values(p_key,p_record,p_actor,p_actor) returning * into saved;
 else
  select * into previous from public.commercial_prospects where id=p_id for update;
  if previous.id is null then raise exception 'Company unavailable';end if;
  if previous.revision<>p_expected_revision then raise exception 'Company changed in another session';end if;
  update public.commercial_prospects set company_key=p_key,record=p_record,revision=revision+1,updated_by=p_actor,updated_at=clock_timestamp() where id=p_id returning * into saved;
 end if;
 insert into public.commercial_prospect_events(prospect_id,actor_id,event_type,revision,event_data)
 values(saved.id,p_actor,case when p_id is null then 'created' else 'updated' end,saved.revision,jsonb_build_object('previous',previous.record,'saved',saved.record));
 return to_jsonb(saved);
end $$;
revoke all on function public.save_commercial_prospect(uuid,uuid,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.save_commercial_prospect(uuid,uuid,text,jsonb,integer) to service_role;
create or replace function public.import_commercial_prospects(p_actor uuid,p_records jsonb,p_batch_key text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare batch public.commercial_import_batches%rowtype;item jsonb;saved public.commercial_prospects%rowtype;inserted integer:=0;skipped integer:=0;
begin
 if not public.commercial_actor_allowed(p_actor) then raise exception 'Commercial account unavailable';end if;
 if p_records is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records) not between 1 and 500 or p_batch_key !~ '^[0-9a-f]{64}$' or octet_length(p_records::text)>2000000 then raise exception 'Invalid research batch';end if;
 -- The unique batch key serialises repeat submissions; imports never overwrite prior work.
 insert into public.commercial_import_batches(batch_key,actor_id) values(p_batch_key,p_actor) on conflict(batch_key) do nothing returning * into batch;
 if batch.id is null then select * into batch from public.commercial_import_batches where batch_key=p_batch_key;return jsonb_build_object('inserted',0,'skipped',jsonb_array_length(p_records),'already_imported',true,'batch_id',batch.id);end if;
 for item in select * from jsonb_array_elements(p_records) loop
  if length(coalesce(item->>'company_key','')) not between 1 and 300 or jsonb_typeof(item->'record')<>'object' or coalesce(length(trim(item->'record'->>'company')),0) not between 1 and 200 or octet_length((item->'record')::text)>100000 then raise exception 'Invalid company in research batch';end if;
  insert into public.commercial_prospects(company_key,record,created_by,updated_by) values(item->>'company_key',item->'record',p_actor,p_actor) on conflict(company_key) do nothing returning * into saved;
  if found then
   inserted:=inserted+1;
   insert into public.commercial_prospect_events(prospect_id,actor_id,event_type,revision,event_data) values(saved.id,p_actor,'imported',saved.revision,jsonb_build_object('batch_id',batch.id,'saved',saved.record));
  else skipped:=skipped+1;
  end if;
 end loop;
 update public.commercial_import_batches set inserted_count=inserted,skipped_count=skipped where id=batch.id;
 return jsonb_build_object('inserted',inserted,'skipped',skipped,'already_imported',false,'batch_id',batch.id);
end $$;
revoke all on function public.import_commercial_prospects(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.import_commercial_prospects(uuid,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
select 'commercial_register' as check_name,has_function_privilege('service_role','public.import_commercial_prospects(uuid,jsonb,text)','execute') as ready;
