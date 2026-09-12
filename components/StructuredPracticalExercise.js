"use client";

import { useMemo, useState } from "react";

const t = (name, label, example, help = "") => ({ name, label, example, help, type: "text" });
const a = (name, label, example, help = "") => ({ name, label, example, help, type: "area" });
const s = (name, label, options, example) => ({ name, label, options, example, type: "select" });
const m = (name, label, options, example) => ({ name, label, options, example, type: "multi" });

const riskScale = ["1 — Very unlikely", "2 — Unlikely", "3 — Possible", "4 — Likely", "5 — Very likely"];
const severityScale = ["1 — Insignificant", "2 — Minor", "3 — Moderate", "4 — Major", "5 — Catastrophic"];

const exercises = {
  classify: [
    s("category", "Hazard category", ["Physical", "Mechanical", "Chemical", "Biological", "Ergonomic", "Psychosocial", "Environmental"], "Mechanical"),
    t("hazard", "Hazard source", "Rotating abrasive wheel operating at high speed", "Name the source of harm, not the injury."),
    t("exposure", "Exposure route", "Operator stands in the line of fire while testing with the guard open", "Describe exactly how a person encounters it."),
    t("harm", "Credible consequence", "Wheel fragments strike the operator, causing serious eye or facial injury"),
    a("abnormal", "Abnormal condition", "Incorrect wheel fitting, a damaged wheel or overspeed could cause failure during run-up."),
  ],
  people_map: [
    m("people", "People who may be affected", ["Operator", "Contractor", "Maintenance staff", "Nearby employees", "Delivery driver", "Visitor or public", "New starter", "Lone worker"], ["Contractor", "Nearby employees", "Delivery driver"]),
    a("map", "People-at-risk map", "Contractor — stored pressure and oil release — injection injury. Nearby employees — unexpected plant movement — crushing injury. Delivery driver — vehicle enters the work area — collision.", "Link every selected group to an exposure and credible harm."),
    t("consult", "People to consult", "Contractor, operators, area supervisor, maintenance lead and logistics coordinator"),
  ],
  matrix: [
    s("likelihood", "Initial likelihood", riskScale, "4 — Likely"),
    s("severity", "Credible severity", severityScale, "5 — Catastrophic"),
    t("score", "Risk score", "20", "Multiply likelihood by severity."),
    s("decision", "Can the work proceed?", ["Yes — controls are adequate", "Yes — with additional controlled action", "No — stop until risk is reduced"], "No — stop until risk is reduced"),
    a("rationale", "Evidence-based rationale", "Recent monitor pump failures and overdue portable-detector calibration make exposure foreseeable. A fatal low-oxygen atmosphere is credible. Entry must stop until detection, calibration and rescue arrangements are verified."),
  ],
  rank_controls: [
    m("levels", "Hierarchy levels considered", ["Eliminate", "Substitute", "Engineering", "Administrative", "PPE"], ["Eliminate", "Engineering", "Administrative", "PPE"]),
    a("controls", "Controls in hierarchy order", "1. Eliminate enclosed-bay welding where practicable. 2. Install source LEV. 3. Restrict access and verify airflow. 4. Use fit-tested RPE for residual exposure."),
    t("strongest", "Strongest selected control", "Effective source extraction verified by commissioning and examination"),
    t("verification", "Effectiveness evidence", "LEV capture test, statutory thorough examination and exposure monitoring where necessary"),
  ],
  record_quality: [
    t("activity", "Defined activity", "Routine adjustment and cleaning of the guarded conveyor drive in Production Cell 2"),
    a("risk", "Hazard, exposure and harm", "Unexpected energisation during adjustment could draw the technician into the drive, causing crushing or amputation."),
    a("controls", "Existing and further controls", "Existing: fixed guard and local stop. Further: lockable isolation, prove-dead step and controlled access before guard removal."),
    t("owner", "Action owner and date", "Engineering Manager — before the next planned intervention"),
    t("evidence", "Completion evidence", "Approved isolation instruction, installed isolator and witnessed functional test"),
  ],
  review_decision: [
    m("triggers", "Review triggers", ["Control failure", "Worker concern", "Monitoring result", "Inspection defect", "Incident or near miss", "Process change"], ["Control failure", "Worker concern", "Inspection defect"]),
    a("precautions", "Immediate precautions", "Restrict the fume-producing task and provide alternative extraction until airflow is restored and verified."),
    a("scope", "Assessment review scope", "Review the process, materials, exposure duration, affected people, LEV performance, RPE and maintenance arrangements."),
    t("evidence", "Evidence before acceptance", "Repair record, satisfactory airflow test, current examination and worker confirmation"),
  ],
  assessment_plan: [
    t("scope", "Task and boundaries", "Hydraulic-hose replacement inside the guarded production cell, including isolation, oil containment and shift handover"),
    a("risk", "Highest-priority risk", "Shared energy and residual pressure could move equipment while people are inside, causing fatal crushing or injection injury."),
    s("decision", "Work decision", ["Proceed under existing controls", "Proceed only after additional controls", "Stop until risk is reduced"], "Stop until risk is reduced"),
    a("controls", "Control package", "Shut down; isolate and lock shared energy; discharge and prove zero pressure; control access; contain oil; brief the team and control shift handover."),
    t("owner", "Action owner", "Production Engineering Manager"),
    t("evidence", "Verification evidence", "Signed isolation and try-out record, zero-pressure verification, permit and briefing record"),
    t("review", "Review trigger", "Any isolation failure, task change, near miss or incomplete handover"),
  ],
  rapid_review: [
    t("assessment", "Assessment selected", "Workshop bench-grinder risk assessment"),
    m("reasons", "Reasons for review", ["Equipment changed", "Control deteriorated", "Worker concern", "Incident or near miss", "New guidance", "Exposure changed", "Record differs from practice"], ["Control deteriorated", "Record differs from practice"]),
    a("first_check", "First practical check", "Compare the recorded guarding and wheel-change method with the machine and observe a competent operator completing the task."),
  ],
  hazard_refresh: [
    t("hazard", "Hazard source", "Forklift movement through a shared doorway with restricted visibility"),
    t("exposure", "Exposure route", "Pedestrians and drivers enter the same blind doorway while stock obstructs the mirror"),
    m("people", "People at risk", ["Forklift drivers", "Employees", "Contractors", "Visitors", "Delivery drivers", "Public"], ["Forklift drivers", "Employees", "Contractors", "Visitors"]),
    t("harm", "Credible harm", "A pedestrian is struck or trapped, causing major crush injury or fatality"),
    a("action", "Immediate action", "Stop shared use, remove the obstruction and introduce temporary physical segregation until permanent controls are restored."),
  ],
  calibration: [
    t("assessment", "Assessment selected", "Monthly entry into the low-oxygen pit"),
    s("likelihood", "Likelihood", riskScale, "4 — Likely"),
    s("severity", "Severity", severityScale, "5 — Catastrophic"),
    a("evidence", "Evidence for both inputs", "Entry is monthly, but monitor failures and overdue calibration reduce confidence. Unrecognised oxygen deficiency could cause fatality."),
    s("match", "Does the action match the band?", ["Yes", "No", "Not enough evidence"], "No"),
    a("correction", "Required correction", "Stop entry until detection, calibration, ventilation and rescue arrangements are verified."),
  ],
  control_refresh: [
    t("package", "Control package reviewed", "Welding-fume controls in the enclosed fabrication bay"),
    s("level", "Strongest control level", ["Elimination", "Substitution", "Engineering", "Administrative", "PPE"], "Engineering"),
    t("strongest", "Strongest control", "Source LEV positioned at the weld"),
    t("weakness", "Weakest dependency", "Operator positioning the hood correctly for every weld"),
    t("verification", "Verification check", "Airflow check before use plus current thorough-examination record"),
  ],
  template_review: [
    m("gaps", "Record gaps", ["Activity scope", "Hazard and harm", "People at risk", "Control evidence", "Rating rationale", "Further action", "Owner and date", "Residual rating", "Implementation evidence", "Approval or review"], ["Hazard and harm", "Rating rationale", "Implementation evidence"]),
    s("first", "First field to correct", ["Activity scope", "Hazard and harm", "People at risk", "Existing controls", "Rating rationale", "Further action", "Owner and date", "Implementation evidence"], "Hazard and harm"),
    a("original", "Current entry", "Hazard: machinery. Harm: injury. Control: trained staff."),
    a("improved", "Improved entry", "During unguarded conveyor adjustment, unexpected energisation could draw the technician into the drive and cause crushing or amputation. Lockable isolation is required before guard removal."),
  ],
  final_refresh: [
    s("decision", "May temporary operation proceed?", ["Yes — as proposed", "Yes — only after additional controls", "No — operation must remain stopped"], "No — operation must remain stopped"),
    m("reasons", "Why the assessment may be invalid", ["Operating mode changed", "Interlock unavailable", "Exposure changed", "Competence changed", "Controls weakened", "Temporary arrangement not assessed"], ["Operating mode changed", "Interlock unavailable", "Controls weakened", "Temporary arrangement not assessed"]),
    a("controls", "Controls required", "Repair and test the interlock or establish an engineered alternative; isolate for intervention; restrict access and authorise competent operators."),
    a("approval", "Approval and verification", "Engineering and operations management approval after functional testing, risk review, briefing and recorded pre-use verification."),
    a("rationale", "Decision rationale", "PPE and an instruction do not replace the failed engineered safeguard or prevent access to dangerous movement."),
  ],
};

function schemaFor(type) {
  return exercises[type] || [a("response", "Your practical response", "Identify the issue, record your decision, assign an owner and define verification evidence.")];
}

export default function StructuredPracticalExercise({ module, enrolment, completeModuleAction, onBack }) {
  const content = module.content || {};
  const interaction = content.interaction || { type: "reflection", instruction: content.reflection || "Apply this module to a practical example." };
  const fields = useMemo(() => schemaFor(interaction.type), [interaction.type]);
  const blank = () => Object.fromEntries(fields.map((field) => [field.name, field.type === "multi" ? [] : ""]));
  const [answers, setAnswers] = useState(blank);
  const [usedExample, setUsedExample] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function loadExample(checked) {
    setUsedExample(checked);
    setConfirmed(false);
    setAnswers(checked ? Object.fromEntries(fields.map((field) => [field.name, field.example])) : blank());
  }

  function updateMulti(name, option, checked) {
    setAnswers((current) => ({ ...current, [name]: checked ? [...current[name], option] : current[name].filter((item) => item !== option) }));
  }

  const evidence = JSON.stringify({ version: 1, interaction_type: interaction.type, used_worked_example: usedExample, learner_confirmed: confirmed, answers });

  return <div className="spePage">
    <style>{`
      .spePage{color:#092748}.speBack{padding:0;border:0;background:none;color:#245cff;font-weight:850;cursor:pointer}.speHead{margin:22px 0;padding:25px;border-radius:15px;background:linear-gradient(135deg,#082a54,#087f6c);color:#fff}.speHead small{font-weight:900;letter-spacing:.11em;color:#78e3c4}.speHead h2{margin:8px 0;font-size:31px}.speHead p{margin:0;line-height:1.55}.speScenario{margin:16px 0;padding:18px;border:1px solid #c9dcfa;border-radius:12px;background:#edf4ff}.speScenario small{font-weight:900;color:#245cff;letter-spacing:.08em}.speScenario h3{margin:6px 0}.speScenario p{margin:0;color:#496681;line-height:1.5}.speExample,.speConfirm{display:flex;gap:12px;align-items:flex-start;margin:16px 0;padding:16px;border:1px solid #c7d7e5;border-radius:11px;background:#f4f8fc;cursor:pointer}.speExample input,.speConfirm input{width:19px;height:19px;margin-top:2px;accent-color:#087f6c}.speExample span{display:grid;gap:3px}.speExample small{color:#5f768c}.speGrid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.speField{min-width:0;margin:0;padding:16px;border:1px solid #d6e1ea;border-radius:11px}.speField.wide{grid-column:1/-1}.speField legend{padding:0 7px;font-weight:900}.speField legend i{display:inline-grid;place-items:center;width:27px;height:27px;margin-right:8px;border-radius:50%;background:#e8f0ff;color:#245cff;font-size:10px;font-style:normal}.speHelp{margin:2px 0 11px;color:#60778e;font-size:13px}.speField input:not([type=checkbox]),.speField select,.speField textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #aebfd0;border-radius:8px;background:#fff;font:inherit}.speField textarea{min-height:105px;resize:vertical}.speOptions{position:relative;display:flex;flex-wrap:wrap;gap:7px}.speOptions label{cursor:pointer}.speOptions label input{position:absolute;opacity:0}.speOptions label span{display:block;padding:9px 10px;border:1px solid #c8d8e5;border-radius:999px;color:#34536f;font-size:12px;font-weight:800}.speOptions label input:checked+span{border-color:#087f6c;background:#e4f7f1;color:#05634f}.speValidator{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;opacity:0;pointer-events:none}.speConfirm{background:#fff8e6;border-color:#e9c568}.speSubmit{width:100%;padding:13px 16px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;font-size:15px;cursor:pointer}.speNote{text-align:center;color:#687d91;font-size:12px}@media(max-width:650px){.speGrid{grid-template-columns:1fr}.speField.wide{grid-column:auto}.speHead h2{font-size:25px}}
    `}</style>
    <button type="button" className="speBack" onClick={onBack}>← Return to learning</button>
    <header className="speHead"><small>PRACTICAL EXERCISE</small><h2>Demonstrate your decision</h2><p>{interaction.instruction}</p></header>
    {content.scenario && <section className="speScenario"><small>SCENARIO REFERENCE</small><h3>{content.scenario.title}</h3><p>{content.scenario.context || content.scenario.prompt}</p></section>}
    <label className="speExample"><input type="checkbox" checked={usedExample} onChange={(event) => loadExample(event.target.checked)}/><span><strong>Use a worked example</strong><small>Populate a model response. You must review it and can modify any answer before submission.</small></span></label>
    <div className="speGrid">{fields.map((field, index) => <fieldset className={`speField ${field.type === "area" ? "wide" : ""}`} key={field.name}><legend><i>{String(index + 1).padStart(2, "0")}</i>{field.label}</legend>{field.help && <p className="speHelp">{field.help}</p>}
      {field.type === "select" && <select required value={answers[field.name]} onChange={(event) => setAnswers({ ...answers, [field.name]: event.target.value })}><option value="">Select an answer</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>}
      {field.type === "text" && <input required minLength={3} value={answers[field.name]} onChange={(event) => setAnswers({ ...answers, [field.name]: event.target.value })}/>} 
      {field.type === "area" && <textarea required minLength={20} value={answers[field.name]} onChange={(event) => setAnswers({ ...answers, [field.name]: event.target.value })}/>} 
      {field.type === "multi" && <div className="speOptions">{field.options.map((option) => <label key={option}><input type="checkbox" checked={answers[field.name].includes(option)} onChange={(event) => updateMulti(field.name, option, event.target.checked)}/><span>{option}</span></label>)}<input className="speValidator" tabIndex={-1} aria-hidden="true" required value={answers[field.name].length ? "selected" : ""} onChange={() => {}}/></div>}
    </fieldset>)}</div>
    <label className="speConfirm"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span><strong>I have reviewed this response.</strong> It reflects my decision for the scenario, and I can explain the selected controls and evidence.</span></label>
    <form action={completeModuleAction}><input type="hidden" name="enrolment_id" value={enrolment.id}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="learner_reflection" value={evidence}/><button className="speSubmit" type="submit">Submit exercise and complete module →</button></form>
    <p className="speNote">The structured response, worked-example status and learner confirmation are retained as module evidence.</p>
  </div>;
}
