-- RPG Excellence Internal Audit Academy
-- Original refresher course informed by ISO 19011 auditing principles.

begin;

alter table public.hs_training_courses
  add column if not exists academy_code text not null default 'health_safety';

create index if not exists hs_training_courses_academy_code_idx
  on public.hs_training_courses (academy_code, active, published_at);

update public.hs_training_courses
set academy_code = 'health_safety'
where course_code in ('RA-INITIAL-001', 'RA-REFRESHER-001');

insert into public.hs_training_courses (
  course_code, title, course_type, description, duration_minutes,
  pass_mark, validity_months, price_pence, currency, version,
  academy_code, active, published_at
)
values (
  'IA-REFRESHER-001',
  'Internal Auditor Refresher Training',
  'refresher',
  'Interactive refresher for internal auditors covering ISO 19011 principles, risk-based planning, interviewing, objective evidence, findings, reporting and follow-up.',
  35, 80, 36, 1999, 'gbp', 1,
  'internal_audit', true, now()
)
on conflict (course_code) do update set
  title = excluded.title,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  pass_mark = excluded.pass_mark,
  validity_months = excluded.validity_months,
  price_pence = excluded.price_pence,
  currency = excluded.currency,
  academy_code = excluded.academy_code,
  active = true,
  published_at = coalesce(public.hs_training_courses.published_at, now()),
  updated_at = now();

with course as (
  select id from public.hs_training_courses where course_code = 'IA-REFRESHER-001'
)
insert into public.hs_training_modules (
  course_id, module_number, title, learning_objective,
  module_type, estimated_minutes, active, content
)
select course.id, module_number, title, objective, module_type, minutes, true, content
from course
cross join (values
  (1, 'Auditor purpose and principles',
   'Apply integrity, fair presentation, professional care, confidentiality, independence and evidence-based decision-making.',
   'lesson', 4,
   jsonb_build_object(
     'summary','Internal audit provides objective assurance about whether arrangements are implemented and effective. It is not a search for blame or a document-checking exercise.',
     'sections',jsonb_build_array(
       jsonb_build_object('heading','Independence','body','Avoid auditing your own work and declare conflicts that could affect impartial judgement.'),
       jsonb_build_object('heading','Evidence-based approach','body','Conclusions must be traceable to sufficient, relevant and verifiable audit evidence.'),
       jsonb_build_object('heading','Risk-based approach','body','Focus time and sampling where failure, change, uncertainty or consequence creates the greatest assurance need.')
     ),
     'interaction',jsonb_build_object('type','principle_match','instruction','Match each auditor behaviour to the principle it supports or breaches.')
   )),
  (2, 'Plan the audit that matters',
   'Define clear objectives, scope and criteria and build a proportionate risk-based audit plan.',
   'scenario', 5,
   jsonb_build_object(
     'summary','A useful plan converts the audit purpose into practical evidence trails, people to interview and samples to test.',
     'sections',jsonb_build_array(
       jsonb_build_object('heading','Objective','body','State what assurance the audit must provide and which decisions the result will support.'),
       jsonb_build_object('heading','Scope and boundaries','body','Define sites, processes, functions, shifts, interfaces and exclusions.'),
       jsonb_build_object('heading','Criteria','body','Identify the exact requirements against which evidence will be evaluated.')
     ),
     'scenario',jsonb_build_object('title','A process changed after a customer complaint','context','The procedure was revised, two new operators joined and output doubled. Build a risk-based sample rather than repeating last year''s checklist.'),
     'interaction',jsonb_build_object('type','audit_plan','instruction','Select the priority trails, interviews, records and operational samples and explain why each matters.')
   )),
  (3, 'Interview, observe and sample',
   'Use open questions, observation and traceable sampling to understand work as performed.',
   'scenario', 6,
   jsonb_build_object(
     'summary','Strong auditors triangulate what people say, what records show and what happens in practice.',
     'techniques',jsonb_build_array('Start with open questions','Follow the process trail','Ask for a recent example','Observe normal work','Test records in both directions','Confirm understanding without leading the answer'),
     'scenario',jsonb_build_object('title','The perfect procedure','context','The procedure is complete, but an operator describes a different method and a recent record contains an unexplained deviation.'),
     'interaction',jsonb_build_object('type','interview_builder','instruction','Choose the next question, evidence source and sample needed to test implementation objectively.')
   )),
  (4, 'Build objective evidence',
   'Separate fact, inference and opinion and decide whether the sample is sufficient and relevant.',
   'lesson', 5,
   jsonb_build_object(
     'summary','Evidence must allow another competent auditor to understand what was examined and how the conclusion was reached.',
     'evidence_test',jsonb_build_array('What requirement was tested?','What exact evidence was examined?','Which record, person, location and date identify the sample?','Is the evidence relevant and verifiable?','Is more sampling needed before concluding?'),
     'interaction',jsonb_build_object('type','evidence_classifier','instruction','Classify statements as objective evidence, unsupported inference or opinion, then repair weak evidence notes.')
   )),
  (5, 'Write defensible findings',
   'Construct clear conformity and nonconformity statements linked to criteria and objective evidence.',
   'scenario', 5,
   jsonb_build_object(
     'summary','A defensible nonconformity contains the requirement, the objective evidence and a precise statement of the failure.',
     'finding_structure',jsonb_build_array('Criteria: the requirement that applies','Evidence: the verified facts and sample','Failure statement: how the requirement was not fulfilled','Extent: enough context to support action without prescribing the cause'),
     'warning','Do not diagnose root cause, prescribe a corrective action or inflate classification without evidence.',
     'interaction',jsonb_build_object('type','finding_builder','instruction','Select the valid criterion and evidence, then edit the generated finding until it is factual and traceable.')
   )),
  (6, 'Report and communicate conclusions',
   'Present balanced conclusions that answer the audit objectives and support accountable decisions.',
   'lesson', 4,
   jsonb_build_object(
     'summary','The report should explain both effective control and material weakness, without surprises or unsupported language.',
     'report_elements',jsonb_build_array('Audit objective, scope and criteria','Team, dates and method','Sampling limitations','Conformities and positive practice','Findings and supporting evidence','Overall conclusion','Agreed responsibilities and timescales'),
     'interaction',jsonb_build_object('type','conclusion_check','instruction','Identify which conclusions are supported by the evidence and rewrite those that overstate the sample.')
   )),
  (7, 'Follow up and verify effectiveness',
   'Distinguish correction, cause, corrective action, completion and independently verified effectiveness.',
   'checkpoint', 6,
   jsonb_build_object(
     'summary','Closure is an auditor decision based on objective evidence that the action addressed the cause and achieved sustained control.',
     'sequence',jsonb_build_array('Confirm immediate correction or containment','Evaluate cause analysis','Review whether action addresses the cause','Verify implementation evidence','Test effectiveness after a suitable interval','Record the independent closure decision'),
     'scenario',jsonb_build_object('title','Training completed, problem repeated','context','The owner completed the agreed training action, but the same failure appears in the next sample. Decide the audit follow-up outcome and explain why.'),
     'interaction',jsonb_build_object('type','effectiveness_review','instruction','Select the evidence needed, decide effective or not effective, and record a defensible rationale.')
   ))
) as module(module_number,title,objective,module_type,minutes,content)
on conflict (course_id, module_number) do update set
  title = excluded.title,
  learning_objective = excluded.learning_objective,
  module_type = excluded.module_type,
  estimated_minutes = excluded.estimated_minutes,
  content = excluded.content,
  active = true;

with question_source(question_code, question_text, options, explanation, display_order, correct_answer) as (
  values
  ('IAR-01','What is the primary purpose of an internal audit?',jsonb_build_array('To assign blame','To provide objective assurance about implementation and effectiveness','To rewrite every procedure','To approve management decisions'),'Internal audit provides evidence-based assurance; management remains accountable for the system.',1,'"To provide objective assurance about implementation and effectiveness"'::jsonb),
  ('IAR-02','Which situation most directly threatens auditor independence?',jsonb_build_array('Auditing a process the auditor designed and manages','Interviewing the process owner','Reviewing a sample of records','Using an audit plan'),'Self-review creates a direct impartiality threat and must be avoided or controlled.',2,'"Auditing a process the auditor designed and manages"'::jsonb),
  ('IAR-03','What should drive a risk-based audit sample?',jsonb_build_array('Only last year''s checklist','Change, performance, uncertainty and consequence','Whichever records are easiest to find','The number of pages in the procedure'),'Risk-based sampling prioritises evidence where assurance matters most.',3,'"Change, performance, uncertainty and consequence"'::jsonb),
  ('IAR-04','Which is the strongest opening interview question?',jsonb_build_array('You follow this procedure, do you not?','Can you walk me through how you complete this task?','Why did you break the rule?','Is everything compliant?'),'An open, neutral request reveals the process without suggesting the expected answer.',4,'"Can you walk me through how you complete this task?"'::jsonb),
  ('IAR-05','Which statement is objective evidence?',jsonb_build_array('The process seems poorly managed','Record TR-184 dated 8 September had no required approval','The supervisor is careless','Training is probably ineffective'),'The record reference, date and missing approval are specific and verifiable facts.',5,'"Record TR-184 dated 8 September had no required approval"'::jsonb),
  ('IAR-06','What three elements make a defensible nonconformity?',jsonb_build_array('Opinion, blame and solution','Criteria, objective evidence and failure statement','Risk score, owner and budget','Procedure, interview and photograph'),'A nonconformity must connect the applicable requirement to verified evidence and the precise failure.',6,'"Criteria, objective evidence and failure statement"'::jsonb),
  ('IAR-07','When should an auditor expand a sample?',jsonb_build_array('Never after the plan is approved','When evidence indicates the initial sample may not represent control performance','Whenever the auditee disagrees','Only when management requests it'),'Sampling should adapt when emerging evidence changes uncertainty or risk.',7,'"When evidence indicates the initial sample may not represent control performance"'::jsonb),
  ('IAR-08','Which conclusion is appropriately limited?',jsonb_build_array('The whole system is effective because one record passed','The sampled records demonstrated control during the period examined','No future failure is possible','Every employee is competent'),'Audit conclusions must reflect the scope and limits of the evidence sampled.',8,'"The sampled records demonstrated control during the period examined"'::jsonb),
  ('IAR-09','What is the difference between correction and corrective action?',jsonb_build_array('There is no difference','Correction addresses the detected issue; corrective action addresses its cause to prevent recurrence','Corrective action only changes a document','Correction always closes the finding'),'Correction fixes the immediate problem while corrective action prevents recurrence by addressing cause.',9,'"Correction addresses the detected issue; corrective action addresses its cause to prevent recurrence"'::jsonb),
  ('IAR-10','When may a finding be closed as effective?',jsonb_build_array('When the action owner says it is complete','When the target date arrives','When objective follow-up evidence confirms implementation and sustained intended results','Immediately after training is booked'),'Completion alone is insufficient; the auditor must verify the intended outcome is operating and sustained.',10,'"When objective follow-up evidence confirms implementation and sustained intended results"'::jsonb)
), upserted as (
  insert into public.hs_training_questions (
    course_id, question_code, question_text, question_type,
    options, explanation, points, display_order, active
  )
  select c.id, q.question_code, q.question_text, 'single_choice',
         q.options, q.explanation, 1, q.display_order, true
  from question_source q
  cross join public.hs_training_courses c
  where c.course_code = 'IA-REFRESHER-001'
  on conflict (course_id, question_code) do update set
    question_text = excluded.question_text,
    options = excluded.options,
    explanation = excluded.explanation,
    display_order = excluded.display_order,
    active = true
  returning id, question_code
)
insert into public.hs_training_question_answers (question_id, correct_answer, grading_rule)
select u.id, q.correct_answer, jsonb_build_object('match','exact')
from upserted u
join question_source q on q.question_code = u.question_code
on conflict (question_id) do update set
  correct_answer = excluded.correct_answer,
  grading_rule = excluded.grading_rule;

commit;

-- Expected result: IA-REFRESHER-001 | true | 7 | 10
select c.course_code, c.active,
       count(distinct m.id) as modules,
       count(distinct q.id) as questions
from public.hs_training_courses c
left join public.hs_training_modules m on m.course_id = c.id and m.active = true
left join public.hs_training_questions q on q.course_id = c.id and q.active = true
where c.course_code = 'IA-REFRESHER-001'
group by c.course_code, c.active;
