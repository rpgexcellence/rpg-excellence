-- ISO 9001:2026 internal-audit release
-- Updates the controlled standard, loads clause-specific questions and replaces
-- free-text programme/approval ownership with Company User references.

alter table public.internal_audit_questions
  add column if not exists auditor_guidance text,
  add column if not exists evidence_examples text,
  add column if not exists analysis_focus text;

alter table public.internal_audit_programmes
  add column if not exists programme_owner_person_id uuid references public.organization_people(id) on delete restrict;

alter table public.internal_auditor_register
  add column if not exists initially_approved_by_person_id uuid references public.organization_people(id) on delete restrict;

alter table public.internal_audits
  add column if not exists auditee_contact_person_id uuid references public.organization_people(id) on delete set null;

create index if not exists internal_audit_programme_owner_person_idx
  on public.internal_audit_programmes(organization_id,programme_owner_person_id);
create index if not exists internal_audit_auditee_person_idx
  on public.internal_audits(organization_id,auditee_contact_person_id);

-- Preserve ISO 9001:2015 for legacy/current certification activity and create
-- ISO 9001:2026 as an additional independently selectable audit criterion.
insert into public.internal_audit_standard_catalogue
  (standard_code,display_name,edition_label,discipline,active)
select 'ISO 9001:2026','ISO 9001:2026','2026','Quality management',true
where not exists (
  select 1 from public.internal_audit_standard_catalogue
  where upper(regexp_replace(standard_code,'[^A-Z0-9]','','g'))='ISO90012026'
);

do $$
declare
  sid uuid;
  q record;
  qid uuid;
  seq integer := 0;
begin
  select id into sid from public.internal_audit_standard_catalogue
  where upper(regexp_replace(standard_code,'[^A-Z0-9]','','g'))='ISO90012026'
  order by active desc limit 1;
  if sid is null then raise exception 'ISO 9001 standard catalogue record not found'; end if;

  for q in select * from (values
    ('QMS26-4.1','4.1','Context and strategy','How has the organisation determined and kept current the internal and external issues affecting QMS results, including climate-change relevance?','Test the most recent strategic/context review against actual changes, risks, objectives and management decisions.','Context review; climate relevance rationale; strategy; risk and objective updates.','Look for evidence that context changes decisions, not a generic SWOT.','governance'),
    ('QMS26-4.2','4.2','Interested parties','How are relevant interested parties, their applicable requirements and changes to those requirements determined and reviewed?','Trace at least three stakeholder requirements into operational controls or objectives.','Interested-party register; contracts; regulation; customer requirements; review records.','Confirm relevance, ownership, review frequency and action on change.','governance'),
    ('QMS26-4.3','4.3','QMS scope','Is the QMS scope accurate, available and justified, including products, services, boundaries and any non-applicable requirements?','Walk the physical, organisational and digital boundaries and challenge exclusions.','Controlled scope; sites; organisation chart; product/service portfolio; exclusion rationale.','Check interfaces and outsourced work are not omitted to avoid control.','governance'),
    ('QMS26-4.4','4.4','Process management','Are QMS processes, interactions, inputs, outputs, criteria, resources, responsibilities, risks and performance measures defined and controlled?','Follow one end-to-end customer process across hand-offs and supporting processes.','Process map; KPIs; procedures; risks; records; process reviews.','Assess process effectiveness and interaction, not document existence alone.','operations'),
    ('QMS26-5.1.1','5.1.1','Leadership','How does top management demonstrate accountability for QMS effectiveness, integration, resources and improvement?','Seek recent decisions, challenge and resource allocation led by top management.','Leadership minutes; decisions; resources; performance reviews; communications.','Distinguish visible leadership from delegation to the quality function.','leadership'),
    ('QMS26-5.1.2','5.1.2','Customer focus','How does leadership ensure customer and applicable requirements are understood, risks controlled and satisfaction enhanced?','Trace complaints, changing requirements and delivery risk into leadership action.','Customer metrics; complaints; contract reviews; risks; actions.','Test whether customer focus changes priorities and controls.','customer'),
    ('QMS26-5.2','5.2','Quality policy','Is the quality policy appropriate, strategically aligned, communicated, understood and used to set objectives?','Interview leaders and workers about how the policy affects their decisions.','Approved policy; communication; awareness checks; linked objectives.','Avoid accepting policy display or signatures as proof of understanding.','leadership'),
    ('QMS26-5.3','5.3','Roles and accountability','Are QMS roles, responsibilities and authorities assigned, understood and effective, including process performance reporting?','Sample named process owners and verify authority, competence and escalation.','Role profiles; RACI; process-owner reviews; delegations; escalation records.','Verify accountability is attached to active Company Users.','leadership'),
    ('QMS26-6.1.1','6.1.1','Risk and opportunity','How are QMS risks and opportunities determined from context, stakeholders and process performance?','Sample both adverse risks and beneficial opportunities and trace their basis.','Risk/opportunity register; context links; process reviews; trend analysis.','Check selection is evidence-led and current.','risk'),
    ('QMS26-6.1.2','6.1.2','Risk action','Are actions for quality risks proportionate, integrated into processes and evaluated for effectiveness?','Trace a high risk from assessment through owner, action, implementation and residual evaluation.','Treatment plans; owners; due dates; residual risk; effectiveness evidence.','Completion is not effectiveness; evaluate resulting control performance.','risk'),
    ('QMS26-6.1.3','6.1.3','Opportunity action','Are quality opportunities prioritised, implemented and evaluated for intended benefit?','Examine one improvement opportunity that required investment or process change.','Business case; improvement plan; benefits measures; lessons.','Check opportunities are more than renamed corrective actions.','improvement'),
    ('QMS26-6.2','6.2','Quality objectives','Are measurable quality objectives established, owned, resourced, monitored, communicated and updated?','Test target logic, baseline, trend, accountability and response to missed performance.','Objectives; KPI definitions; plans; progress reviews; action records.','Challenge activity measures that do not demonstrate quality outcomes.','performance'),
    ('QMS26-6.3','6.3','Planning change','Are QMS changes planned considering purpose, consequences, system integrity, resources and responsibilities?','Sample a recent organisational, technical or supplier change end to end.','Change request; impact assessment; approvals; implementation and review.','Look for unintended effects and whether controls remained effective.','change'),
    ('QMS26-7.1.1','7.1.1','Resources','How are resources needed to establish, operate and improve the QMS determined and provided?','Compare resource decisions with risks, workload, competence gaps and performance.','Budgets; workforce plans; capacity reviews; management decisions.','Check unresolved resource constraints are escalated and controlled.','support'),
    ('QMS26-7.1.2','7.1.2','People','Are sufficient competent people available for effective process operation and control?','Sample critical roles, vacancies, workload and contingency arrangements.','Workforce plan; competence matrix; capacity data; succession arrangements.','Test actual availability, not approved headcount only.','people'),
    ('QMS26-7.1.3','7.1.3','Infrastructure','Is infrastructure suitable, maintained and capable of supporting conforming outputs?','Trace a critical asset through ownership, maintenance, breakdown and change history.','Asset register; PPM; breakdowns; calibration; continuity and MOC records.','Examine overdue maintenance and recurring failures.','infrastructure'),
    ('QMS26-7.1.4','7.1.4','Process environment','Are human and physical operating conditions managed to achieve conforming products and services?','Observe work and compare real conditions with defined controls.','Workplace standards; environmental monitoring; behavioural controls; inspections.','Include social, psychological and physical conditions where relevant.','operations'),
    ('QMS26-7.1.5','7.1.5','Monitoring resources','Are monitoring and measuring resources fit for purpose, controlled, traceable and protected from invalid results?','Sample equipment from use back to calibration status and response to out-of-tolerance conditions.','Register; calibration; verification; traceability; impact reviews.','Confirm validity of previous results when equipment is found unsuitable.','measurement'),
    ('QMS26-7.1.6','7.1.6','Organisational knowledge','Is necessary knowledge identified, maintained, available and updated when needs change?','Test a critical process vulnerable to loss of expertise or tacit knowledge.','Knowledge maps; succession; lessons; technical instructions; handovers.','Check accessibility and operational use, not merely storage.','knowledge'),
    ('QMS26-7.2','7.2','Competence','Are competence requirements defined and is competence evaluated from education, training or experience?','Sample role criteria, evidence, observed capability and action after gaps.','Competence profiles; qualifications; assessments; witnessed work; CPD.','Attendance alone does not demonstrate competence.','people'),
    ('QMS26-7.3','7.3','Awareness','Are people aware of policy, objectives, contribution, quality culture, ethical behaviour and consequences of nonconformity?','Use open interviews and practical scenarios across different roles.','Briefings; campaigns; interviews; behavioural observations; survey results.','Test understanding and behaviour rather than recall of slogans.','people'),
    ('QMS26-7.4','7.4','Communication','Are internal and external QMS communications defined for what, when, with whom, how and by whom?','Sample a routine message and a significant quality escalation.','Communication plan; notices; customer updates; escalation records.','Check timeliness, authority, consistency and retained evidence.','communication'),
    ('QMS26-7.5','7.5','Documented information','Is documented information created, updated, available, protected, retained and controlled throughout its lifecycle?','Sample a live work instruction, changed document and retained record.','Document register; approvals; revisions; access; retention; disposal logs.','Compare the controlled version with what people actually use.','documents'),
    ('QMS26-8.1','8.1','Operational control','Are operational processes planned and controlled using defined criteria, resources and retained evidence?','Follow a recent order or service from acceptance through delivery.','Plans; work instructions; acceptance criteria; records; change controls.','Verify planned and unintended changes are controlled.','operations'),
    ('QMS26-8.2.1','8.2.1','Customer communication','Are communications controlled for product information, enquiries, orders, changes, feedback, complaints and contingency needs?','Trace one customer interaction through response and organisational action.','CRM records; quotations; changes; complaints; contingency communications.','Check responsibilities and response timeliness.','customer'),
    ('QMS26-8.2.2','8.2.2','Requirements determination','Are product, service, legal and organisational requirements fully determined before commitment?','Sample complex and routine work, including unstated needs necessary for intended use.','Specifications; legal requirements; feasibility and capability reviews.','Look for assumptions and undocumented customer expectations.','customer'),
    ('QMS26-8.2.3','8.2.3','Requirements review','Does review before commitment confirm requirements, resolve differences and retain evidence?','Trace quotation or tender review into the delivered work.','Contract review; clarifications; approvals; capability and risk review.','Verify verbal requirements are confirmed and differences resolved.','customer'),
    ('QMS26-8.2.4','8.2.4','Requirement changes','Are changed requirements controlled and communicated to relevant people and documents?','Sample a customer change and test downstream updates.','Change record; revised contract/specification; notifications; approvals.','Check obsolete requirements cannot remain in use.','change'),
    ('QMS26-8.3.1','8.3.1','Design applicability','Is design and development controlled where necessary to ensure subsequent provision?','Verify applicability decisions against actual responsibility for design.','Scope; contracts; design responsibility; exclusion rationale.','Challenge exclusions where the organisation changes technical solutions.','design'),
    ('QMS26-8.3.2','8.3.2','Design planning','Does design planning define stages, reviews, verification, validation, responsibilities, resources and interfaces?','Trace a design plan through stage gates and interface decisions.','Design plan; stage reviews; responsibilities; interface records.','Check planning evolves as design complexity and risk change.','design'),
    ('QMS26-8.3.3','8.3.3','Design inputs','Are design inputs complete, unambiguous, adequate and resolved when conflicting?','Sample requirements, standards, prior learning and failure consequences.','Input specification; legal/standard requirements; lessons; risk records.','Confirm conflicts are resolved before design proceeds.','design'),
    ('QMS26-8.3.4','8.3.4','Design controls','Do reviews, verification and validation demonstrate outputs meet input and intended-use requirements?','Examine independent challenge, test evidence and unresolved actions.','Review minutes; calculations; test/validation results; action closure.','Distinguish verification from validation and confirm planned timing.','design'),
    ('QMS26-8.3.5','8.3.5','Design outputs','Are outputs adequate for subsequent processes and include acceptance, monitoring and essential characteristics?','Trace design output into procurement, production/service and inspection.','Drawings; specifications; acceptance criteria; special characteristics.','Check output usability and controlled release.','design'),
    ('QMS26-8.3.6','8.3.6','Design changes','Are design changes identified, reviewed, controlled and assessed for adverse impact?','Sample a late or urgent change through approval and implementation.','Change notices; impact reviews; approvals; configuration records.','Check effect on delivered or interfacing products and services.','change'),
    ('QMS26-8.4.1','8.4.1','External provision','Are external providers selected, evaluated, monitored and re-evaluated based on their ability to meet requirements?','Sample critical suppliers and outsourced processes using risk-based criteria.','Approved supplier list; due diligence; performance; audit; re-evaluation.','Check outsourced processes remain within QMS control.','supplier'),
    ('QMS26-8.4.2','8.4.2','Supplier controls','Is the type and extent of supplier control proportionate to risk and verified before release or use?','Trace critical supply from risk classification to incoming or source controls.','Supplier risk; inspection; validation; certificates; performance trends.','Look for over-reliance on certification without performance evidence.','supplier'),
    ('QMS26-8.4.3','8.4.3','Supplier requirements','Are requirements communicated clearly to providers, including approvals, competence, interactions and verification?','Compare purchase requirements with actual delivery and acceptance.','POs; specifications; quality clauses; competence and verification needs.','Confirm adequacy is checked before communication.','supplier'),
    ('QMS26-8.5.1','8.5.1','Production and service control','Are production and service activities performed under controlled conditions?','Observe live work and sample instructions, competence, equipment, monitoring and release.','Work instructions; travellers; service records; validation; release evidence.','Test actual execution and special-process validation.','operations'),
    ('QMS26-8.5.2','8.5.2','Identification and traceability','Are outputs identified and traceable to the extent needed to ensure conformity?','Trace forward and backward through one selected output.','Labels; batch/job records; status identification; traceability records.','Test traceability speed, completeness and status integrity.','operations'),
    ('QMS26-8.5.3','8.5.3','Customer property','Is customer or provider property identified, protected and reported if lost, damaged or unsuitable?','Sample physical, intellectual and personal-data property.','Property register; condition checks; incident/customer notifications.','Include drawings, data, tools and materials, not only physical assets.','operations'),
    ('QMS26-8.5.4','8.5.4','Preservation','Are outputs preserved during processing and delivery to maintain conformity?','Observe handling, storage, packaging, contamination and transport controls.','Storage conditions; shelf life; packaging; handling and dispatch records.','Check controls match product/service sensitivity and duration.','operations'),
    ('QMS26-8.5.5','8.5.5','Post-delivery','Are post-delivery obligations determined and controlled considering risk, lifetime, feedback and legal requirements?','Trace warranty, support, recall or disposal obligations.','Contracts; warranties; support logs; field data; legal obligations.','Confirm feedback changes controls where necessary.','customer'),
    ('QMS26-8.5.6','8.5.6','Operational changes','Are production and service changes reviewed and controlled to maintain conformity?','Sample authorised and emergency operational changes.','Change reviews; approvals; revised documents; validation.','Assess impact on people, equipment, suppliers and acceptance criteria.','change'),
    ('QMS26-8.6','8.6','Release','Is release authorised only after planned verification and are records traceable to the authoriser?','Sample released outputs and exceptions/concessions.','Inspection/test records; release approval; concessions.','Ensure release authority and evidence are unambiguous.','operations'),
    ('QMS26-8.7','8.7','Nonconforming outputs','Are nonconforming outputs identified, controlled, corrected or authorised, with retained evidence?','Trace a nonconformity from detection through disposition and re-verification.','NCR; segregation; concession; correction; re-verification.','Check unintended use/delivery prevention and action after delivery.','improvement'),
    ('QMS26-9.1.1','9.1.1','Monitoring and evaluation','Has the organisation defined what, how and when to monitor, measure, analyse and evaluate?','Test metric validity, methods, timing, data ownership and decisions.','KPI definitions; dashboards; data validation; evaluation records.','Counts are not evaluation; require conclusions and actions.','performance'),
    ('QMS26-9.1.2','9.1.2','Customer satisfaction','How is customer perception monitored using suitable methods and trends?','Compare surveys with complaints, retention, delivery and other perception signals.','Survey/feedback data; complaints; repeat business; market data.','Check bias, coverage and action from adverse trends.','customer'),
    ('QMS26-9.1.3','9.1.3','Analysis','Does analysis evaluate conformity, satisfaction, process performance, planning effectiveness, supplier performance and improvement needs?','Review recent analysis and trace conclusions into decisions.','Trend reports; statistical analysis; management decisions; actions.','Check aggregation does not hide weak sites, products or processes.','performance'),
    ('QMS26-9.2.1','9.2.1','Internal audit','Do internal audits objectively determine conformity and effective implementation?','Sample audit evidence, independence, criteria and conclusion quality.','Programme; plans; auditor records; evidence; reports; follow-up.','Verify audits test effectiveness, not checklist completion alone.','internal-audit'),
    ('QMS26-9.2.2','9.2.2','Audit programme','Is the audit programme risk-based, controlled and adjusted for importance, change and prior results?','Trace programme priorities into frequency, scope, methods and auditor selection.','Three-year programme; FMEA/risk basis; schedules; competence; actions.','Confirm results reach relevant management and corrections occur promptly.','internal-audit'),
    ('QMS26-9.3.1','9.3.1','Management review','Does top management review the QMS at planned intervals for suitability, adequacy, effectiveness and strategic alignment?','Evaluate participation, preparation, challenge and decision authority.','Agenda; inputs; attendance; minutes; controlled actions.','A presentation meeting without decisions is not sufficient.','leadership'),
    ('QMS26-9.3.2','9.3.2','Review inputs','Are all required management-review inputs complete, current and analysed?','Cross-check inputs against actual performance, changes, resources and opportunities.','Trend packs; audit/customer/process/supplier data; risks; resources.','Identify missing, stale or selectively reported information.','performance'),
    ('QMS26-9.3.3','9.3.3','Review results','Do management-review results record decisions on improvement, QMS change and resources with ownership?','Trace decisions into Company User-owned actions and completion evidence.','Decisions; action owners; due dates; resource approvals; follow-up.','Verify decisions are specific, resourced and monitored.','leadership'),
    ('QMS26-10.1','10.1','Continual improvement','How does the organisation continually improve QMS suitability, adequacy, effectiveness and performance?','Use trends to identify sustained system-level improvement, not isolated fixes.','Improvement portfolio; trend evidence; benefits; lessons.','Confirm improvement is evaluated against intended outcomes.','improvement'),
    ('QMS26-10.2','10.2','Corrective action','Are nonconformities corrected, causes and extent evaluated, actions implemented and effectiveness verified?','Trace one significant issue through containment, RCA, CAPA-8D and independent verification.','Finding; correction; RCA; action; changed risks/docs; effectiveness review.','Reject default retraining or closure based only on task completion.','capa')
  ) as v(code,clause,area,question,guidance,evidence,analysis,scope_key)
  loop
    seq := seq + 1;
    -- Do not use ON CONFLICT(question_code): older installations do not have a
    -- unique constraint on that column. Match within the new standard so the
    -- existing ISO 9001:2015 question bank is never changed.
    select iaq.id into qid
    from public.internal_audit_questions iaq
    where iaq.standard_id = sid
      and iaq.question_code = q.code
    order by iaq.id
    limit 1;

    if qid is null then
      insert into public.internal_audit_questions
        (standard_id,question_code,clause,process_area,question_text,source_edition,auditor_guidance,evidence_examples,analysis_focus,active,display_order)
      values
        (sid,q.code,q.clause,q.area,q.question,'2026',q.guidance,q.evidence,q.analysis,true,
         1000 + seq)
      returning id into qid;
    else
      update public.internal_audit_questions
      set clause = q.clause,
          process_area = q.area,
          question_text = q.question,
          source_edition = '2026',
          auditor_guidance = q.guidance,
          evidence_examples = q.evidence,
          analysis_focus = q.analysis,
          active = true,
          display_order = 1000 + seq
      where id = qid;
    end if;

    insert into public.internal_audit_question_scope_links
      (question_id,standard_id,scope_key,clause,requirement_summary)
    values (qid,sid,q.scope_key,q.clause,q.area)
    on conflict do nothing;
  end loop;
end $$;

comment on column public.internal_audit_questions.auditor_guidance is
  'Practical, clause-specific fieldwork guidance; not a replacement for the licensed standard.';
