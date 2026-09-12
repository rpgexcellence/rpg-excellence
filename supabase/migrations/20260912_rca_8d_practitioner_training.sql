-- RPG Excellence RCA–8D Academy
-- Original practitioner course informed by recognised structured problem-solving practice.

begin;

alter table public.hs_training_courses
  add column if not exists academy_code text not null default 'health_safety';

create index if not exists hs_training_courses_academy_code_idx
  on public.hs_training_courses (academy_code, active, published_at);

insert into public.hs_training_courses (
  course_code, title, course_type, description, duration_minutes,
  pass_mark, validity_months, price_pence, currency, version,
  academy_code, active, published_at
)
values (
  'RCA-8D-001',
  'RCA and Corrective Action Practitioner',
  'initial',
  'Interactive practitioner training covering problem definition, evidence gathering, containment, cause analysis, corrective action, implementation and effectiveness verification through a controlled 8D workflow.',
  90, 80, 36, 4999, 'gbp', 1,
  'rca_8d', true, now()
)
on conflict (course_code) do update set
  title = excluded.title,
  course_type = excluded.course_type,
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
  select id from public.hs_training_courses where course_code = 'RCA-8D-001'
)
insert into public.hs_training_modules (
  course_id, module_number, title, learning_objective,
  module_type, estimated_minutes, active, content
)
select course.id, module_number, title, objective, module_type, minutes, true, content
from course
cross join (values
  (1, 'Problem response and investigation threshold',
   'Distinguish correction, containment and corrective action and decide the proportionate investigation route.',
   'scenario', 7,
   jsonb_build_object(
     'summary','The first response protects people, customers and operations while preserving facts. It must not replace investigation of recurrence risk.',
     'sections',jsonb_build_array(
       jsonb_build_object('heading','Correction','body','Address the detected nonconformity or immediate consequence.'),
       jsonb_build_object('heading','Containment','body','Control the risk that the issue spreads, escapes or causes further harm while analysis continues.'),
       jsonb_build_object('heading','Corrective action','body','Remove or control verified causes so the problem does not recur.')
     ),
     'scenario',jsonb_build_object('title','Repeated dimensional escape','context','A customer finds an out-of-tolerance component. Inspection contains the delivered batch, but two similar internal deviations occurred last month.'),
     'interaction',jsonb_build_object('type','triage_builder','instruction','Select the immediate correction, containment boundary and investigation level. Explain the evidence that supports your decision.')
   )),
  (2, 'D1: Team, authority and scope',
   'Create a competent cross-functional team with defined authority, roles and investigation boundaries.',
   'scenario', 8,
   jsonb_build_object(
     'summary','The investigation team must represent the process, technical knowledge, affected customer or user, and independent challenge needed for the problem.',
     'sections',jsonb_build_array(
       jsonb_build_object('heading','Competence','body','Include people who understand the work, controls, failure mode and evidence sources.'),
       jsonb_build_object('heading','Authority','body','Name a sponsor who can remove barriers and approve resources and decisions.'),
       jsonb_build_object('heading','Scope','body','Define the product, process, sites, time period and interfaces under investigation.')
     ),
     'scenario',jsonb_build_object('title','Coating adhesion failures across two sites','context','Failures appear after a material change. Production, purchasing, laboratory testing and a supplier all hold part of the evidence.'),
     'interaction',jsonb_build_object('type','team_scope','instruction','Select the necessary roles, assign leadership and define what the investigation includes and excludes.')
   )),
  (3, 'D2: Define the problem and gather facts',
   'Build a precise problem statement and evidence plan without embedding an assumed cause.',
   'scenario', 11,
   jsonb_build_object(
     'summary','A useful problem definition states what failed, where and when it occurred, the extent, and the effect on requirements or objectives.',
     'tools',jsonb_build_array('Is and is-not comparison','Event timeline','Process walk-through','Records and physical evidence','Open witness interviews','Change history','Measurement-system check'),
     'warning','Do not insert why the problem occurred into the problem statement before causal analysis.',
     'scenario',jsonb_build_object('title','Intermittent weld porosity','context','Three batches failed radiography after a consumable change. Other batches using the same specification passed. Shift, machine and environmental data are incomplete.'),
     'interaction',jsonb_build_object('type','problem_definition','instruction','Build the problem statement, identify the missing facts and choose the next evidence sources.')
   )),
  (4, 'D3: Design and verify containment',
   'Set a risk-based containment boundary and verify that temporary controls prevent further escape.',
   'scenario', 8,
   jsonb_build_object(
     'summary','Containment should cover affected and potentially affected outputs without creating an unsupported assumption that all other material is safe.',
     'containment_test',jsonb_build_array('Clear affected population','Traceable segregation','Defined inspection or control method','Named owner','Start and review dates','Evidence that the control detects or prevents escape','Exit criteria'),
     'scenario',jsonb_build_object('title','Certificate data mismatch','context','A customer reports one certificate with the wrong material grade. The same template and data source support 240 certificates issued during the quarter.'),
     'interaction',jsonb_build_object('type','containment_engine','instruction','Choose the containment boundary, required checks and release authority. The engine will challenge any group left outside the boundary.')
   )),
  (5, 'D4: Build causal paths with three-direction 5 Why',
   'Analyse occurrence, non-detection and system prevention paths and support every causal link with evidence.',
   'scenario', 13,
   jsonb_build_object(
     'summary','One linear five-why chain often stops too early. Test why the failure occurred, why controls did not detect it and why the management system allowed the weakness.',
     'directions',jsonb_build_array(
       jsonb_build_object('name','Occurrence','question','Which conditions and actions produced the failure?'),
       jsonb_build_object('name','Escape','question','Why did planned detection fail to identify or contain it?'),
       jsonb_build_object('name','System','question','Why did governance, design or change control fail to prevent the weakness?')
     ),
     'logic_rules',jsonb_build_array('Each answer must explain the preceding effect','Ask why else to identify parallel causes','Separate conditions from actions','Record evidence or mark the link as a hypothesis','Stop only when the team reaches a controllable systemic cause'),
     'interaction',jsonb_build_object('type','three_path_five_why','instruction','Build three linked why chains. Mark each node proven, disproven or requiring evidence, then identify the actionable causes.')
   )),
  (6, 'Human factors and cause validation',
   'Move beyond blame by identifying error-producing conditions and validating cause-and-effect relationships.',
   'scenario', 9,
   jsonb_build_object(
     'summary','Human error describes an outcome. Investigation must examine the conditions that made the action likely and the controls that should have anticipated foreseeable error.',
     'factor_groups',jsonb_build_array('Task and workload','Equipment and interface design','Procedures and information','Competence and supervision','Environment and interruptions','Planning and change','Leadership signals and competing priorities'),
     'validation',jsonb_build_array('Evidence confirms the cause existed','The cause occurred before the effect','The proposed mechanism is technically credible','Removing or controlling the cause would change recurrence likelihood','Alternative explanations were considered'),
     'scenario',jsonb_build_object('title','Wrong programme selected after changeover','context','An experienced operator selected the previous product programme. Labels were similar, the screen truncated the programme name and the independent check had been removed to recover output.'),
     'interaction',jsonb_build_object('type','human_factor_map','instruction','Identify the error-producing conditions, rejected blame statements and evidence needed to validate each causal factor.')
   )),
  (7, 'D5: Select corrective actions',
   'Compare solution strength and select actions that address verified causes without transferring unacceptable risk.',
   'decision_lab', 9,
   jsonb_build_object(
     'summary','Effective corrective action acts on the verified causal mechanism. Training or procedure revision alone rarely controls a design or system weakness.',
     'selection_tests',jsonb_build_array('Direct connection to a verified cause','Proportionate reduction of recurrence risk','Control lies within accountable authority','No unacceptable new failure mode','Specific owner and deliverable','Practical completion date','Measurable success criteria'),
     'solution_strength',jsonb_build_array('Eliminate the failure opportunity','Engineer prevention or automatic detection','Standardise and mistake-proof the process','Strengthen administrative control','Brief or train where competence is a verified cause'),
     'interaction',jsonb_build_object('type','action_comparator','instruction','Rank candidate actions by strength, reject actions that do not address a cause and build the approved action package.')
   )),
  (8, 'D6: Implement and validate actions',
   'Control implementation, retain objective evidence and confirm that each action performs as designed.',
   'scenario', 8,
   jsonb_build_object(
     'summary','Closing an action requires evidence of implementation and validation that the new or changed control operates as intended.',
     'evidence',jsonb_build_array('Approved design or process change','Updated controlled information','Installation or configuration record','Competence evidence where relevant','Operational test result','Change-risk review','Owner and approver sign-off'),
     'scenario',jsonb_build_object('title','Interlock modification complete','context','Engineering reports the interlock action complete. A purchase order, photograph and revised drawing exist, but no functional challenge test has been recorded.'),
     'interaction',jsonb_build_object('type','implementation_gate','instruction','Decide which evidence proves completion, which proves validation and what remains before the action can close.')
   )),
  (9, 'D7: Prevent recurrence across the system',
   'Identify where the same causal weakness could exist and update applicable controls, learning and risk records.',
   'decision_lab', 8,
   jsonb_build_object(
     'summary','System prevention tests horizontal and vertical extent. A local fix may leave the same vulnerability in other products, sites, shifts, suppliers or management processes.',
     'extent_review',jsonb_build_array('Similar products and services','Equivalent equipment or software','Other sites and shifts','Shared suppliers or data sources','Related procedures and training','Risk assessments and control plans','Audit and monitoring programmes','Design and change processes'),
     'interaction',jsonb_build_object('type','recurrence_scan','instruction','Select the applicable extent population, justify exclusions and define the system changes needed to prevent a comparable failure.')
   )),
  (10, 'D8: Verify effectiveness and close',
   'Use independent outcome evidence over a justified monitoring period before recognising closure and lessons learned.',
   'checkpoint', 9,
   jsonb_build_object(
     'summary','Completion answers whether tasks were done. Effectiveness answers whether the actions controlled the verified causes and delivered sustained intended results.',
     'review_design',jsonb_build_array('Baseline and expected outcome','Leading and lagging measures','Monitoring duration linked to recurrence opportunity','Sample size and operating conditions','Independent reviewer','Failure and reopening criteria','Lessons and recognition'),
     'scenario',jsonb_build_object('title','No recurrence reported for four weeks','context','All actions are complete, but the affected process has run only twice since implementation. The original failure occurred about once every 20 cycles.'),
     'interaction',jsonb_build_object('type','effectiveness_engine','instruction','Set the monitoring evidence and duration, decide whether closure is justified and record what would trigger reopening.')
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
  ('RCA8D-01','Which statement correctly distinguishes correction from corrective action?',jsonb_build_array('Correction removes the cause; corrective action repairs the item','Correction addresses the detected issue; corrective action addresses verified causes to prevent recurrence','They are identical','Corrective action is only required when correction fails'),'Correction deals with the detected nonconformity. Corrective action controls the cause of recurrence.',1,'"Correction addresses the detected issue; corrective action addresses verified causes to prevent recurrence"'::jsonb),
  ('RCA8D-02','What is the strongest basis for setting an initial containment boundary?',jsonb_build_array('The first defective item only','The affected and potentially affected population supported by traceability, timing and process evidence','Whatever stock is easiest to inspect','The customer complaint quantity'),'Containment must cover the credible extent of risk while facts are gathered.',2,'"The affected and potentially affected population supported by traceability, timing and process evidence"'::jsonb),
  ('RCA8D-03','Which problem statement is most suitable for causal analysis?',jsonb_build_array('Operators caused repeated failures through carelessness','Three assemblies from batches 24A and 24C failed the 6 mm dimensional requirement at final inspection between 8 and 10 September','The inspection system is ineffective','Management failed to provide enough training'),'A problem statement should define the verified failure, extent, location and time without assuming a cause.',3,'"Three assemblies from batches 24A and 24C failed the 6 mm dimensional requirement at final inspection between 8 and 10 September"'::jsonb),
  ('RCA8D-04','Why should an 8D team analyse occurrence, non-detection and system prevention separately?',jsonb_build_array('To create more actions','Because the failure can have different causal paths for creation, escape and systemic allowance','Because every path must end in training','To avoid collecting evidence'),'The three paths expose distinct weaknesses that one linear chain may miss.',4,'"Because the failure can have different causal paths for creation, escape and systemic allowance"'::jsonb),
  ('RCA8D-05','How should a team treat a causal link that has not yet been supported by evidence?',jsonb_build_array('Record it as proven','Delete it immediately','Record it as a hypothesis with an evidence action','Convert it into the root cause'),'Unverified links remain hypotheses until evidence proves or disproves them.',5,'"Record it as a hypothesis with an evidence action"'::jsonb),
  ('RCA8D-06','Why is human error usually an incomplete cause statement?',jsonb_build_array('People never make mistakes','It describes the action or outcome but not the conditions and failed controls that made it likely','It cannot be recorded in an investigation','It always proves misconduct'),'A useful analysis examines error-producing conditions and system defences rather than stopping at blame.',6,'"It describes the action or outcome but not the conditions and failed controls that made it likely"'::jsonb),
  ('RCA8D-07','Which proposed action most directly controls selection of the wrong machine programme?',jsonb_build_array('Remind operators to be careful','Issue a general awareness email','Interlock the programme to the scanned product identity and challenge-test the function','Repeat the existing training annually'),'A verified engineering control prevents or detects the error at the point of selection.',7,'"Interlock the programme to the scanned product identity and challenge-test the function"'::jsonb),
  ('RCA8D-08','What evidence best validates a newly installed safety interlock?',jsonb_build_array('A purchase order','A photograph','A witnessed functional challenge test under defined operating conditions','An owner email saying complete'),'Implementation evidence shows the device exists. A controlled functional test shows whether it performs as intended.',8,'"A witnessed functional challenge test under defined operating conditions"'::jsonb),
  ('RCA8D-09','What is the purpose of an extent-of-condition review?',jsonb_build_array('To close the original action faster','To identify other places where the same causal weakness or failure mechanism could exist','To reduce the investigation team','To transfer ownership to another site'),'Systemic prevention requires a justified scan of comparable products, processes and locations.',9,'"To identify other places where the same causal weakness or failure mechanism could exist"'::jsonb),
  ('RCA8D-10','When should temporary containment normally be removed?',jsonb_build_array('As soon as corrective actions are approved','When permanent controls are implemented and validated and the authorised exit criteria are met','After seven days','When containment becomes inconvenient'),'Containment remains until the permanent control protects the affected risk and defined release criteria are satisfied.',10,'"When permanent controls are implemented and validated and the authorised exit criteria are met"'::jsonb),
  ('RCA8D-11','Which effectiveness review is most credible?',jsonb_build_array('No complaints were received for one week','All actions show complete in the tracker','An independent review compares defined measures with baseline across enough recurrence opportunities','The action owner confirms confidence'),'Effectiveness requires outcome evidence, a justified period and independent evaluation.',11,'"An independent review compares defined measures with baseline across enough recurrence opportunities"'::jsonb),
  ('RCA8D-12','What should happen when corrective actions fail the effectiveness criteria?',jsonb_build_array('Close the case because the actions were completed','Extend the due date without further analysis','Reopen the case, reassess causes and controls, and approve a revised plan','Delete the original evidence'),'Failure against planned criteria requires controlled reopening and renewed analysis.',12,'"Reopen the case, reassess causes and controls, and approve a revised plan"'::jsonb)
), upserted as (
  insert into public.hs_training_questions (
    course_id, question_code, question_text, question_type,
    options, explanation, points, display_order, active
  )
  select c.id, q.question_code, q.question_text, 'single_choice',
         q.options, q.explanation, 1, q.display_order, true
  from question_source q
  cross join public.hs_training_courses c
  where c.course_code = 'RCA-8D-001'
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

-- Expected result: RCA-8D-001 | true | 10 | 12 | 12
select c.course_code, c.active,
       count(distinct m.id) as modules,
       count(distinct q.id) as questions,
       count(distinct a.question_id) as answer_keys
from public.hs_training_courses c
left join public.hs_training_modules m on m.course_id = c.id and m.active = true
left join public.hs_training_questions q on q.course_id = c.id and q.active = true
left join public.hs_training_question_answers a on a.question_id = q.id
where c.course_code = 'RCA-8D-001'
group by c.course_code, c.active;

