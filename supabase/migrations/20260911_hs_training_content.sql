-- RPG Excellence H&S Hub
-- File 16 V2: Original Risk Assessment Training Academy content
-- Run after 20260911_hs_hub_foundation.sql

begin;

-- ============================================================
-- INITIAL COURSE: EIGHT MODULES
-- ============================================================

with course as (
  select id from public.hs_training_courses where course_code = 'RA-INITIAL-001'
)
insert into public.hs_training_modules (
  course_id, module_number, title, learning_objective,
  module_type, estimated_minutes, active, content
)
select course.id, module_number, title, objective, module_type, minutes, true, content
from course
cross join (values
  (1, 'Why risk assessment matters',
   'Explain the purpose of a suitable and sufficient assessment and the responsibilities of those involved.',
   'lesson', 6,
   jsonb_build_object(
     'summary', 'Risk assessment is a practical decision process: understand the work, prevent harm and verify that controls remain effective.',
     'sections', jsonb_build_array(
       jsonb_build_object('heading','Purpose before paperwork','body','The assessment must help people plan and perform work safely. A completed form is not evidence that exposure is controlled.'),
       jsonb_build_object('heading','Proportionate judgement','body','The depth of assessment should reflect the complexity, uncertainty and potential consequence of the work.'),
       jsonb_build_object('heading','Suitable and sufficient','body','Define the scope, identify significant hazards and affected people, evaluate existing controls, decide further action and establish review arrangements.')
     ),
     'reflection', 'What operational decision should this assessment improve?'
   )),
  (2, 'Hazard or risk?',
   'Distinguish a source of harm from the likelihood and severity of a credible outcome.',
   'hazard_spotting', 7,
   jsonb_build_object(
     'summary', 'A hazard can cause harm. Risk expresses how likely harm is and how serious the credible consequence could be.',
     'sections', jsonb_build_array(
       jsonb_build_object('heading','Describe the source','body','Name the energy, substance, condition, behaviour or activity capable of causing harm.'),
       jsonb_build_object('heading','Describe exposure','body','Explain how people encounter the hazard during normal, abnormal, maintenance or emergency conditions.'),
       jsonb_build_object('heading','Describe credible harm','body','Use the reasonably foreseeable outcome, not an unsupported worst-case statement or a trivial symptom.')
     ),
     'interaction', jsonb_build_object('type','classify','instruction','Classify each statement as hazard, exposure, consequence or control.')
   )),
  (3, 'Who might be harmed?',
   'Identify all groups affected by the work and recognise factors that may increase vulnerability.',
   'scenario', 6,
   jsonb_build_object(
     'summary', 'Look beyond the person performing the task. Consider anyone who creates, encounters or is affected by the exposure.',
     'groups', jsonb_build_array('Employees','Contractors','Visitors','Members of the public','Young persons','New or expectant mothers','Disabled persons','Lone workers'),
     'scenario', jsonb_build_object('title','Maintenance during live operations','prompt','A contractor replaces a pump while production continues nearby. Identify everyone who may be affected and how.'),
     'key_message', 'Different groups may require different controls, information, supervision or emergency arrangements.'
   )),
  (4, 'Evaluate risk consistently',
   'Apply the RPG 5 by 5 matrix using evidence-based likelihood and credible severity.',
   'risk_matrix', 9,
   '{"summary":"Score the risk using controls that operate in practice.","likelihood":["1 Very unlikely","2 Unlikely","3 Possible","4 Likely","5 Very likely"],"severity":["1 No injury","2 First aid","3 Lost time under 7 days","4 Lost time 7 days or more","5 Disabling injury or fatality"],"bands":["1-4 Acceptable","5-9 Adequate","10-14 Inadequate","15-25 Unacceptable"],"interaction":{"type":"matrix","instruction":"Choose likelihood and severity, calculate the score and justify both selections."},"warning":"A number without an evidence-based rationale creates false precision."}'::jsonb),
  (5, 'Choose effective controls',
   'Select reasonably practicable controls using the hierarchy of control.',
   'control_hierarchy', 8,
   jsonb_build_object(
     'summary', 'Control the hazard as close to its source as possible. Do not default to training, signs or PPE when stronger options are reasonably practicable.',
     'hierarchy', jsonb_build_array(
       jsonb_build_object('level',1,'name','Eliminate','example','Remove the hazardous task, material or energy source.'),
       jsonb_build_object('level',2,'name','Substitute','example','Replace it with a less hazardous method, material or item.'),
       jsonb_build_object('level',3,'name','Engineering controls','example','Isolate people through guarding, enclosure, extraction or automation.'),
       jsonb_build_object('level',4,'name','Administrative controls','example','Use planning, competence, procedures, supervision and restricted access.'),
       jsonb_build_object('level',5,'name','PPE','example','Protect the individual where residual exposure remains.')
     ),
     'interaction', jsonb_build_object('type','rank_controls','instruction','Place proposed controls in hierarchy order and reject measures that do not address the exposure.')
   )),
  (6, 'Record significant findings',
   'Create a clear controlled record containing decisions, actions, ownership and evidence.',
   'lesson', 6,
   jsonb_build_object(
     'summary', 'A competent person who was not present should be able to understand the work, exposure, controls and outstanding action.',
     'record', jsonb_build_array('Scope and boundaries','People at risk','Hazard and credible harm','Existing controls','Initial risk rationale','Further controls','Residual risk decision','Owner and target date','Approval and review date'),
     'quality_test', 'Is every action specific, measurable, owned, time-bound and capable of verification?'
   )),
  (7, 'Communicate, monitor and review',
   'Recognise when controls must be communicated, monitored and reassessed.',
   'scenario', 6,
   jsonb_build_object(
     'summary', 'Approval does not finish the process. Controls must reach affected people and remain effective as work changes.',
     'review_triggers', jsonb_build_array('Planned review date','Change to process, equipment, materials or people','Incident, near miss or ill-health evidence','Control failure or overdue action','New legal or technical information','Worker feedback','Evidence that the assessment is no longer valid'),
     'scenario', jsonb_build_object('title','The unchanged form','prompt','A process has moved location and output doubled, but the assessment review date is next year. Decide what must happen now.')
   )),
  (8, 'Applied assessment challenge',
   'Demonstrate the ability to build and defend a workplace risk assessment.',
   'checkpoint', 7,
   jsonb_build_object(
     'summary', 'Complete an applied scenario before the final knowledge assessment.',
     'scenario', jsonb_build_object(
       'title','Pedestal drill in a shared workshop',
       'context','A trained operator uses a pedestal drill. Other employees walk behind the workstation. The guard is adjustable, swarf is removed manually and maintenance isolation is informal.',
       'tasks', jsonb_build_array('Identify significant hazards','Identify people exposed','Evaluate current risk','Choose stronger controls','Set residual risk','Define action and review triggers')
     ),
     'completion_rule', 'Complete every decision and provide a rationale before attempting the final assessment.'
   ))
) as module(module_number,title,objective,module_type,minutes,content)
on conflict (course_id, module_number) do update set
  title = excluded.title,
  learning_objective = excluded.learning_objective,
  module_type = excluded.module_type,
  estimated_minutes = excluded.estimated_minutes,
  content = excluded.content,
  active = true;

-- ============================================================
-- REFRESHER COURSE: SIX CONCISE MODULES
-- ============================================================

with course as (
  select id from public.hs_training_courses where course_code = 'RA-REFRESHER-001'
)
insert into public.hs_training_modules (
  course_id, module_number, title, learning_objective,
  module_type, estimated_minutes, active, content
)
select course.id, module_number, title, objective, module_type, minutes, true, content
from course
cross join (values
  (1,'Hazard-recognition reset','Refresh the distinction between hazards, exposure and consequences.','hazard_spotting',4,jsonb_build_object('summary','Identify the source, route of exposure and credible harm before discussing scores.','interaction',jsonb_build_object('type','classify','instruction','Classify rapid workplace examples.'))),
  (2,'Risk-matrix calibration','Recalibrate likelihood and severity decisions using evidence.','risk_matrix',4,jsonb_build_object('summary','Score actual control performance and document the basis for the decision.','interaction',jsonb_build_object('type','matrix','instruction','Compare two assessors and resolve inconsistent scoring.'))),
  (3,'Control hierarchy challenge','Select stronger controls and recognise overreliance on PPE and procedures.','control_hierarchy',4,jsonb_build_object('summary','Prioritise elimination, substitution and engineering controls before administrative controls and PPE.','interaction',jsonb_build_object('type','rank_controls','instruction','Rank proposed controls from strongest to weakest.'))),
  (4,'Change and review triggers','Recognise when an existing assessment must be reviewed.','scenario',3,jsonb_build_object('summary','Do not wait for the calendar when work, evidence or exposure has changed.','review_triggers',jsonb_build_array('Process change','Incident or near miss','Control failure','New information','Worker concern'))),
  (5,'Common failure traps','Detect weak assessment practices before they enter the controlled record.','scenario',3,jsonb_build_object('traps',jsonb_build_array('Generic hazards','Copied controls','Unsupported scores','No vulnerable-person consideration','Actions without owners','Approval without communication'))),
  (6,'Refresher knowledge check','Confirm retained understanding and practical judgement.','checkpoint',2,jsonb_build_object('summary','Achieve at least 80 percent to renew the completion certificate.'))
) as module(module_number,title,objective,module_type,minutes,content)
on conflict (course_id, module_number) do update set
  title = excluded.title,
  learning_objective = excluded.learning_objective,
  module_type = excluded.module_type,
  estimated_minutes = excluded.estimated_minutes,
  content = excluded.content,
  active = true;

-- ============================================================
-- FINAL-ASSESSMENT QUESTIONS
-- Correct answers remain in a protected table with no learner read policy.
-- ============================================================

with question_source(course_code, question_code, question_text, options, explanation, display_order, correct_answer) as (
  values
  ('RA-INITIAL-001','INI-01','Which statement best defines a hazard?',jsonb_build_array('The chance that harm will occur','Anything with the potential to cause harm','The final numerical score','An action target date'),'A hazard is a source or situation with the potential to cause harm.',1,'"Anything with the potential to cause harm"'::jsonb),
  ('RA-INITIAL-001','INI-02','When should existing controls be considered effective for scoring?',jsonb_build_array('When they appear in a procedure','When a manager says they exist','When they are implemented and operating in practice','When training has been booked'),'Risk should be scored against controls that are genuinely implemented and operating.',2,'"When they are implemented and operating in practice"'::jsonb),
  ('RA-INITIAL-001','INI-03','Who should be considered in a workplace risk assessment?',jsonb_build_array('Only the person performing the task','Only direct employees','Anyone who may be affected by the work','Only people previously injured'),'The assessment must consider all people who may be affected.',3,'"Anyone who may be affected by the work"'::jsonb),
  ('RA-INITIAL-001','INI-04','What does a risk score of 16 represent in the RPG matrix?',jsonb_build_array('Acceptable','Adequate','Inadequate','Unacceptable'),'Scores from 15 to 25 are unacceptable.',4,'"Unacceptable"'::jsonb),
  ('RA-INITIAL-001','INI-05','Which control is normally strongest?',jsonb_build_array('Warning sign','Safety gloves','Eliminating the hazardous activity','Additional supervision'),'Elimination removes the hazard rather than relying on behaviour or personal protection.',5,'"Eliminating the hazardous activity"'::jsonb),
  ('RA-INITIAL-001','INI-06','What should happen when residual risk remains elevated?',jsonb_build_array('Hide the score until work is complete','Record a controlled decision, authority and accountable action','Automatically mark the assessment approved','Replace the score with an average'),'Elevated exposure requires explicit governance and action.',6,'"Record a controlled decision, authority and accountable action"'::jsonb),
  ('RA-INITIAL-001','INI-07','Which is a valid reason to review an assessment early?',jsonb_build_array('The document still looks professional','Equipment or process conditions change','The assessor is on annual leave','A blank copy is available'),'Material change can invalidate assumptions, exposure and controls.',7,'"Equipment or process conditions change"'::jsonb),
  ('RA-INITIAL-001','INI-08','What makes an action suitable for control?',jsonb_build_array('It uses general wording','It has no fixed owner','It is specific, owned, time-bound and verifiable','It depends entirely on memory'),'Controlled actions must be clear, accountable and capable of verification.',8,'"It is specific, owned, time-bound and verifiable"'::jsonb),
  ('RA-INITIAL-001','INI-09','Why should workers be consulted?',jsonb_build_array('Only to obtain a signature','They understand real work conditions and control performance','To transfer legal responsibility','To avoid documenting hazards'),'Worker knowledge helps reveal actual exposure, variation and control weakness.',9,'"They understand real work conditions and control performance"'::jsonb),
  ('RA-INITIAL-001','INI-10','What confirms a completed action is effective?',jsonb_build_array('The action owner says it is complete','The target date passes','Objective verification shows the intended control operates and reduces risk','The action is removed from the list'),'Completion and effectiveness are different decisions.',10,'"Objective verification shows the intended control operates and reduces risk"'::jsonb),
  ('RA-REFRESHER-001','REF-01','A procedure requires guarding, but the guard is routinely left open. How should risk be scored?',jsonb_build_array('Assume the guard is closed','Use actual operating conditions','Give the lowest score','Do not assess the task'),'Risk evaluation must reflect controls as they operate in practice.',1,'"Use actual operating conditions"'::jsonb),
  ('RA-REFRESHER-001','REF-02','Which change should trigger review?',jsonb_build_array('A different document font','Production moves and output increases','The reference number stays the same','The assessor prints a copy'),'Changes affecting exposure or assumptions require review.',2,'"Production moves and output increases"'::jsonb),
  ('RA-REFRESHER-001','REF-03','Which option best follows the hierarchy?',jsonb_build_array('Issue PPE before considering alternatives','Remove the hazardous solvent from the process','Add another warning sign','Ask workers to be more careful'),'Removing the hazardous substance is elimination.',3,'"Remove the hazardous solvent from the process"'::jsonb),
  ('RA-REFRESHER-001','REF-04','What is wrong with an unsupported risk score?',jsonb_build_array('It may create false precision and inconsistent decisions','It is always too low','It cannot be printed','It requires no review'),'Scores require an evidence-based rationale.',4,'"It may create false precision and inconsistent decisions"'::jsonb),
  ('RA-REFRESHER-001','REF-05','When can an action be closed as effective?',jsonb_build_array('Immediately after assignment','When implementation and intended risk reduction are objectively verified','When the owner changes','When the assessment is archived'),'Independent evidence should confirm the control works as intended.',5,'"When implementation and intended risk reduction are objectively verified"'::jsonb)
), inserted as (
  insert into public.hs_training_questions (
    course_id, question_code, question_text, question_type,
    options, explanation, points, display_order, active
  )
  select c.id, s.question_code, s.question_text, 'single_choice',
         s.options, s.explanation, 1, s.display_order, true
  from question_source s
  join public.hs_training_courses c on c.course_code = s.course_code
  on conflict (course_id, question_code) do update set
    question_text = excluded.question_text,
    options = excluded.options,
    explanation = excluded.explanation,
    display_order = excluded.display_order,
    active = true
  returning id, course_id, question_code
)
insert into public.hs_training_question_answers (question_id, correct_answer, grading_rule)
select i.id, s.correct_answer, jsonb_build_object('match','exact')
from inserted i
join public.hs_training_courses c on c.id = i.course_id
join question_source s on s.course_code = c.course_code and s.question_code = i.question_code
on conflict (question_id) do update set
  correct_answer = excluded.correct_answer,
  grading_rule = excluded.grading_rule;

update public.hs_training_courses
set active = true,
    published_at = coalesce(published_at, now()),
    updated_at = now()
where course_code in ('RA-INITIAL-001','RA-REFRESHER-001');

commit;

-- Verification
select c.course_code, c.active,
       count(distinct m.id) as modules,
       count(distinct q.id) as questions
from public.hs_training_courses c
left join public.hs_training_modules m on m.course_id = c.id and m.active = true
left join public.hs_training_questions q on q.course_id = c.id and q.active = true
where c.course_code in ('RA-INITIAL-001','RA-REFRESHER-001')
group by c.course_code, c.active
order by c.course_code;
