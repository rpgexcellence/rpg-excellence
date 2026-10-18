begin;

create table if not exists public.hs_inspection_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_code text not null,
  title text not null,
  inspection_type text not null default 'workplace'
    check (inspection_type in ('workplace','laboratory','workshop','office','warehouse','external_area','leadership_walkaround','custom')),
  version integer not null default 1 check (version > 0),
  status text not null default 'active'
    check (status in ('draft','active','superseded','archived')),
  scope text,
  guidance text,
  is_system_template boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id,template_code,version)
);

create table if not exists public.hs_inspection_template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.hs_inspection_templates(id) on delete cascade,
  section_code text not null,
  section_title text not null,
  question_code text not null,
  question_text text not null,
  legislation_guidance text,
  inspector_guidance text,
  response_type text not null default 'yes_no_na'
    check (response_type in ('yes_no_na','pass_fail_na','text','number','date')),
  requires_comment_on_failure boolean not null default true,
  allows_evidence boolean not null default true,
  display_order integer not null,
  active boolean not null default true,
  unique (template_id,question_code)
);

create table if not exists public.hs_inspection_programmes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  programme_reference text not null,
  title text not null,
  template_id uuid not null references public.hs_inspection_templates(id) on delete restrict,
  administration_location_id text not null,
  administration_location_label text not null,
  area_department text,
  accountable_person_id uuid not null references public.organization_people(id) on delete restrict,
  lead_inspector_person_id uuid not null references public.organization_people(id) on delete restrict,
  reviewer_person_id uuid not null references public.organization_people(id) on delete restrict,
  frequency_amount integer not null default 1 check (frequency_amount > 0),
  frequency_unit text not null default 'months'
    check (frequency_unit in ('days','weeks','months','years')),
  last_inspection_date date,
  next_inspection_date date not null,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  risk_band text not null default 'routine'
    check (risk_band in ('routine','medium','high','critical')),
  planning_basis text,
  status text not null default 'active'
    check (status in ('draft','active','paused','archived')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,programme_reference)
);

create table if not exists public.hs_inspection_risk_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  programme_id uuid references public.hs_inspection_programmes(id) on delete cascade,
  administration_location_id text,
  source_module text not null
    check (source_module in ('workplace_inspection','internal_audit','accident','incident','risk_assessment','powra','permit','moc','asset','manual')),
  source_record_id uuid,
  source_reference text,
  signal_type text not null,
  summary text not null,
  severity integer not null default 1 check (severity between 1 and 5),
  likelihood integer not null default 1 check (likelihood between 1 and 5),
  weighting integer not null default 1 check (weighting between 1 and 5),
  signal_score integer generated always as (least(100,severity * likelihood * weighting)) stored,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hs_workplace_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  programme_id uuid references public.hs_inspection_programmes(id) on delete set null,
  template_id uuid not null references public.hs_inspection_templates(id) on delete restrict,
  inspection_reference text not null,
  title text not null,
  inspection_type text not null default 'workplace',
  administration_location_id text not null,
  administration_location_label text not null,
  area_department text,
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'planned'
    check (status in ('draft','planned','due','in_progress','awaiting_review','actions_open','awaiting_verification','completed','cancelled')),
  lead_inspector_person_id uuid not null references public.organization_people(id) on delete restrict,
  accountable_person_id uuid not null references public.organization_people(id) on delete restrict,
  reviewer_person_id uuid not null references public.organization_people(id) on delete restrict,
  previous_inspection_id uuid references public.hs_workplace_inspections(id) on delete set null,
  planning_risk_score integer not null default 0 check (planning_risk_score between 0 and 100),
  planning_risk_band text not null default 'routine'
    check (planning_risk_band in ('routine','medium','high','critical')),
  planning_basis text,
  scope text,
  other_observations text,
  overall_conclusion text,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,inspection_reference)
);

create table if not exists public.hs_workplace_inspection_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.hs_workplace_inspections(id) on delete cascade,
  template_question_id uuid references public.hs_inspection_template_questions(id) on delete set null,
  question_code text not null,
  section_code text not null,
  section_title text not null,
  question_text text not null,
  legislation_guidance text,
  inspector_guidance text,
  response text not null default 'not_assessed'
    check (response in ('not_assessed','yes','no','not_applicable')),
  comments_actions text,
  not_applicable_justification text,
  finding_required boolean not null default false,
  assessed_by_person_id uuid references public.organization_people(id) on delete set null,
  assessed_at timestamptz,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inspection_id,question_code)
);

create table if not exists public.hs_workplace_inspection_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.hs_workplace_inspections(id) on delete cascade,
  response_id uuid references public.hs_workplace_inspection_responses(id) on delete set null,
  finding_reference text not null,
  title text not null,
  description text not null,
  finding_type text not null default 'unsafe_condition'
    check (finding_type in ('immediate_danger','unsafe_condition','unsafe_act','nonconformity','environmental','positive_practice','opportunity_for_improvement')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  severity integer not null default 1 check (severity between 1 and 5),
  likelihood integer not null default 1 check (likelihood between 1 and 5),
  risk_score integer generated always as (severity * likelihood) stored,
  immediate_action_taken text,
  stop_work_applied boolean not null default false,
  linked_risk_assessment_id uuid references public.hs_risk_assessments(id) on delete set null,
  linked_internal_audit_finding_id uuid references public.internal_audit_findings(id) on delete set null,
  linked_moc_id uuid references public.hs_moc_changes(id) on delete set null,
  linked_permit_id uuid references public.hs_permits(id) on delete set null,
  linked_powra_id uuid references public.hs_powra_assessments(id) on delete set null,
  status text not null default 'open'
    check (status in ('open','assigned','in_progress','evidence_submitted','awaiting_verification','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,finding_reference)
);

create table if not exists public.hs_workplace_inspection_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.hs_workplace_inspections(id) on delete cascade,
  finding_id uuid not null references public.hs_workplace_inspection_findings(id) on delete cascade,
  action_reference text not null,
  action_text text not null,
  priority text not null check (priority in ('low','medium','high','critical')),
  responsible_person_id uuid not null references public.organization_people(id) on delete restrict,
  verifier_person_id uuid not null references public.organization_people(id) on delete restrict,
  allocated_date date not null default current_date,
  target_date date not null,
  completed_at timestamptz,
  completion_summary text,
  verification_result text not null default 'pending'
    check (verification_result in ('pending','effective','partly_effective','not_effective')),
  verification_summary text,
  verified_at timestamptz,
  status text not null default 'open'
    check (status in ('open','accepted','in_progress','evidence_submitted','awaiting_verification','closed','cancelled')),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,action_reference),
  check (responsible_person_id <> verifier_person_id)
);

create table if not exists public.hs_workplace_inspection_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inspection_id uuid not null references public.hs_workplace_inspections(id) on delete cascade,
  response_id uuid references public.hs_workplace_inspection_responses(id) on delete cascade,
  finding_id uuid references public.hs_workplace_inspection_findings(id) on delete cascade,
  action_id uuid references public.hs_workplace_inspection_actions(id) on delete cascade,
  evidence_type text not null default 'photograph'
    check (evidence_type in ('photograph','document','record','interview','observation','measurement','test_result','other')),
  title text not null,
  description text,
  storage_path text,
  original_file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes between 1 and 10485760),
  external_url text,
  captured_offline boolean not null default false,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create index if not exists hs_inspection_programmes_due_idx
  on public.hs_inspection_programmes(organization_id,status,next_inspection_date);
create index if not exists hs_inspection_programmes_people_idx
  on public.hs_inspection_programmes(organization_id,lead_inspector_person_id,accountable_person_id,reviewer_person_id);
create index if not exists hs_inspection_signals_programme_idx
  on public.hs_inspection_risk_signals(programme_id,active,occurred_at desc);
create index if not exists hs_inspections_calendar_idx
  on public.hs_workplace_inspections(organization_id,planned_start_at,status);
create index if not exists hs_inspections_people_idx
  on public.hs_workplace_inspections(organization_id,lead_inspector_person_id,accountable_person_id,reviewer_person_id);
create index if not exists hs_inspection_actions_due_idx
  on public.hs_workplace_inspection_actions(organization_id,status,target_date);
create index if not exists hs_inspection_actions_people_idx
  on public.hs_workplace_inspection_actions(organization_id,responsible_person_id,verifier_person_id);

create or replace function public.validate_workplace_inspection_people()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.assert_active_organisation_person(new.accountable_person_id,new.organization_id,'Accountable owner');
  perform public.assert_active_organisation_person(new.lead_inspector_person_id,new.organization_id,'Lead inspector');
  perform public.assert_active_organisation_person(new.reviewer_person_id,new.organization_id,'Inspection reviewer');
  if new.lead_inspector_person_id=new.reviewer_person_id then
    raise exception 'The lead inspector cannot independently review their own inspection';
  end if;
  return new;
end $$;

create or replace function public.validate_workplace_inspection_action_people()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.validate_task_people(new.organization_id,new.responsible_person_id,new.verifier_person_id);
  return new;
end $$;

drop trigger if exists hs_inspection_programmes_validate_people on public.hs_inspection_programmes;
create trigger hs_inspection_programmes_validate_people before insert or update of accountable_person_id,lead_inspector_person_id,reviewer_person_id
on public.hs_inspection_programmes for each row execute function public.validate_workplace_inspection_people();

drop trigger if exists hs_workplace_inspections_validate_people on public.hs_workplace_inspections;
create trigger hs_workplace_inspections_validate_people before insert or update of accountable_person_id,lead_inspector_person_id,reviewer_person_id
on public.hs_workplace_inspections for each row execute function public.validate_workplace_inspection_people();

drop trigger if exists hs_workplace_inspection_actions_validate_people on public.hs_workplace_inspection_actions;
create trigger hs_workplace_inspection_actions_validate_people before insert or update of responsible_person_id,verifier_person_id
on public.hs_workplace_inspection_actions for each row execute function public.validate_workplace_inspection_action_people();

create or replace function public.workplace_inspection_priority(target_programme uuid)
returns table(risk_score integer,risk_band text,recommended_date date)
language plpgsql security definer set search_path=public as $$
declare
  programme public.hs_inspection_programmes%rowtype;
  total_score integer;
  adjusted_date date;
begin
  select * into programme from public.hs_inspection_programmes where id=target_programme;
  if not found then raise exception 'Inspection programme not found'; end if;

  select least(100,coalesce(sum(signal_score),0))::integer into total_score
  from public.hs_inspection_risk_signals
  where programme_id=target_programme and active=true
    and (expires_at is null or expires_at>now());

  adjusted_date := case
    when total_score>=60 then current_date+7
    when total_score>=40 then current_date+30
    when total_score>=20 then current_date+90
    when programme.frequency_unit='days' then coalesce(programme.last_inspection_date,current_date)+(programme.frequency_amount||' days')::interval
    when programme.frequency_unit='weeks' then coalesce(programme.last_inspection_date,current_date)+(programme.frequency_amount||' weeks')::interval
    when programme.frequency_unit='years' then coalesce(programme.last_inspection_date,current_date)+(programme.frequency_amount||' years')::interval
    else coalesce(programme.last_inspection_date,current_date)+(programme.frequency_amount||' months')::interval
  end;

  return query select total_score,
    case when total_score>=60 then 'critical' when total_score>=40 then 'high' when total_score>=20 then 'medium' else 'routine' end,
    least(programme.next_inspection_date,adjusted_date);
end $$;

insert into public.hs_inspection_templates
  (organization_id,template_code,title,inspection_type,version,status,scope,guidance,is_system_template)
values
  (null,'RPG-WPI-LAB','Workplace Inspection Laboratory','laboratory',1,'active',
   'Laboratories, technical work areas, associated offices, welfare facilities and external areas.',
   'Use the question bank as a structured inspection guide. Escalate immediate danger without waiting for inspection completion.',true)
on conflict (organization_id,template_code,version) do update set
  title=excluded.title,status='active',scope=excluded.scope,guidance=excluded.guidance,is_system_template=true;

with template as (
  select id from public.hs_inspection_templates
  where organization_id is null and template_code='RPG-WPI-LAB' and version=1
), questions(section_code,section_title,question_code,question_text,legislation_guidance,inspector_guidance,display_order) as (values
  ('A','General Housekeeping and Work Environment','A1','Floors, walkways, corridors and exits are clean, dry and free of obstruction or trip hazards.','Workplace (Health, Safety and Welfare) Regulations 1992','Check spills, trailing cables, clutter, uneven surfaces, access routes and fire exits.',10),
  ('A','General Housekeeping and Work Environment','A2','Lighting, temperature and ventilation are adequate.','Workplace (Health, Safety and Welfare) Regulations 1992','Check lighting, airflow, temperature, condensation and stuffy areas.',20),
  ('A','General Housekeeping and Work Environment','A3','Waste bins are available, emptied and correctly segregated.','COSHH 2002; Environmental Protection Act 1990','Check bin provision, overflow, labelling and segregation.',30),
  ('A','General Housekeeping and Work Environment','A4','Restricted and hazardous-area signage is clearly displayed and current.','Health and Safety (Safety Signs and Signals) Regulations 1996','Check for missing, damaged, ambiguous or outdated signs.',40),
  ('A','General Housekeeping and Work Environment','A5','Noise conditions are acceptable and controls remain effective.','Control of Noise at Work Regulations 2005','Observe noise sources and verify hearing protection and monitoring where required.',50),
  ('B','Emergency Equipment and Procedures','B1','Fire-fighting equipment is maintained, fire doors operate correctly and emergency exits are clear.','Regulatory Reform (Fire Safety) Order 2005','Check access, service tags, doors, escape routes and final exits.',60),
  ('B','Emergency Equipment and Procedures','B2','Spill kits and first-aid provisions are available, accessible and maintained.','COSHH 2002; Health and Safety (First-Aid) Regulations 1981','Check stock, seals, expiry dates, signage and accessibility.',70),
  ('B','Emergency Equipment and Procedures','B3','Workers understand emergency procedures and emergency contacts are displayed.','Management of Health and Safety at Work Regulations 1999','Ask a sample of workers to explain alarms, evacuation, assembly and reporting arrangements.',80),
  ('B','Emergency Equipment and Procedures','B4','Emergency eyewash and safety showers are accessible, functional and inspected.','COSHH 2002','Inspect condition, access, flushing arrangements and inspection records.',90),
  ('C','Office and Workstation Safety','C1','Workstations are ergonomically suitable and applicable DSE assessments are complete.','Health and Safety (Display Screen Equipment) Regulations 1992','Sample chair, screen, keyboard and workstation arrangements and review DSE records.',100),
  ('C','Office and Workstation Safety','C2','Electrical cables and supplies are safely managed with no exposed wiring or overloading.','Electricity at Work Regulations 1989','Inspect cables, sockets, extensions, adapters and visible damage.',110),
  ('C','Office and Workstation Safety','C3','Shelving and storage are secure, and suitable inspected access equipment is provided.','PUWER 1998; Work at Height Regulations 2005','Check shelving stability, loading, access and ladder or step-stool inspection status.',120),
  ('C','Office and Workstation Safety','C4','Portable heaters and fans are authorised, positioned and used safely.','Workplace (Health, Safety and Welfare) Regulations 1992','Check authorisation, condition, clearances and proximity to combustible material.',130),
  ('D','Equipment Safety','D1','Work equipment is in good condition, maintained and provided with effective guards.','PUWER 1998','Check guards, condition, defects, maintenance records and safe operation.',140),
  ('D','Equipment Safety','D2','Portable electrical equipment inspection or testing remains in date where required.','Electricity at Work Regulations 1989','Check labels, inspection regime and evidence of defect management.',150),
  ('D','Equipment Safety','D3','Lifting equipment and accessories are inspected, identified and stored correctly.','LOLER 1998','Verify tags, examination dates, identification and storage.',160),
  ('E','Laboratory and Technical Safety','E1','COSHH assessments are available and chemical storage, labelling and waste controls are effective.','COSHH 2002; Environmental Protection Act 1990','Review assessments, compatibility, segregation, labels, expiry dates and disposal routes.',170),
  ('E','Laboratory and Technical Safety','E2','Gas cylinders are secured, fittings are suitable and leak-testing controls are implemented.','DSEAR 2002','Check restraints, caps, identification, regulators, fittings and leak-test records.',180),
  ('E','Laboratory and Technical Safety','E3','Fume cupboards and local extraction controls are certified and serviceable.','COSHH 2002','Inspect certification, indicators, airflow status and examination labels.',190),
  ('E','Laboratory and Technical Safety','E4','PPE is suitable, available, maintained and worn correctly.','Personal Protective Equipment at Work Regulations 1992','Check suitability against risk assessments, condition, availability and actual use.',200),
  ('E','Laboratory and Technical Safety','E5','Sharps and biological hazards are contained, stored and disposed of safely.','COSHH 2002','Check sharps containers, labelling, storage, containment and disposal.',210),
  ('E','Laboratory and Technical Safety','E6','Laboratory benches and work surfaces are clean, organised and free from contamination.','COSHH 2002','Check contamination, residue, storage and housekeeping standards.',220),
  ('E','Laboratory and Technical Safety','E7','Machine tools are safe and applicable radiation equipment is registered and controlled.','PUWER 1998; Ionising Radiations Regulations 2017','Inspect machine condition, swarf, consumable expiry, authorisation and radiation records.',230),
  ('E','Laboratory and Technical Safety','E8','Authorised users are identified, trained and competent for the equipment and activities observed.','PUWER 1998; Management of Health and Safety at Work Regulations 1999','Verify authorised-user lists, competence records, supervision and refresher requirements.',240),
  ('F','Worker Engagement and Communication','F1','Safety notices and local instructions are visible, current and relevant.','Health and Safety (Safety Signs and Signals) Regulations 1996','Check revision status, condition, location and relevance.',250),
  ('F','Worker Engagement and Communication','F2','Workers understand how to report hazards, near misses, incidents and emergencies.','Management of Health and Safety at Work Regulations 1999','Ask a representative sample to describe reporting and escalation routes.',260),
  ('F','Worker Engagement and Communication','F3','Toolbox talks and safety briefings are current and relevant to the work.','Management of Health and Safety at Work Regulations 1999','Review attendance, content, frequency and evidence that learning is applied.',270),
  ('G','Environmental Controls','G1','Waste is correctly segregated and external waste containers are controlled.','Environmental Protection Act 1990; Waste (England and Wales) Regulations 2011','Check bins, skips, labels, contamination and containment.',280),
  ('G','Environmental Controls','G2','There is no uncontrolled leakage or contamination and appropriate energy-saving practices are evident.','Environmental Protection Act 1990; Workplace (Health, Safety and Welfare) Regulations 1992','Inspect for spills and leaks and observe unnecessary energy use.',290),
  ('G','Environmental Controls','G3','Ventilation and air quality are acceptable for the activities undertaken.','Workplace (Health, Safety and Welfare) Regulations 1992','Observe airflow and odours and sample worker concerns or monitoring records.',300),
  ('H','Health and Welfare Facilities','H1','Drinking water, toilets and washing facilities are available and maintained.','Workplace (Health, Safety and Welfare) Regulations 1992','Check cleanliness, access, supplies, condition and signage.',310),
  ('H','Health and Welfare Facilities','H2','Rest and break areas are hygienic and suitable.','Workplace (Health, Safety and Welfare) Regulations 1992','Check food waste, cleanliness, seating and contamination controls.',320),
  ('H','Health and Welfare Facilities','H3','Welfare facilities are accessible, adequately equipped and maintained.','Workplace (Health, Safety and Welfare) Regulations 1992','Check blocked access, cleanliness, damage and missing supplies.',330),
  ('I','External Areas','I1','External areas, footpaths and access routes are orderly and free from slip, trip and obstruction hazards.','Health and Safety at Work etc. Act 1974; Workplace (Health, Safety and Welfare) Regulations 1992','Inspect surfaces, debris, lighting, seasonal hazards and access routes.',340),
  ('I','External Areas','I2','External waste is controlled and the ground is free from leakage and contamination.','Environmental Protection Act 1990','Check skips, containers, staining, leakage, drainage and contamination.',350)
)
insert into public.hs_inspection_template_questions
  (template_id,section_code,section_title,question_code,question_text,legislation_guidance,inspector_guidance,display_order)
select template.id,q.section_code,q.section_title,q.question_code,q.question_text,q.legislation_guidance,q.inspector_guidance,q.display_order
from template cross join questions q
on conflict (template_id,question_code) do update set
  section_code=excluded.section_code,section_title=excluded.section_title,
  question_text=excluded.question_text,legislation_guidance=excluded.legislation_guidance,
  inspector_guidance=excluded.inspector_guidance,display_order=excluded.display_order,active=true;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hs-workplace-inspection-evidence','hs-workplace-inspection-evidence',false,10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'hs_inspection_templates','hs_inspection_programmes','hs_inspection_risk_signals',
    'hs_workplace_inspections','hs_workplace_inspection_responses','hs_workplace_inspection_findings',
    'hs_workplace_inspection_actions','hs_workplace_inspection_evidence'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('drop policy if exists %I on public.%I','workplace_inspection_view',table_name);
    execute format($policy$
      create policy workplace_inspection_view on public.%I for select to authenticated using (
        organization_id is null
        or exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
        or public.is_organization_people_admin(organization_id)
        or public.has_organization_module_access(organization_id,'risk_management','view')
      )$policy$,table_name);
    execute format('drop policy if exists %I on public.%I','workplace_inspection_manage',table_name);
    execute format($policy$
      create policy workplace_inspection_manage on public.%I for all to authenticated using (
        organization_id is not null and (
          exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
          or public.is_organization_people_admin(organization_id)
          or public.has_organization_module_access(organization_id,'risk_management','contribute')
        )
      ) with check (
        organization_id is not null and (
          exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
          or public.is_organization_people_admin(organization_id)
          or public.has_organization_module_access(organization_id,'risk_management','contribute')
        )
      )$policy$,table_name);
  end loop;
end $$;

alter table public.hs_inspection_template_questions enable row level security;
drop policy if exists workplace_inspection_questions_view on public.hs_inspection_template_questions;
create policy workplace_inspection_questions_view on public.hs_inspection_template_questions for select to authenticated using (
  exists (
    select 1 from public.hs_inspection_templates template
    where template.id=template_id and (
      template.organization_id is null
      or exists (select 1 from public.organizations o where o.id=template.organization_id and o.owner_id=auth.uid())
      or public.is_organization_people_admin(template.organization_id)
      or public.has_organization_module_access(template.organization_id,'risk_management','view')
    )
  )
);
drop policy if exists workplace_inspection_questions_manage on public.hs_inspection_template_questions;
create policy workplace_inspection_questions_manage on public.hs_inspection_template_questions for all to authenticated using (
  exists (
    select 1 from public.hs_inspection_templates template
    where template.id=template_id and template.organization_id is not null and (
      exists (select 1 from public.organizations o where o.id=template.organization_id and o.owner_id=auth.uid())
      or public.is_organization_people_admin(template.organization_id)
      or public.has_organization_module_access(template.organization_id,'risk_management','contribute')
    )
  )
) with check (
  exists (
    select 1 from public.hs_inspection_templates template
    where template.id=template_id and template.organization_id is not null and (
      exists (select 1 from public.organizations o where o.id=template.organization_id and o.owner_id=auth.uid())
      or public.is_organization_people_admin(template.organization_id)
      or public.has_organization_module_access(template.organization_id,'risk_management','contribute')
    )
  )
);

grant select,insert,update,delete on public.hs_inspection_templates to authenticated;
grant select,insert,update,delete on public.hs_inspection_template_questions to authenticated;
grant select,insert,update,delete on public.hs_inspection_programmes to authenticated;
grant select,insert,update,delete on public.hs_inspection_risk_signals to authenticated;
grant select,insert,update,delete on public.hs_workplace_inspections to authenticated;
grant select,insert,update,delete on public.hs_workplace_inspection_responses to authenticated;
grant select,insert,update,delete on public.hs_workplace_inspection_findings to authenticated;
grant select,insert,update,delete on public.hs_workplace_inspection_actions to authenticated;
grant select,insert,update,delete on public.hs_workplace_inspection_evidence to authenticated;
grant all privileges on public.hs_inspection_templates to service_role;
grant all privileges on public.hs_inspection_template_questions to service_role;
grant all privileges on public.hs_inspection_programmes to service_role;
grant all privileges on public.hs_inspection_risk_signals to service_role;
grant all privileges on public.hs_workplace_inspections to service_role;
grant all privileges on public.hs_workplace_inspection_responses to service_role;
grant all privileges on public.hs_workplace_inspection_findings to service_role;
grant all privileges on public.hs_workplace_inspection_actions to service_role;
grant all privileges on public.hs_workplace_inspection_evidence to service_role;
grant execute on function public.workplace_inspection_priority(uuid) to authenticated,service_role;
grant execute on function public.validate_workplace_inspection_people() to authenticated,service_role;
grant execute on function public.validate_workplace_inspection_action_people() to authenticated,service_role;

comment on table public.hs_inspection_programmes is 'Risk-based recurring Workplace Inspection schedules shown in the H&S Management Board calendar.';
comment on table public.hs_inspection_risk_signals is 'Dynamic planning inputs from earlier inspections, audits, accidents, incidents, risk assessments and operational modules.';
comment on table public.hs_workplace_inspection_actions is 'Controlled inspection actions assigned to Company Users with independent effectiveness verification.';

commit;
