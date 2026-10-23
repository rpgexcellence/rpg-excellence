begin;
-- Service-side journal: metadata changes are captured atomically with the record.
create table if not exists public.hs_workplace_inspection_history (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 inspection_id uuid not null references public.hs_workplace_inspections(id) on delete cascade,
 event_type text not null,
 actor_user_id uuid references auth.users(id) on delete set null,
 reason text,
 before_values jsonb,
 after_values jsonb,
 created_at timestamptz not null default now()
);
create index if not exists hs_inspection_history_record_idx on public.hs_workplace_inspection_history(organization_id,inspection_id,created_at);
alter table public.hs_workplace_inspection_history enable row level security;
revoke all on public.hs_workplace_inspection_history from public,anon,authenticated;
grant select on public.hs_workplace_inspection_history to service_role;
alter table public.hs_workplace_inspections add column if not exists administration_change_reason text;
create or replace function public.log_workplace_inspection_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare before_record jsonb;after_record jsonb;keys text[]:=array['title','scope','planned_start_at','planned_end_at','lead_inspector_person_id','accountable_person_id','reviewer_person_id','status'];
begin
 select jsonb_object_agg(key,value) into after_record from jsonb_each(to_jsonb(new)) where key=any(keys);
 if tg_op='UPDATE' then
  select jsonb_object_agg(key,value) into before_record from jsonb_each(to_jsonb(old)) where key=any(keys);
  if before_record=after_record then return new;end if;
 end if;
 insert into public.hs_workplace_inspection_history(organization_id,inspection_id,event_type,actor_user_id,reason,before_values,after_values)
 values(new.organization_id,new.id,case when tg_op='INSERT' then 'scheduled' when new.status='in_progress' and old.status in ('planned','due','draft') then 'started' else 'record_updated' end,
 coalesce(new.updated_by_user_id,new.created_by_user_id),case when tg_op='UPDATE' and new.status=old.status then new.administration_change_reason else null end,before_record,after_record);
 return new;
end $$;
revoke all on function public.log_workplace_inspection_change() from public,anon,authenticated;
drop trigger if exists log_workplace_inspection_change on public.hs_workplace_inspections;
create trigger log_workplace_inspection_change after insert or update on public.hs_workplace_inspections for each row execute function public.log_workplace_inspection_change();

-- Lock the parent while saving responses so reassignment/review cannot race fieldwork.
create or replace function public.save_workplace_inspection_fieldwork(p_org uuid,p_inspection uuid,p_actor uuid,p_responses jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
declare record public.hs_workplace_inspections;actor_person uuid;item jsonb;controlled_count integer;seen_count integer;response_value text;comments_value text;justification_value text;requires_finding boolean;changed_count integer:=0;affected integer;
begin
 select * into record from public.hs_workplace_inspections where id=p_inspection and organization_id=p_org for update;
 if not found then raise exception 'Inspection not found';end if;
 select id into actor_person from public.organization_people where id=record.lead_inspector_person_id and organization_id=p_org and user_id=p_actor and account_status='active';
 if actor_person is null or record.status<>'in_progress' then raise exception 'Only the assigned lead inspector can save in-progress fieldwork';end if;
 if jsonb_typeof(p_responses)<>'array' then raise exception 'Invalid responses';end if;
 select count(*) into controlled_count from public.hs_workplace_inspection_responses where organization_id=p_org and inspection_id=p_inspection;
 select count(distinct value->>'id') into seen_count from jsonb_array_elements(p_responses);
 if controlled_count=0 or jsonb_array_length(p_responses)<>controlled_count or seen_count<>controlled_count then raise exception 'The question set changed; refresh the inspection';end if;
 for item in select value from jsonb_array_elements(p_responses) loop
  response_value:=item->>'response';comments_value:=nullif(trim(item->>'comments_actions'),'');justification_value:=nullif(trim(item->>'not_applicable_justification'),'');
  requires_finding:=response_value='no' or coalesce((item->>'finding_required')::boolean,false);
  if response_value is null or response_value not in ('not_assessed','yes','no','not_applicable') or length(coalesce(comments_value,''))>4000 or length(coalesce(justification_value,''))>2000 then raise exception 'Invalid response';end if;
  if response_value='no' and comments_value is null then raise exception 'Every No response requires an observation';end if;
  if response_value='not_applicable' and justification_value is null then raise exception 'Every N/A response requires justification';end if;
  if not exists(select 1 from public.hs_workplace_inspection_responses where id=(item->>'id')::uuid and organization_id=p_org and inspection_id=p_inspection) then raise exception 'Response does not belong to this inspection';end if;
  update public.hs_workplace_inspection_responses set response=response_value,comments_actions=comments_value,not_applicable_justification=justification_value,finding_required=requires_finding,
   assessed_by_person_id=case when response_value='not_assessed' then null else actor_person end,
   assessed_at=case when response_value='not_assessed' then null else clock_timestamp() end,updated_at=clock_timestamp()
   where id=(item->>'id')::uuid and organization_id=p_org and inspection_id=p_inspection
   and (response,comments_actions,not_applicable_justification,finding_required) is distinct from (response_value,comments_value,justification_value,requires_finding);
  get diagnostics affected=row_count;changed_count:=changed_count+affected;
 end loop;
 update public.hs_workplace_inspections set updated_by_user_id=p_actor,updated_at=clock_timestamp(),administration_change_reason=null where id=p_inspection and organization_id=p_org;
 insert into public.hs_workplace_inspection_history(organization_id,inspection_id,event_type,actor_user_id,after_values)
 values(p_org,p_inspection,'fieldwork_saved',p_actor,jsonb_build_object('changed_responses',changed_count,'assessor_person_id',actor_person));
 return true;
end $$;
revoke all on function public.save_workplace_inspection_fieldwork(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_workplace_inspection_fieldwork(uuid,uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
