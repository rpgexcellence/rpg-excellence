-- RPG Excellence Phase 1: distinct specialist inspection questions.
-- Run in Supabase SQL Editor. Also commit this exact SQL to GitHub at:
-- supabase/migrations/20261023_phase1_specialist_inspection_questions.sql
-- Supporting guidance (local risk review remains necessary):
-- https://www.hse.gov.uk/work-equipment-machinery/maintenance.htm
-- https://www.hse.gov.uk/confinedspace/introduction.htm
-- https://www.hse.gov.uk/construction/faq-height.htm
-- Adds questions and pack memberships to the active system laboratory template v1.
-- Existing questions, responses, evidence, programmes, findings, administrator
-- permissions and organisation assignments are not updated or deleted.
-- Existing inspection snapshots stay as recorded; new questions apply only to
-- subsequently generated inspections. This is a baseline to review against local risks.


-- All validation and inserts are a single atomic statement. No temporary table
-- or explicit multi-statement transaction is required. Safe to rerun after a
-- partial attempt: existing questions and memberships are not duplicated.
do $phase1$
declare
 bank constant jsonb := $bank$[
 {
  "pack_code": "COMPRESSED_GASES",
  "question_code": "RPG_P1_GAS_01",
  "section_code": "P1_GAS",
  "section_title": "Specialist — Compressed gases",
  "question_text": "Cylinder storage is secure, ventilated and arranged to prevent incompatible gases or ignition sources creating a hazard.",
  "inspector_guidance": "Inspect restraints, identification, separation, ventilation and exposure to heat. Compare the arrangement with the local gas risk assessment.",
  "display_order": 1010
 },
 {
  "pack_code": "COMPRESSED_GASES",
  "question_code": "RPG_P1_GAS_02",
  "section_code": "P1_GAS",
  "section_title": "Specialist — Compressed gases",
  "question_text": "Cylinders, regulators, hoses and connections are suitable for the gas and activity, with defects and suspected leaks controlled.",
  "inspector_guidance": "Sample condition, compatibility, inspection records, leak-reporting arrangements and authorised-user training. Do not operate or disturb suspect equipment.",
  "display_order": 1020
 },
 {
  "pack_code": "CHEMICALS_COSHH",
  "question_code": "RPG_P1_CHEM_01",
  "section_code": "P1_CHEM",
  "section_title": "Specialist — Hazardous substances",
  "question_text": "The substances in use match current assessments and are labelled, stored and handled using the specified exposure controls.",
  "inspector_guidance": "Sample actual containers and tasks against the substance inventory, safety information and local assessment. Check compatibility and access controls.",
  "display_order": 1110
 },
 {
  "pack_code": "CHEMICALS_COSHH",
  "question_code": "RPG_P1_CHEM_02",
  "section_code": "P1_CHEM",
  "section_title": "Specialist — Hazardous substances",
  "question_text": "Exposure controls and arrangements for chemical spills, contamination and disposal are available and understood.",
  "inspector_guidance": "Check extraction status, protective equipment, spill response and waste arrangements against the assessment. Escalate failed controls rather than relying on PPE alone.",
  "display_order": 1120
 },
 {
  "pack_code": "MACHINERY_PUWER",
  "question_code": "RPG_P1_MACH_01",
  "section_code": "P1_MACH",
  "section_title": "Specialist — Machinery and equipment",
  "question_text": "Guards, interlocks and emergency controls are in place and defects or defeated safeguards prevent the equipment being used.",
  "inspector_guidance": "Observe condition and authorised checks; review defect isolation and maintenance records. Do not defeat safeguards or conduct unplanned functional tests.",
  "display_order": 1210
 },
 {
  "pack_code": "MACHINERY_PUWER",
  "question_code": "RPG_P1_MACH_02",
  "section_code": "P1_MACH",
  "section_title": "Specialist — Machinery and equipment",
  "question_text": "Cleaning, setting, maintenance and fault recovery have defined energy-isolation and authorised-user controls.",
  "inspector_guidance": "Sample task instructions, isolation arrangements, competence and supervision. Confirm stored energy and foreseeable access to dangerous parts were considered.",
  "display_order": 1220
 },
 {
  "pack_code": "LIFTING_LOLER",
  "question_code": "RPG_P1_LIFT_01",
  "section_code": "P1_LIFT",
  "section_title": "Specialist — Lifting operations",
  "question_text": "Lifting equipment and accessories are identifiable, suitable for the load and within the organisation's examination and inspection controls.",
  "inspector_guidance": "Sample equipment identity, load limits, examination records, pre-use checks and quarantine of defective accessories.",
  "display_order": 1310
 },
 {
  "pack_code": "LIFTING_LOLER",
  "question_code": "RPG_P1_LIFT_02",
  "section_code": "P1_LIFT",
  "section_title": "Specialist — Lifting operations",
  "question_text": "Lifting activities are planned and supervised with competent people, suitable attachment points and controlled exclusion areas.",
  "inspector_guidance": "Review the lifting arrangement and task plan. Check load stability, communication, access and protection of people below or near the load.",
  "display_order": 1320
 },
 {
  "pack_code": "PRESSURE_SYSTEMS",
  "question_code": "RPG_P1_PRESS_01",
  "section_code": "P1_PRESS",
  "section_title": "Specialist — Pressure systems",
  "question_text": "Pressure equipment is identified and operated within its documented safe limits, with required examination and protective devices controlled.",
  "inspector_guidance": "Compare the equipment register, examination arrangements and defect status with the equipment observed. Refer uncertainty to the competent person.",
  "display_order": 1410
 },
 {
  "pack_code": "PRESSURE_SYSTEMS",
  "question_code": "RPG_P1_PRESS_02",
  "section_code": "P1_PRESS",
  "section_title": "Specialist — Pressure systems",
  "question_text": "Pressure-system maintenance and abnormal operation have defined isolation, stored-energy and emergency controls.",
  "inspector_guidance": "Check local instructions, competence, safe access, isolation identification and arrangements for suspected leaks or protective-device faults.",
  "display_order": 1420
 },
 {
  "pack_code": "WELDING_HOT_WORK",
  "question_code": "RPG_P1_HOT_01",
  "section_code": "P1_HOT",
  "section_title": "Specialist — Welding and hot work",
  "question_text": "Hot work has the required local authorisation and controls for combustible materials, adjacent areas and post-work fire monitoring.",
  "inspector_guidance": "Review task authorisation, area preparation, screens, fire response and the specified fire-watch arrangements, including hidden or adjoining spaces.",
  "display_order": 1510
 },
 {
  "pack_code": "WELDING_HOT_WORK",
  "question_code": "RPG_P1_HOT_02",
  "section_code": "P1_HOT",
  "section_title": "Specialist — Welding and hot work",
  "question_text": "Welding and cutting controls address fumes, gases, radiation, electrical hazards and exposure of nearby people.",
  "inspector_guidance": "Sample extraction condition, exposure assessment, gas equipment, welding screens and protective equipment against the actual work.",
  "display_order": 1520
 },
 {
  "pack_code": "RADIATION_LASER",
  "question_code": "RPG_P1_RAD_01",
  "section_code": "P1_RAD",
  "section_title": "Specialist — Radiation and lasers",
  "question_text": "Radiation or laser work is covered by current local controls with defined authorised users, access restrictions and competent oversight.",
  "inspector_guidance": "Check the applicable assessment, local instructions, authorisation and signage for the actual source or laser. Refer technical adequacy to the appointed specialist.",
  "display_order": 1610
 },
 {
  "pack_code": "RADIATION_LASER",
  "question_code": "RPG_P1_RAD_02",
  "section_code": "P1_RAD",
  "section_title": "Specialist — Radiation and lasers",
  "question_text": "Shielding, protective interlocks and relevant monitoring or emergency arrangements remain controlled and defects are escalated.",
  "inspector_guidance": "Review inspection and maintenance records, access arrangements and emergency instructions. Do not test a source, beam or interlock outside an authorised procedure.",
  "display_order": 1620
 },
 {
  "pack_code": "BIOLOGICAL",
  "question_code": "RPG_P1_BIO_01",
  "section_code": "P1_BIO",
  "section_title": "Specialist — Biological hazards",
  "question_text": "Biological work has defined containment, hygiene and exposure controls appropriate to the materials and tasks present.",
  "inspector_guidance": "Sample the biological assessment, access, containment equipment, hygiene arrangements and worker competence. Record changes or unassessed work.",
  "display_order": 1710
 },
 {
  "pack_code": "BIOLOGICAL",
  "question_code": "RPG_P1_BIO_02",
  "section_code": "P1_BIO",
  "section_title": "Specialist — Biological hazards",
  "question_text": "Biological spills, sharps, contaminated waste and accidental exposures have suitable response and decontamination arrangements.",
  "inspector_guidance": "Check labelled containers, decontamination provision, disposal routes, incident instructions and how workers obtain competent assistance.",
  "display_order": 1720
 },
 {
  "pack_code": "NOISE_VIBRATION",
  "question_code": "RPG_P1_NV_01",
  "section_code": "P1_NV",
  "section_title": "Specialist — Noise and vibration",
  "question_text": "Noise and vibration assessments reflect the equipment, exposure durations and work patterns observed.",
  "inspector_guidance": "Sample equipment and task records against the assessment. Check whether process changes or worker concerns require reassessment.",
  "display_order": 1810
 },
 {
  "pack_code": "NOISE_VIBRATION",
  "question_code": "RPG_P1_NV_02",
  "section_code": "P1_NV",
  "section_title": "Specialist — Noise and vibration",
  "question_text": "Specified noise and vibration controls are implemented, maintained and understood by exposed workers.",
  "inspector_guidance": "Review source controls, maintenance, task duration, hearing protection where specified, and any assessment-led health surveillance arrangements.",
  "display_order": 1820
 },
 {
  "pack_code": "WORK_AT_HEIGHT",
  "question_code": "RPG_P1_WAH_01",
  "section_code": "P1_WAH",
  "section_title": "Specialist — Work at height",
  "question_text": "Work at height is avoided where practicable and remaining tasks use suitable access and fall-prevention arrangements.",
  "inspector_guidance": "Check the task assessment, access equipment, edge protection, equipment condition and protection of people below.",
  "display_order": 1910
 },
 {
  "pack_code": "WORK_AT_HEIGHT",
  "question_code": "RPG_P1_WAH_02",
  "section_code": "P1_WAH",
  "section_title": "Specialist — Work at height",
  "question_text": "People undertaking work at height are authorised and competent, with emergency and rescue arrangements appropriate to the task.",
  "inspector_guidance": "Sample competence, supervision, pre-use checks and task-specific rescue planning. Do not accept an untested assumption that emergency services alone provide rescue.",
  "display_order": 1920
 },
 {
  "pack_code": "CONFINED_SPACES",
  "question_code": "RPG_P1_CS_01",
  "section_code": "P1_CS",
  "section_title": "Specialist — Confined spaces",
  "question_text": "Potential confined spaces are identified and unauthorised entry is prevented, with entry avoided where practicable.",
  "inspector_guidance": "Check identification, access restrictions, task assessment and local authorisation. Do not enter a space to complete this inspection.",
  "display_order": 2010
 },
 {
  "pack_code": "CONFINED_SPACES",
  "question_code": "RPG_P1_CS_02",
  "section_code": "P1_CS",
  "section_title": "Specialist — Confined spaces",
  "question_text": "Any authorised confined-space work has task-specific isolation, atmosphere, communication, supervision and rescue controls.",
  "inspector_guidance": "Review the entry plan, competence and arrangements for atmospheric testing and rescue. Escalate missing controls before entry starts.",
  "display_order": 2020
 },
 {
  "pack_code": "FIRE_EMERGENCY",
  "question_code": "RPG_P1_FIRE_01",
  "section_code": "P1_FIRE",
  "section_title": "Specialist — Fire and emergency controls",
  "question_text": "Fire and explosion controls reflect the actual combustible materials, dangerous substances and ignition sources in the area.",
  "inspector_guidance": "Compare storage and activities with the area assessment. Check segregation, ignition control and changes that require review.",
  "display_order": 2110
 },
 {
  "pack_code": "FIRE_EMERGENCY",
  "question_code": "RPG_P1_FIRE_02",
  "section_code": "P1_FIRE",
  "section_title": "Specialist — Fire and emergency controls",
  "question_text": "Alarm, evacuation and emergency-response arrangements are usable for the people and activities present.",
  "inspector_guidance": "Check escape routes, alarm reporting, emergency information, assistance arrangements and worker understanding. Record unavailable or impaired provisions.",
  "display_order": 2120
 },
 {
  "pack_code": "ENVIRONMENTAL",
  "question_code": "RPG_P1_ENV_01",
  "section_code": "P1_ENV",
  "section_title": "Specialist — Environmental controls",
  "question_text": "Activities with potential environmental impact have suitable containment, drainage protection and abnormal-event controls.",
  "inspector_guidance": "Inspect storage, bunds, drains and leak or spill arrangements against the site's environmental controls and operating conditions.",
  "display_order": 2210
 },
 {
  "pack_code": "ENVIRONMENTAL",
  "question_code": "RPG_P1_ENV_02",
  "section_code": "P1_ENV",
  "section_title": "Specialist — Environmental controls",
  "question_text": "Waste streams are identified, segregated and stored securely, with controlled collection and disposal arrangements.",
  "inspector_guidance": "Sample waste labels, storage condition, segregation and disposal records. Escalate unknown waste, uncontrolled releases or unsuitable collection arrangements.",
  "display_order": 2220
 },
 {
  "pack_code": "OFFICE_WELFARE",
  "question_code": "RPG_P1_OFF_01",
  "section_code": "P1_OFF",
  "section_title": "Specialist — Office and welfare",
  "question_text": "Office tasks and workstations have suitable ergonomic, electrical and manual-handling arrangements for their users.",
  "inspector_guidance": "Sample workstation assessments, equipment condition, cable routing, storage and arrangements for reporting discomfort or changed needs.",
  "display_order": 2310
 },
 {
  "pack_code": "OFFICE_WELFARE",
  "question_code": "RPG_P1_OFF_02",
  "section_code": "P1_OFF",
  "section_title": "Specialist — Office and welfare",
  "question_text": "Welfare and shared facilities are hygienic, accessible and suitable for the people using the area.",
  "inspector_guidance": "Check drinking water, washing, toilets, rest areas, cleaning and access. Record defects and arrangements for workers needing assistance.",
  "display_order": 2320
 }
]$bank$::jsonb;
 target_template uuid;
begin
 lock table public.hs_inspection_templates,public.hs_inspection_question_packs,
   public.hs_inspection_template_questions,public.hs_inspection_pack_questions
   in share row exclusive mode;
 if (select count(*) from public.hs_inspection_templates where organization_id is null
     and template_code='RPG-WPI-LAB' and version=1 and status='active')<>1 then
   raise exception 'Expected one active system RPG-WPI-LAB template v1. No questions were changed. Review the template before applying this migration.';
 end if;
 select id into target_template from public.hs_inspection_templates
 where organization_id is null and template_code='RPG-WPI-LAB' and version=1 and status='active';
 if exists (
   select s.pack_code from (select distinct b.pack_code from jsonb_to_recordset(bank) as b(pack_code text,question_code text,section_code text,section_title text,question_text text,inspector_guidance text,display_order integer)) s
   left join public.hs_inspection_question_packs p on p.pack_code=s.pack_code and p.organization_id is null and p.active
   group by s.pack_code having count(p.id)<>1
 ) then
   raise exception 'A specialist system pack is missing, inactive or ambiguous. No questions were changed. Run the readiness diagnostic.';
 end if;
 insert into public.hs_inspection_template_questions
   (template_id,section_code,section_title,question_code,question_text,legislation_guidance,
    inspector_guidance,response_type,requires_comment_on_failure,allows_evidence,display_order,active)
 select target_template,s.section_code,s.section_title,s.question_code,s.question_text,
   'Site risk assessment and controlled organisational procedures; competent specialist review where appropriate.',
   s.inspector_guidance,'yes_no_na',true,true,s.display_order,true
 from jsonb_to_recordset(bank) as s(pack_code text,question_code text,section_code text,section_title text,question_text text,inspector_guidance text,display_order integer)
 on conflict (template_id,question_code) do nothing;

 insert into public.hs_inspection_pack_questions(pack_id,question_id)
 select p.id,q.id from jsonb_to_recordset(bank) as s(pack_code text,question_code text,section_code text,section_title text,question_text text,inspector_guidance text,display_order integer)
 join public.hs_inspection_template_questions q on q.template_id=target_template and q.question_code=s.question_code
 join public.hs_inspection_question_packs p on p.pack_code=s.pack_code and p.organization_id is null and p.active
 where not exists (select 1 from public.hs_inspection_pack_questions l where l.pack_id=p.id and l.question_id=q.id);

 -- Never silently reactivate previously disabled phase-1 questions.
 if exists (
   select s.pack_code from jsonb_to_recordset(bank) as s(pack_code text,question_code text,section_code text,section_title text,question_text text,inspector_guidance text,display_order integer)
   left join public.hs_inspection_template_questions q on q.template_id=target_template and q.question_code=s.question_code and q.active
   group by s.pack_code having count(q.id)<>2
 ) then
   raise exception 'A phase-1 specialist question is inactive or absent. Existing settings were preserved; migration rolled back for review.';
 end if;
end;
$phase1$;

-- Expected: fourteen READY rows, each with phase1_specialist_questions = 2.
select p.pack_code,
 count(distinct q.id) filter(where q.active) as active_questions,
 count(distinct q.id) filter(where q.active and left(q.question_code,7)='RPG_P1_') as phase1_specialist_questions,
 case when count(distinct q.id) filter(where q.active and left(q.question_code,7)='RPG_P1_')=2 then 'READY' else 'REVIEW_REQUIRED' end as readiness
from public.hs_inspection_question_packs p
join public.hs_inspection_pack_questions l on l.pack_id=p.id
join public.hs_inspection_template_questions q on q.id=l.question_id
join public.hs_inspection_templates t on t.id=q.template_id and t.organization_id is null and t.template_code='RPG-WPI-LAB' and t.version=1 and t.status='active'
where p.organization_id is null and p.active and p.pack_code in ('COMPRESSED_GASES','CHEMICALS_COSHH','MACHINERY_PUWER','LIFTING_LOLER','PRESSURE_SYSTEMS','WELDING_HOT_WORK','RADIATION_LASER','BIOLOGICAL','NOISE_VIBRATION','WORK_AT_HEIGHT','CONFINED_SPACES','FIRE_EMERGENCY','ENVIRONMENTAL','OFFICE_WELFARE')
group by p.pack_code order by p.pack_code;
