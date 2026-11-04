-- Repository: supabase/migrations/20261104_audit_mandate_dates.sql
-- Adds date-change validation and atomic history to the existing audit register.
-- Does not change existing records, roles, entitlements or approvals.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
declare item record;
begin
  if to_regprocedure('auth.uid()') is null then
    raise exception 'The existing authenticated user identity function is missing';
  end if;
  for item in select * from (values
    ('internal_audits','id'),('internal_audits','owner_id'),
    ('internal_audits','organization_id'),('internal_audits','current_gate'),
    ('internal_audits','status'),('internal_audits','scope_approved'),
    ('internal_audits','plan_approved'),('internal_audits','planned_start_at'),
    ('internal_audits','planned_end_at'),
    ('internal_audit_schedule_items','audit_id'),('internal_audit_schedule_items','owner_id'),
    ('internal_audit_schedule_items','starts_at'),('internal_audit_schedule_items','ends_at'),
    ('internal_audit_events','owner_id'),('internal_audit_events','audit_id'),
    ('internal_audit_events','event_type'),('internal_audit_events','summary'),
    ('internal_audit_events','event_data'),('internal_audit_events','created_by')
  ) as x(table_name,column_name) loop
    if not exists(select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=item.table_name and c.column_name=item.column_name) then
      raise exception 'Missing prerequisite: %.%. All changes will roll back.',item.table_name,item.column_name;
    end if;
  end loop;
end $preflight$;

create or replace function public.control_internal_audit_planned_dates()
returns trigger language plpgsql security definer set search_path='' as $function$
declare actor uuid := auth.uid();
begin
  if old.planned_start_at is not distinct from new.planned_start_at
     and old.planned_end_at is not distinct from new.planned_end_at then
    return null;
  end if;

  -- Reuse the audit's existing owner-bound editing authority. No email bypasses.
  if actor is null or actor is distinct from old.owner_id
     or new.owner_id is distinct from old.owner_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'AUDIT_MANDATE_DATES_ACCESS';
  end if;
  if old.current_gate is distinct from 'scope'
     or old.status not in ('draft','scope_review') or old.status is null
     or coalesce(old.scope_approved,false) or coalesce(old.plan_approved,false) then
    raise exception 'AUDIT_MANDATE_DATES_LOCKED';
  end if;
  if new.planned_start_at is null or new.planned_end_at is null
     or not isfinite(new.planned_start_at) or not isfinite(new.planned_end_at)
     or new.planned_end_at <= new.planned_start_at then
    raise exception 'AUDIT_MANDATE_DATES_ORDER';
  end if;
  if exists(select 1 from public.internal_audit_schedule_items s
    where s.audit_id=old.id and s.owner_id=old.owner_id
      and (s.starts_at is null or s.ends_at is null
        or s.starts_at < new.planned_start_at or s.ends_at > new.planned_end_at)) then
    raise exception 'AUDIT_MANDATE_DATES_AGENDA';
  end if;

  -- This history insert and the original update commit or roll back together.
  insert into public.internal_audit_events
    (owner_id,audit_id,event_type,summary,event_data,created_by)
  values(old.owner_id,old.id,
    case when coalesce(new.scope_approved,false) then 'scope_approved' else 'scope_updated' end,
    case when coalesce(new.scope_approved,false) then 'Audit scope approved with revised planned dates' else 'Draft audit planned dates updated' end,
    jsonb_build_object('gate',new.current_gate,'planned_dates_changed',true,
      'before',jsonb_build_object('planned_start_at',old.planned_start_at,'planned_end_at',old.planned_end_at),
      'after',jsonb_build_object('planned_start_at',new.planned_start_at,'planned_end_at',new.planned_end_at)),
    actor);
  return null;
end $function$;

revoke all on function public.control_internal_audit_planned_dates() from public,anon,authenticated,service_role;
drop trigger if exists internal_audit_planned_dates_control on public.internal_audits;
create trigger internal_audit_planned_dates_control
after update of planned_start_at,planned_end_at on public.internal_audits
for each row execute function public.control_internal_audit_planned_dates();
comment on function public.control_internal_audit_planned_dates() is
  'Existing audit-owner authority only: draft Scope dates may change; approved dates stay protected; incompatible agenda rows block the change; history is atomic.';
notify pgrst,'reload schema';
commit;

select 'Draft audit planned-date validation and atomic history' as control,'READY' as status;
