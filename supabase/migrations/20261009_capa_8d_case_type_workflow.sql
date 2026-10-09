-- Separate CAPA and 8D case types while retaining the established 8D engine.

alter table public.rca_cases
  add column if not exists case_type text not null default '8d',
  add column if not exists capa_current_stage text;

update public.rca_cases set case_type='8d' where case_type is null;

alter table public.rca_cases drop constraint if exists rca_cases_case_type_check;
alter table public.rca_cases add constraint rca_cases_case_type_check
  check (case_type in ('capa','8d'));

alter table public.rca_cases drop constraint if exists rca_cases_capa_current_stage_check;
alter table public.rca_cases add constraint rca_cases_capa_current_stage_check
  check (capa_current_stage is null or capa_current_stage in
    ('correction','cause_analysis','corrective_action','effectiveness_review','closed'));

create table if not exists public.rca_capa_stages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.rca_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in
    ('correction','cause_analysis','corrective_action','effectiveness_review')),
  stage_order integer not null check (stage_order between 1 and 4),
  narrative text,
  evidence_reference text,
  decision text,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_id,stage),
  unique(case_id,stage_order)
);

create index if not exists rca_capa_stages_case_idx on public.rca_capa_stages(case_id,stage_order);
alter table public.rca_capa_stages enable row level security;
grant select,insert,update,delete on public.rca_capa_stages to authenticated;

drop policy if exists "Users manage own CAPA stages" on public.rca_capa_stages;
create policy "Users manage own CAPA stages" on public.rca_capa_stages
  for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

create or replace function public.initialise_capa_stages() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.case_type='capa' then
    new.capa_current_stage=coalesce(new.capa_current_stage,'correction');
  end if;
  return new;
end $$;

drop trigger if exists rca_cases_initialise_capa on public.rca_cases;
create trigger rca_cases_initialise_capa before insert or update of case_type on public.rca_cases
  for each row execute function public.initialise_capa_stages();

-- Existing assessment-generated CAPA records are identified from their controlled route.
update public.rca_cases c
set case_type='capa', capa_current_stage=coalesce(c.capa_current_stage,'correction')
from public.assessment_findings f
where c.assessment_finding_id=f.id and f.treatment_route='capa';

insert into public.rca_capa_stages(case_id,owner_id,stage,stage_order)
select c.id,c.owner_id,s.stage,s.stage_order
from public.rca_cases c
cross join (values
  ('correction',1),('cause_analysis',2),('corrective_action',3),('effectiveness_review',4)
) as s(stage,stage_order)
where c.case_type='capa'
on conflict(case_id,stage) do nothing;

create or replace function public.seed_capa_stages() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.case_type='capa' then
    insert into public.rca_capa_stages(case_id,owner_id,stage,stage_order)
    values (new.id,new.owner_id,'correction',1),(new.id,new.owner_id,'cause_analysis',2),
      (new.id,new.owner_id,'corrective_action',3),(new.id,new.owner_id,'effectiveness_review',4)
    on conflict(case_id,stage) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists rca_cases_seed_capa_stages on public.rca_cases;
create trigger rca_cases_seed_capa_stages after insert or update of case_type on public.rca_cases
  for each row execute function public.seed_capa_stages();
