-- RPG Excellence H&S Hub
-- Expanded course content based on the supplied initial training,
-- refresher training and 2026 risk assessment template.

begin;

update public.hs_training_modules m
set content = v.content
from (
  select c.id as course_id, x.module_number, x.content
  from public.hs_training_courses c
  join (
    values
    ('RA-INITIAL-001', 1, $json$
      {
        "summary":"Risk assessment is a practical process for preventing injury and ill health. It helps the organisation plan work, decide whether controls are strong enough and demonstrate that significant risks have been addressed.",
        "sections":[
          {"heading":"The moral reason","body":"People should finish work without injury or damage to their health. Consider whether the arrangements would be acceptable if the person exposed were someone close to you."},
          {"heading":"The legal reason","body":"The Health and Safety at Work etc. Act 1974 establishes the general duty to protect employees and others. Regulation 3 of the Management of Health and Safety at Work Regulations 1999 requires a suitable and sufficient assessment of risk."},
          {"heading":"The business reason","body":"Effective assessment reduces disruption, damage, absence, claims and enforcement risk. It also improves planning because the equipment, competence and precautions are considered before work begins."},
          {"heading":"Suitable and sufficient","body":"The assessment must identify the significant hazards, affected people, existing controls and further action. Its depth should reflect the complexity and possible consequences of the work."},
          {"heading":"Who records the findings","body":"Employers with five or more employees must record significant findings and groups of employees identified as especially at risk. The record must remain clear enough for people to use."}
        ],
        "scenario":{"title":"A familiar task has changed","context":"A team has used the same cutting process for years. A new material now produces visible fume, but the old assessment remains displayed.","tasks":["Identify why the old record may no longer be suitable.","State who should stop and review the work.","Describe the evidence needed before work continues."]},
        "reflection":"What work activity in your area would cause serious harm if a familiar control failed?",
        "key_message":"The value of an assessment lies in the decisions and controls it produces, not the existence of a completed form."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 2, $json$
      {
        "summary":"A hazard is something with the potential to cause harm. Risk considers the likelihood that harm will occur and the severity of the credible outcome.",
        "sections":[
          {"heading":"Describe the source","body":"Name the energy, substance, condition, behaviour or activity that can cause harm. Examples include moving machinery, electricity, work at height, welding fume and manual handling."},
          {"heading":"Describe the exposure","body":"Explain how a person encounters the hazard during normal work, cleaning, maintenance, breakdown, start-up or emergency conditions."},
          {"heading":"Describe credible harm","body":"State the foreseeable injury or ill-health outcome. Replace vague wording such as injury with a specific outcome such as crushing injury, occupational asthma, hearing loss or chemical burn."},
          {"heading":"Look beyond the obvious","body":"Include noise, fatigue, stress, poor ergonomics and gradual exposure. Review incident records, equipment instructions, safety data sheets and worker experience."},
          {"heading":"Separate cause and outcome","body":"An unguarded rotating shaft is the hazard. Contact during adjustment is the exposure. Entanglement and severe injury are the credible consequences."}
        ],
        "groups":["Physical","Mechanical","Chemical","Biological","Ergonomic","Psychosocial","Environmental"],
        "scenario":{"title":"Bench grinder wheel change","context":"An operator changes an abrasive wheel, tests it with the guard open and stands directly in front of it during run-up.","tasks":["Identify the hazard source.","Describe the exposure route.","State the worst credible harm without exaggeration.","Identify an abnormal condition that the assessment must cover."]},
        "interaction":{"type":"classify","instruction":"Using the grinder scenario, record one hazard, one exposure route and one credible consequence. Keep each description separate and specific."},
        "key_message":"Clear hazard, exposure and consequence descriptions lead to better control decisions."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 3, $json$
      {
        "summary":"Consider everyone who could create, encounter or be affected by the hazard. The person doing the task is only one part of the assessment.",
        "sections":[
          {"heading":"Directly involved people","body":"Consider operators, supervisors, maintenance staff and anyone assisting with the work."},
          {"heading":"People nearby","body":"Include other employees, contractors, visitors, delivery drivers and members of the public who may enter or pass the area."},
          {"heading":"People at greater risk","body":"Young or inexperienced workers, new starters, pregnant workers, disabled people, lone workers and people with relevant health conditions may need different controls."},
          {"heading":"Different exposure routes","body":"The operator may face direct contact while others receive noise, fume, dust, projectiles, vehicle interaction or loss of access to an emergency route."},
          {"heading":"Consult the people doing the work","body":"Workers often know about shortcuts, difficult steps, intermittent failures and non-routine conditions that written instructions miss."}
        ],
        "groups":["Employees","Contractors","Visitors","Public","New starters","Young persons","Pregnant workers","Disabled people","Lone workers"],
        "scenario":{"title":"Pump maintenance during production","context":"A contractor removes a pump while production continues. Operators work nearby, a delivery route crosses the area and the isolation point is outside the contractor's view.","tasks":["List every group that may be affected.","Describe how each group could be harmed.","Identify who must be consulted before deciding controls."]},
        "interaction":{"type":"people_map","instruction":"Create a short people-at-risk map for the pump task. Link each person or group to a specific exposure and harm."},
        "key_message":"Different people may require different information, supervision, access control or emergency arrangements."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 4, $json$
      {
        "summary":"The RPG matrix combines likelihood and severity. The calculation is simple, but the quality of the result depends on evidence-based judgement.",
        "sections":[
          {"heading":"Likelihood","body":"Consider frequency, duration, number of people exposed, previous events, foreseeable error and the reliability of current controls."},
          {"heading":"Severity","body":"Use the worst credible outcome from the exposure being assessed. Avoid an impossible worst case and avoid reducing the score merely because an incident has not happened recently."},
          {"heading":"Score and action","body":"Scores 1–4 are acceptable, 5–9 adequate, 10–14 inadequate and 15–25 unacceptable. Inadequate risks need owned improvement. Unacceptable work must not proceed until risk is reduced."},
          {"heading":"Initial and residual risk","body":"Initial risk reflects current controls. Residual risk reflects the position after agreed further controls have been implemented, not the hoped-for result before action is complete."},
          {"heading":"Record the rationale","body":"Two assessors should be able to understand why the selected likelihood and severity values are reasonable."}
        ],
        "likelihood":["1 Very unlikely","2 Unlikely","3 Possible","4 Likely","5 Very likely"],
        "severity":["1 Insignificant","2 Minor","3 Moderate","4 Major","5 Catastrophic"],
        "scenario":{"title":"Occasional entry into a low-oxygen pit","context":"Entry occurs monthly. A fixed oxygen monitor is installed, but recent pump failures and overdue portable-detector calibration have been identified.","tasks":["Select and justify an initial likelihood score.","Select and justify the credible severity.","Calculate the rating and determine the required action.","Explain what evidence would justify a lower residual likelihood."]},
        "interaction":{"type":"matrix","instruction":"Record your initial likelihood, severity, score and rationale for the pit-entry scenario. State whether the work can proceed."},
        "warning":"Do not lower a score because a planned control appears in the action column. Re-score only after implementation and verification."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 5, $json$
      {
        "summary":"Choose controls in the order of the general principles of prevention. Strong controls act on the source or physically separate people from danger.",
        "sections":[
          {"heading":"Start at the top","body":"First consider whether the activity or hazardous element can be removed. If elimination is not reasonably practicable, consider a safer material, method or item of equipment."},
          {"heading":"Engineering before behaviour","body":"Guarding, enclosure, extraction, interlocks, automation and segregation remain effective without relying entirely on memory or compliance."},
          {"heading":"Administrative controls","body":"Procedures, permits, training, supervision, job rotation, inspections and signage help organise work but depend on people acting correctly every time."},
          {"heading":"PPE as the last line","body":"PPE protects the wearer rather than removing the hazard. It requires correct selection, fit, compatibility, storage, maintenance and use."},
          {"heading":"Combine and verify","body":"Higher risks often require several layers. Verify that each measure exists, works under real conditions and has a clear owner."}
        ],
        "hierarchy":[
          {"level":1,"name":"Eliminate","example":"Remove the task, hazardous material or need for exposure."},
          {"level":2,"name":"Substitute","example":"Use a safer process, material or lower-energy method."},
          {"level":3,"name":"Engineering controls","example":"Use guarding, enclosure, extraction, interlocks or remote operation."},
          {"level":4,"name":"Administrative controls","example":"Use controlled procedures, permits, competence, supervision and restricted access."},
          {"level":5,"name":"PPE","example":"Protect residual exposure with suitable and maintained personal equipment."}
        ],
        "scenario":{"title":"Welding fume in an enclosed bay","context":"The current controls are a warning sign, a disposable mask and an instruction to keep the door open.","tasks":["Identify the weaknesses in the current controls.","Propose options at each relevant hierarchy level.","Select a practical control package and state how it will be verified."]},
        "interaction":{"type":"rank_controls","instruction":"Record your proposed controls for the welding task in hierarchy order. Explain why the package reduces exposure at source."},
        "key_message":"A long list of weak controls does not equal one reliable control at source."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 6, $json$
      {
        "summary":"The assessment record must allow another competent person to understand the activity, hazards, decisions, actions and review arrangements.",
        "sections":[
          {"heading":"Define the activity","body":"State the location, equipment, people, boundaries and operating conditions. Avoid titles that are too broad to identify the work."},
          {"heading":"Record significant findings","body":"Link each hazard to affected people, credible harm, existing controls and the evidence used to rate risk."},
          {"heading":"Control further action","body":"Every action needs a clear description, named owner and target date. Interim restrictions may be necessary until completion."},
          {"heading":"Assess residual risk honestly","body":"Record residual scores only after identifying the exact further controls. Confirm implementation separately before closing the action."},
          {"heading":"Approve and communicate","body":"The assessor and responsible manager should confirm that the scope and controls are adequate. Brief affected people in a form they can understand."}
        ],
        "record":["Activity and boundaries","People at risk","Hazard and exposure","Credible harm","Existing controls","Initial rating and rationale","Further controls","Action owner","Target date","Residual rating","Approval","Review date"],
        "scenario":{"title":"Poorly written assessment entry","context":"The record says: Hazard: machinery. Harm: injury. Controls: trained staff and PPE. Risk: medium.","tasks":["Identify the missing information.","Rewrite the hazard, exposure and harm description.","Define one action with an owner, date and completion evidence."]},
        "interaction":{"type":"record_quality","instruction":"Rewrite the poor entry so that a competent reviewer can understand the task, exposure, controls and required action."},
        "quality_test":"Could a person who was not present understand what must happen before the work starts?"
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 7, $json$
      {
        "summary":"A risk assessment remains effective only while it reflects the work and its controls. Communication, monitoring and review keep the record connected to practice.",
        "sections":[
          {"heading":"Communicate before exposure","body":"Brief the people doing or affected by the work. Confirm understanding where the task, workforce or consequences justify it."},
          {"heading":"Monitor controls","body":"Use inspection, maintenance, exposure monitoring, supervision, worker feedback and event data to confirm controls continue to operate."},
          {"heading":"Review after change","body":"Changes to equipment, materials, process, location, staffing, workload or environment can invalidate earlier assumptions."},
          {"heading":"Review after learning","body":"An incident, near miss, control failure, health concern, audit finding or new legal information should trigger review."},
          {"heading":"Use planned review dates","body":"A date prompts reconsideration. It does not replace immediate review when evidence shows that the assessment may no longer be valid."}
        ],
        "review_triggers":["Incident or near miss","Control failure","New equipment or material","Process or layout change","Different people or staffing","New legal or technical information","Worker concern","Monitoring result","Planned review date"],
        "scenario":{"title":"Gradual control deterioration","context":"An extraction system still operates, but airflow has reduced, inspection defects remain open and workers report more visible fume.","tasks":["Identify the review triggers.","Define immediate precautions.","State what evidence is needed before accepting the control as effective."]},
        "interaction":{"type":"review_decision","instruction":"Record the immediate action, assessment review scope and verification evidence for the extraction scenario."},
        "key_message":"Review starts when circumstances or evidence change, not only when the calendar reminder appears."
      }
    $json$::jsonb),
    ('RA-INITIAL-001', 8, $json$
      {
        "summary":"Apply the complete method to a realistic task. Your decision should show the link from activity and hazard through to action, residual risk and review.",
        "sections":[
          {"heading":"Scope the work","body":"Define the task, location, equipment, people and non-routine conditions."},
          {"heading":"Build the risk statement","body":"Identify each significant hazard, the exposure route, affected people and credible harm."},
          {"heading":"Evaluate current arrangements","body":"Check whether controls exist, operate reliably and match the risk. Score likelihood and severity with a written rationale."},
          {"heading":"Improve the controls","body":"Use the hierarchy, assign actions and state any restriction needed before completion."},
          {"heading":"Close the loop","body":"Set residual risk, communication, monitoring and review arrangements. Identify the evidence needed to verify completion."}
        ],
        "scenario":{"title":"Maintenance inside a production cell","context":"Two employees and a contractor must replace a hydraulic hose inside a guarded cell. Production equipment shares energy supplies. Residual pressure, oil release, restricted access, stored materials and vehicle movements are present. The task may continue into a shift change.","tasks":["Define the assessment scope and everyone affected.","Identify at least five significant hazards and credible outcomes.","Evaluate the current risk for the highest-consequence exposure.","Select controls using the hierarchy and define isolation requirements.","Record owners, evidence, residual risk and review triggers."]},
        "interaction":{"type":"assessment_plan","instruction":"Prepare a concise assessment plan for the production-cell task. Include the highest-priority hazard, rating rationale, control package, owner, completion evidence and review trigger."},
        "quality_test":"Your plan should be specific enough for another competent person to challenge and approve.",
        "key_message":"Completion of this challenge leads to the final knowledge assessment. Workplace authorisation and task-specific competence remain separate employer decisions."
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 1, $json$
      {
        "summary":"Refresh the purpose of risk assessment and recognise signs that a familiar record no longer supports safe work.",
        "sections":[
          {"heading":"Purpose","body":"Risk assessment identifies significant exposure and drives proportionate control decisions."},
          {"heading":"Legal expectation","body":"The assessment must remain suitable and sufficient. Significant findings require a usable record where the employer has five or more employees."},
          {"heading":"Familiarity bias","body":"Long experience without an incident does not prove that controls are effective. Check changes, failures and exposure evidence."},
          {"heading":"Worker knowledge","body":"Ask the people doing the task what has changed, what is difficult and where the written method differs from practice."}
        ],
        "traps":["Copying an old assessment","Treating no previous incident as proof","Ignoring non-routine work","Reviewing only because a date is due"],
        "interaction":{"type":"rapid_review","instruction":"Choose one familiar assessment and record two reasons why it may need review now."},
        "key_message":"A current date does not guarantee a current assessment."
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 2, $json$
      {
        "summary":"Recheck hazard, exposure, person and harm descriptions before considering the score.",
        "sections":[
          {"heading":"Hazard","body":"Name the source or condition capable of harm."},
          {"heading":"Exposure","body":"Explain how contact or exposure occurs during normal and abnormal conditions."},
          {"heading":"Person","body":"Include everyone affected and identify groups needing additional protection."},
          {"heading":"Harm","body":"Use a specific credible outcome that supports a defensible severity score."}
        ],
        "scenario":{"title":"Vehicle and pedestrian interface","context":"Forklifts and pedestrians share a doorway. Floor markings are faded and temporary stock obstructs the mirror.","tasks":["Write the hazard and exposure separately.","Identify all people at risk.","State the credible harm and immediate action."]},
        "interaction":{"type":"hazard_refresh","instruction":"Record a complete hazard, exposure, people and harm statement for the doorway."}
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 3, $json$
      {
        "summary":"Recalibrate scoring by using evidence, credible consequences and current control reliability.",
        "sections":[
          {"heading":"Likelihood evidence","body":"Consider frequency, duration, people exposed, control failures and foreseeable behaviour."},
          {"heading":"Severity evidence","body":"Use the credible outcome from the defined exposure, including long-term ill health."},
          {"heading":"Required action","body":"Scores 10–14 require action within a specified timescale. Scores 15–25 require work to stop until risk is reduced."},
          {"heading":"Residual rating","body":"Do not claim improvement until the additional controls exist and their operation has been verified."}
        ],
        "likelihood":["1 Very unlikely","2 Unlikely","3 Possible","4 Likely","5 Very likely"],
        "severity":["1 Insignificant","2 Minor","3 Moderate","4 Major","5 Catastrophic"],
        "interaction":{"type":"calibration","instruction":"Choose a recent assessment score, record the evidence behind both inputs and state whether the required action matches the risk band."},
        "warning":"Risk scoring documents judgement. It does not replace the judgement."
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 4, $json$
      {
        "summary":"Challenge whether controls address the source of risk or merely ask people to cope with it.",
        "sections":[
          {"heading":"Eliminate or substitute","body":"Reconsider whether the activity, material or energy can be removed or replaced."},
          {"heading":"Engineering controls","body":"Check guarding, enclosure, extraction, interlocks, detection and physical segregation."},
          {"heading":"Administrative controls","body":"Confirm procedures, permits, training and supervision remain practical and understood."},
          {"heading":"PPE","body":"Verify selection, fit, compatibility, maintenance and use for residual exposure."}
        ],
        "hierarchy":[
          {"level":1,"name":"Eliminate","example":"Remove the hazardous activity or exposure."},
          {"level":2,"name":"Substitute","example":"Use a safer method, material or item of equipment."},
          {"level":3,"name":"Engineering","example":"Control exposure through physical design."},
          {"level":4,"name":"Administrative","example":"Control how people plan and perform the work."},
          {"level":5,"name":"PPE","example":"Protect the individual from remaining exposure."}
        ],
        "interaction":{"type":"control_refresh","instruction":"Select one control package from your area. Identify the strongest control, the weakest dependency and one verification check."},
        "key_message":"Controls should reduce exposure in practice, not simply occupy a field in the assessment."
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 5, $json$
      {
        "summary":"Use the 2026 template as a controlled decision record from initial scope through to implementation and review.",
        "sections":[
          {"heading":"Activity details","body":"Describe the task, location, boundaries, people and foreseeable non-routine conditions."},
          {"heading":"Risk entry","body":"Record hazard type, exposure, harm, existing controls and the initial rating rationale."},
          {"heading":"Improvement action","body":"Specify the further control, owner, target date and any interim restriction."},
          {"heading":"Residual risk","body":"Assess the expected position after control selection, then verify implementation before closure."},
          {"heading":"Approval and review","body":"Record assessor and manager approval, communication and the next review trigger or date."}
        ],
        "record":["Clear activity scope","Specific hazard and harm","People at risk","Existing control evidence","Initial rating rationale","Further action","Owner and date","Residual rating","Implementation evidence","Approval and review"],
        "interaction":{"type":"template_review","instruction":"Review one existing assessment against this record checklist. Identify the first field that needs correction and write the improved entry."},
        "quality_test":"The record should support work planning, management approval and later verification."
      }
    $json$::jsonb),
    ('RA-REFRESHER-001', 6, $json$
      {
        "summary":"Complete a final decision check covering hazard description, people, scoring, controls, action and review.",
        "sections":[
          {"heading":"Recognise the change","body":"Identify what has altered since the assessment was prepared."},
          {"heading":"Reassess exposure","body":"Confirm who may now be exposed and how the credible outcome has changed."},
          {"heading":"Challenge controls","body":"Check control hierarchy, reliability and implementation evidence."},
          {"heading":"Record the decision","body":"Update the rating rationale, action ownership, residual position and review trigger."}
        ],
        "scenario":{"title":"Temporary production change","context":"A normal automated process will operate manually for one week while an interlock awaits repair. A local instruction and additional PPE have been proposed.","tasks":["Identify why the existing assessment may be invalid.","Decide whether the proposed controls are sufficient.","State the engineering, isolation or access controls required.","Define approval and verification before operation."]},
        "interaction":{"type":"final_refresh","instruction":"Record your decision on the temporary manual operation and justify whether work may proceed."},
        "key_message":"The final assessment follows this module. A pass confirms refreshed knowledge, while the employer retains responsibility for task-specific competence."
      }
    $json$::jsonb)
  ) as x(course_code, module_number, content)
    on x.course_code = c.course_code
) v
where m.course_id = v.course_id
  and m.module_number = v.module_number;

commit;

