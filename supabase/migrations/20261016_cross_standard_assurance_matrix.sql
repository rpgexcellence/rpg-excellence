-- Cross-standard assurance matrix.
-- Baseline requirement relationships are global reference data. Organisation
-- implementation records remain tenant-scoped and do not alter assessment,
-- finding, CAPA or Company User permissions.

create table if not exists public.cross_standard_control_groups (
  id uuid primary key default gen_random_uuid(),
  group_code text not null unique,
  title text not null,
  process_area text not null,
  executive_intent text not null,
  implementation_guidance text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cross_standard_requirement_links (
  id uuid primary key default gen_random_uuid(),
  control_group_id uuid not null references public.cross_standard_control_groups(id) on delete cascade,
  standard_name text not null,
  edition text not null,
  clause_reference text not null,
  requirement_focus text not null,
  relationship text not null default 'related'
    check (relationship in ('common','related','standard_specific')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(control_group_id,standard_name,edition,clause_reference)
);

create table if not exists public.organization_cross_standard_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  control_group_id uuid not null references public.cross_standard_control_groups(id) on delete restrict,
  accountable_person_id uuid references public.organization_people(id) on delete set null,
  implementation_status text not null default 'not_reviewed'
    check (implementation_status in ('not_reviewed','gap','developing','implemented','effective')),
  implementation_summary text,
  applicability_notes text,
  last_review_date date,
  next_review_date date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,control_group_id)
);

create table if not exists public.cross_standard_evidence_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_control_id uuid not null references public.organization_cross_standard_controls(id) on delete cascade,
  controlled_document_id uuid references public.controlled_documents(id) on delete cascade,
  source_type text not null default 'controlled_document'
    check (source_type in ('controlled_document','assessment','audit','finding','capa','external_reference')),
  source_record_id uuid,
  external_reference text,
  evidence_purpose text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    controlled_document_id is not null or
    source_record_id is not null or
    nullif(trim(external_reference),'') is not null
  )
);

create index if not exists cross_standard_links_standard_idx
  on public.cross_standard_requirement_links(standard_name,edition,clause_reference);
create index if not exists organization_cross_standard_controls_org_idx
  on public.organization_cross_standard_controls(organization_id,implementation_status,next_review_date);
create index if not exists organization_cross_standard_controls_owner_idx
  on public.organization_cross_standard_controls(organization_id,accountable_person_id);
create index if not exists cross_standard_evidence_control_idx
  on public.cross_standard_evidence_links(organization_control_id,created_at desc);

alter table public.cross_standard_control_groups enable row level security;
alter table public.cross_standard_requirement_links enable row level security;
alter table public.organization_cross_standard_controls enable row level security;
alter table public.cross_standard_evidence_links enable row level security;

drop policy if exists cross_standard_groups_read on public.cross_standard_control_groups;
create policy cross_standard_groups_read on public.cross_standard_control_groups
  for select to authenticated using (active=true);

drop policy if exists cross_standard_requirement_links_read on public.cross_standard_requirement_links;
create policy cross_standard_requirement_links_read on public.cross_standard_requirement_links
  for select to authenticated using (true);

drop policy if exists organization_cross_standard_controls_manage on public.organization_cross_standard_controls;
create policy organization_cross_standard_controls_manage on public.organization_cross_standard_controls
  for all to authenticated
  using (
    owner_id=auth.uid() or public.is_organization_people_admin(organization_id)
  )
  with check (
    owner_id=auth.uid() or public.is_organization_people_admin(organization_id)
  );

drop policy if exists cross_standard_evidence_links_manage on public.cross_standard_evidence_links;
create policy cross_standard_evidence_links_manage on public.cross_standard_evidence_links
  for all to authenticated
  using (
    owner_id=auth.uid() or public.is_organization_people_admin(organization_id)
  )
  with check (
    owner_id=auth.uid() or public.is_organization_people_admin(organization_id)
  );

grant select on public.cross_standard_control_groups to authenticated;
grant select on public.cross_standard_requirement_links to authenticated;
grant select,insert,update,delete on public.organization_cross_standard_controls to authenticated;
grant select,insert,update,delete on public.cross_standard_evidence_links to authenticated;
grant all privileges on public.cross_standard_control_groups to service_role;
grant all privileges on public.cross_standard_requirement_links to service_role;
grant all privileges on public.organization_cross_standard_controls to service_role;
grant all privileges on public.cross_standard_evidence_links to service_role;

insert into public.cross_standard_control_groups
  (group_code,title,process_area,executive_intent,implementation_guidance,display_order)
values
  ('IMS-01','Context and material issues','Governance','Keep management-system priorities aligned with internal and external change.','Maintain one controlled context review, then record the distinct effect on quality, environment, OH&S, continuity and information security.',10),
  ('IMS-02','Interested parties and obligations','Governance','Translate relevant stakeholder, legal, contractual and customer expectations into controlled requirements.','Use one interested-party and obligations process while retaining standard-specific applicability, compliance and customer requirements.',20),
  ('IMS-03','Scope and process architecture','Governance','Define defensible boundaries, sites, processes, interfaces and dependencies.','Maintain the integrated scope and process architecture, with separate applicability decisions where each standard requires them.',30),
  ('IMS-04','Leadership policy and accountability','Leadership','Make leaders accountable for intended outcomes and integration into business processes.','Align governance, policy deployment and named ownership without merging distinct statutory or specialist accountabilities.',40),
  ('IMS-05','Risk opportunity and change','Planning','Use evidence to prioritise uncertainty, opportunity and controlled change.','Apply a common governance method but preserve the different risk concepts and evaluation criteria required by each discipline.',50),
  ('IMS-06','Objectives plans and performance measures','Planning','Connect strategic intent to measurable outcomes, owners, resources and evaluation.','Use a common objective-control cycle; retain discipline-specific measures, baselines and evaluation criteria.',60),
  ('IMS-07','Competence awareness and communication','Support','Ensure people are competent, aware and able to communicate what the system requires.','Share competence and communication controls while defining role-specific technical, emergency, security and legal requirements.',70),
  ('IMS-08','Documented information and evidence','Support','Maintain reliable information and retain objective evidence of effective operation.','Apply common approval, version, access, retention and disposal rules; classify and restrict evidence according to risk.',80),
  ('IMS-09','Operational planning and control','Operation','Convert requirements and risk decisions into reliable operating controls.','Map shared processes once, but keep product, environmental, OH&S, continuity and security operating criteria explicit.',90),
  ('IMS-10','External providers and dependencies','Operation','Control suppliers, outsourced processes and external dependencies proportionate to risk.','Use one supplier assurance framework with selectable discipline-specific due diligence, controls, monitoring and escalation.',100),
  ('IMS-11','Emergency disruption and response','Operation','Prepare for credible abnormal conditions and protect priority outcomes.','Coordinate emergency and disruption governance while keeping safety, environmental, continuity and cyber response procedures distinct.',110),
  ('IMS-12','Monitoring compliance and analysis','Performance','Evaluate performance, conformity, compliance and control effectiveness using reliable data.','Use shared dashboards and review cadence, but do not substitute one discipline metric or compliance evaluation for another.',120),
  ('IMS-13','Internal audit and management review','Performance','Provide independent assurance and leadership decisions across the integrated system.','Plan combined audits where competence and scope permit; retain clause-level evidence, findings and conclusions for every applicable standard.',130),
  ('IMS-14','Nonconformity corrective action and improvement','Improvement','Contain failure, address cause, verify effectiveness and improve performance.','Use the shared Findings and CAPA-8D workflow while preserving the originating standard, clause, risk and effectiveness criteria.',140)
on conflict (group_code) do update set
  title=excluded.title,
  process_area=excluded.process_area,
  executive_intent=excluded.executive_intent,
  implementation_guidance=excluded.implementation_guidance,
  display_order=excluded.display_order,
  active=true,
  updated_at=now();

with mapping(group_code,standard_name,edition,clause_reference,requirement_focus,relationship,display_order) as (
  values
  ('IMS-01','ISO 9001','2026','4.1','Quality context and material issues','common',10),
  ('IMS-01','ISO 14001','2026','4.1','Environmental conditions and organisational context','common',20),
  ('IMS-01','ISO 45001','2018/Amd 1:2024','4.1','OH&S context and worker-related conditions','common',30),
  ('IMS-01','ISO 22301','2019/Amd 1:2024','4.1','Continuity context and disruption drivers','common',40),
  ('IMS-01','ISO/IEC 27001','2022/Amd 1:2024','4.1','Information-security context','common',50),
  ('IMS-02','ISO 9001','2026','4.2','Relevant parties and QMS requirements','common',10),
  ('IMS-02','ISO 14001','2026','4.2, 6.1.3','Interested parties and compliance obligations','related',20),
  ('IMS-02','ISO 45001','2018/Amd 1:2024','4.2, 6.1.3','Workers, interested parties and legal requirements','related',30),
  ('IMS-02','ISO 22301','2019/Amd 1:2024','4.2','Interested-party continuity requirements','common',40),
  ('IMS-02','ISO/IEC 27001','2022/Amd 1:2024','4.2','Interested-party information-security requirements','common',50),
  ('IMS-03','ISO 9001','2026','4.3-4.4','QMS scope and process system','common',10),
  ('IMS-03','ISO 14001','2026','4.3-4.4','EMS scope and system processes','common',20),
  ('IMS-03','ISO 45001','2018/Amd 1:2024','4.3-4.4','OH&S scope and system processes','common',30),
  ('IMS-03','ISO 22301','2019/Amd 1:2024','4.3-4.4','BCMS scope and system','common',40),
  ('IMS-03','ISO/IEC 27001','2022/Amd 1:2024','4.3-4.4','ISMS scope and system','common',50),
  ('IMS-04','ISO 9001','2026','5.1-5.3','Quality leadership, policy and roles','common',10),
  ('IMS-04','ISO 14001','2026','5.1-5.3','Environmental leadership, policy and roles','common',20),
  ('IMS-04','ISO 45001','2018/Amd 1:2024','5.1-5.4','OH&S leadership, roles and worker participation','related',30),
  ('IMS-04','ISO 22301','2019/Amd 1:2024','5.1-5.3','Continuity leadership, policy and roles','common',40),
  ('IMS-04','ISO/IEC 27001','2022/Amd 1:2024','5.1-5.3','Information-security leadership, policy and roles','common',50),
  ('IMS-05','ISO 9001','2026','6.1, 6.3','QMS risks, opportunities and planned change','related',10),
  ('IMS-05','ISO 14001','2026','6.1, 8.1','Environmental aspects, risks, obligations and change','standard_specific',20),
  ('IMS-05','ISO 45001','2018/Amd 1:2024','6.1, 8.1.3','Hazards, OH&S risk and management of change','standard_specific',30),
  ('IMS-05','ISO 22301','2019/Amd 1:2024','6.1','BCMS risks and opportunities','related',40),
  ('IMS-05','ISO/IEC 27001','2022/Amd 1:2024','6.1, 8.2-8.3','Security risk assessment and treatment','standard_specific',50),
  ('IMS-06','ISO 9001','2026','6.2, 9.1','Quality objectives and performance evaluation','common',10),
  ('IMS-06','ISO 14001','2026','6.2, 9.1','Environmental objectives and performance evaluation','common',20),
  ('IMS-06','ISO 45001','2018/Amd 1:2024','6.2, 9.1','OH&S objectives and performance evaluation','common',30),
  ('IMS-06','ISO 22301','2019/Amd 1:2024','6.2, 9.1','Continuity objectives and capability evaluation','common',40),
  ('IMS-06','ISO/IEC 27001','2022/Amd 1:2024','6.2, 9.1','Security objectives and performance evaluation','common',50),
  ('IMS-07','ISO 9001','2026','7.1-7.4','Resources, competence, awareness and communication','common',10),
  ('IMS-07','ISO 14001','2026','7.1-7.4','Environmental resources, competence and communication','common',20),
  ('IMS-07','ISO 45001','2018/Amd 1:2024','7.1-7.4','OH&S competence, awareness, consultation and communication','related',30),
  ('IMS-07','ISO 22301','2019/Amd 1:2024','7.1-7.4','Continuity resources, competence and communications','related',40),
  ('IMS-07','ISO/IEC 27001','2022/Amd 1:2024','7.1-7.4','Security resources, competence and communication','common',50),
  ('IMS-08','ISO 9001','2026','7.5','QMS documented information','common',10),
  ('IMS-08','ISO 14001','2026','7.5','EMS documented information','common',20),
  ('IMS-08','ISO 45001','2018/Amd 1:2024','7.5','OH&S documented information','common',30),
  ('IMS-08','ISO 22301','2019/Amd 1:2024','7.5','BCMS documented information','common',40),
  ('IMS-08','ISO/IEC 27001','2022/Amd 1:2024','7.5','ISMS documented information','common',50),
  ('IMS-09','ISO 9001','2026','8.1-8.7','Quality operational controls','standard_specific',10),
  ('IMS-09','ISO 14001','2026','8.1','Environmental operational controls and life-cycle perspective','standard_specific',20),
  ('IMS-09','ISO 45001','2018/Amd 1:2024','8.1','OH&S operational controls and hierarchy of controls','standard_specific',30),
  ('IMS-09','ISO 22301','2019/Amd 1:2024','8.1-8.5','BIA, strategy, plans and exercising','standard_specific',40),
  ('IMS-09','ISO/IEC 27001','2022/Amd 1:2024','8.1-8.3, Annex A','Security operation, risk treatment and controls','standard_specific',50),
  ('IMS-10','ISO 9001','2026','8.4','External provider control','related',10),
  ('IMS-10','ISO 14001','2026','8.1','Procurement, outsourced processes and life-cycle controls','related',20),
  ('IMS-10','ISO 45001','2018/Amd 1:2024','8.1.4','Procurement, contractors and outsourcing','related',30),
  ('IMS-10','ISO 22301','2019/Amd 1:2024','8.3-8.4','Resource and dependency continuity strategies','related',40),
  ('IMS-10','ISO/IEC 27001','2022/Amd 1:2024','6.1.3, Annex A','Supplier and externally provided security controls','related',50),
  ('IMS-11','ISO 9001','2026','8.1, 8.5','Abnormal operating conditions affecting conformity','related',10),
  ('IMS-11','ISO 14001','2026','8.2','Emergency preparedness and response','standard_specific',20),
  ('IMS-11','ISO 45001','2018/Amd 1:2024','8.2','Emergency preparedness and response','standard_specific',30),
  ('IMS-11','ISO 22301','2019/Amd 1:2024','8.4-8.5','Continuity response, recovery and exercise','standard_specific',40),
  ('IMS-11','ISO/IEC 27001','2022/Amd 1:2024','Annex A','Information-security incident and continuity controls','standard_specific',50),
  ('IMS-12','ISO 9001','2026','9.1','Quality monitoring, analysis and evaluation','common',10),
  ('IMS-12','ISO 14001','2026','9.1','Environmental monitoring and compliance evaluation','related',20),
  ('IMS-12','ISO 45001','2018/Amd 1:2024','9.1','OH&S monitoring and compliance evaluation','related',30),
  ('IMS-12','ISO 22301','2019/Amd 1:2024','9.1','Continuity performance and capability evaluation','common',40),
  ('IMS-12','ISO/IEC 27001','2022/Amd 1:2024','9.1','Information-security monitoring and evaluation','common',50),
  ('IMS-13','ISO 9001','2026','9.2-9.3','QMS internal audit and management review','common',10),
  ('IMS-13','ISO 14001','2026','9.2-9.3','EMS internal audit and management review','common',20),
  ('IMS-13','ISO 45001','2018/Amd 1:2024','9.2-9.3','OH&S internal audit and management review','common',30),
  ('IMS-13','ISO 22301','2019/Amd 1:2024','9.2-9.3','BCMS internal audit and management review','common',40),
  ('IMS-13','ISO/IEC 27001','2022/Amd 1:2024','9.2-9.3','ISMS internal audit and management review','common',50),
  ('IMS-14','ISO 9001','2026','10.1-10.3','Quality nonconformity, corrective action and improvement','common',10),
  ('IMS-14','ISO 14001','2026','10.1-10.3','Environmental nonconformity, corrective action and improvement','common',20),
  ('IMS-14','ISO 45001','2018/Amd 1:2024','10.1-10.3','Incident, nonconformity, corrective action and improvement','related',30),
  ('IMS-14','ISO 22301','2019/Amd 1:2024','10.1-10.2','Continuity nonconformity, corrective action and improvement','common',40),
  ('IMS-14','ISO/IEC 27001','2022/Amd 1:2024','10.1-10.2','Security nonconformity, corrective action and improvement','common',50)
)
insert into public.cross_standard_requirement_links
  (control_group_id,standard_name,edition,clause_reference,requirement_focus,relationship,display_order)
select g.id,m.standard_name,m.edition,m.clause_reference,m.requirement_focus,m.relationship,m.display_order
from mapping m
join public.cross_standard_control_groups g on g.group_code=m.group_code
on conflict (control_group_id,standard_name,edition,clause_reference) do update set
  requirement_focus=excluded.requirement_focus,
  relationship=excluded.relationship,
  display_order=excluded.display_order;

comment on table public.cross_standard_control_groups is
  'RPG-authored common control themes used to compare standards without replacing licensed standards.';
comment on table public.cross_standard_requirement_links is
  'Clause-level relationship references. A mapping does not mean that requirements are identical or interchangeable.';
comment on table public.organization_cross_standard_controls is
  'Organisation implementation assessment for a common control group with Company User accountability.';
