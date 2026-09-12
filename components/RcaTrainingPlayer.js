"use client";

import { useMemo, useState } from "react";

const exercises = {
  1: { question:"A customer reports one defective component and two similar internal deviations occurred last month. What is the correct response?", options:["Replace the customer item and close the issue","Contain the credible affected population and launch a proportionate cause investigation","Wait for another customer complaint","Record operator error as the root cause"], answer:1, why:"Correction addresses the reported item. Containment protects the credible population. Repetition provides objective evidence that recurrence risk requires structured investigation." },
  2: { question:"Who should lead a cross-functional 8D investigation?", options:["The most senior manager, regardless of investigation competence","A competent facilitator with authority and access to process experts","Quality alone because it owns every nonconformity","The person suspected of causing the failure"], answer:1, why:"The leader facilitates evidence-based analysis and needs suitable authority. The team must include people who know the work, own relevant data and can implement decisions." },
  3: { question:"Which statement defines a problem without assuming its cause?", options:["Poor training caused repeated inspection failures","Three batches failed the specified dimension at final inspection between 8 and 10 September","Operators did not follow the procedure","Management failed to supervise the process"], answer:1, why:"A sound problem statement records what, where, when and how much. Cause statements remain hypotheses until the team verifies them with evidence." },
  4: { question:"What must happen before temporary containment can be removed?", options:["The corrective-action plan is written","The customer stops asking for updates","Permanent controls are implemented, validated and meet authorised exit criteria","Seven calendar days have passed"], answer:2, why:"Containment stays in place until the permanent control protects the affected population and evidence demonstrates that the agreed release criteria have been met." },
  5: { question:"Why should the team build occurrence, escape and systemic cause paths?", options:["To create more actions","To separate how the failure happened, why detection failed and why the system allowed the weakness","To ensure every path ends with training","To avoid testing alternative explanations"], answer:1, why:"The three directions expose different causal mechanisms. A single linear five-why chain commonly misses detection and management-system weaknesses." },
  6: { question:"An experienced operator selected the wrong programme. Which cause statement supports useful action?", options:["The operator was careless","Human error","Similar labels, truncated screen text and removal of the independent check made selection error more likely","The operator needs discipline"], answer:2, why:"Human error describes the outcome. Analysis must identify the task, design, supervision and organisational conditions that shaped the action and defeated controls." },
  7: { question:"Which corrective action most strongly controls selection of the wrong machine programme?", options:["Ask operators to take more care","Send an awareness email","Interlock the programme to scanned product identity and challenge-test the function","Repeat unchanged training annually"], answer:2, why:"The engineering control acts directly on the verified failure mechanism. Briefing or training is suitable only when a verified competence gap caused the problem." },
  8: { question:"Which evidence validates a newly installed interlock?", options:["The purchase order","A photograph of the device","A witnessed functional challenge test under defined operating conditions","The action owner’s email saying complete"], answer:2, why:"Installation records prove implementation. A controlled functional test demonstrates whether the interlock performs as designed." },
  9: { question:"What is the purpose of the D7 extent review?", options:["To close the original case faster","To find other products, processes, sites or suppliers exposed to the same causal weakness","To transfer the problem to another department","To replace effectiveness monitoring"], answer:1, why:"System prevention tests where else the same cause or failure mechanism could exist and transfers proven controls and learning to those areas." },
  10: { question:"The original failure occurred about once every 20 cycles. The process has run twice since action completion. What is the correct D8 decision?", options:["Close because no recurrence has been reported","Close because every action is marked complete","Continue monitoring across a justified number of recurrence opportunities","Ask the action owner whether they feel confident"], answer:2, why:"Two cycles provide insufficient opportunity to test recurrence. Effectiveness needs independent outcome evidence over a monitoring period linked to the original failure pattern." },
};

const listLabels = {
  tools:"Investigation tools",
  containment_test:"Containment design checks",
  logic_rules:"Causal reasoning rules",
  factor_groups:"Human and organisational factors",
  validation:"Cause validation tests",
  selection_tests:"Corrective-action selection tests",
  solution_strength:"Control strength",
  evidence:"Implementation and validation evidence",
  extent_review:"Extent of condition and cause",
  review_design:"Effectiveness review design",
};

const methodGuides = {
  2: [{
    title:"Facilitator reference",
    source:"D1 team leadership",
    introduction:"The facilitator controls the investigation method and pace without directing the technical conclusion.",
    prompts:[
      ["Role","Keep the team focused on evidence, agreed objectives and timing."],
      ["Independence","Where possible, choose someone without hierarchical control over the people giving evidence."],
      ["Authority","Confirm that management has empowered the facilitator at a level proportionate to the issue."],
      ["Competence","Use a facilitator experienced in RCA methods or give them access to a suitable specialist."],
      ["Timing","Nominate the facilitator as soon as the issue justifies formal causal analysis."],
      ["Iteration","D1 team formation and D2 problem definition can develop together as new facts change the required expertise."],
    ],
  }],
  3: [
    {
      title:"5W2H problem-statement reference",
      source:"Problem definition method",
      introduction:"Ask the questions in sequence. Record verified facts and identify unknowns instead of filling gaps with assumed causes.",
      prompts:[
        ["What","What requirement, output, process or condition failed? Describe the gap precisely."],
        ["Why","Why does the gap matter? Record the customer, safety, quality, delivery, cost or compliance impact."],
        ["Where","Where was it observed? Identify the site, process step, equipment, product or record."],
        ["Who","Who or what experienced the effect? Identify customers, users, teams, departments or affected populations."],
        ["When","When was it first and most recently observed? Record dates, shifts, lifecycle stages and trend."],
        ["How","How did the problem present itself and how was it detected? Describe symptoms and detection method."],
        ["How much","How often and to what extent? Quantify quantity, error rate, magnitude, duration and direction of change."],
      ],
    },
    {
      title:"TEDS interview reference",
      source:"Evidence-gathering questions",
      introduction:"Use open prompts that allow the person to explain work as performed. Do not lead the witness toward the investigator’s preferred cause.",
      prompts:[
        ["Tell","Tell me about the problem with this machine, process or activity."],
        ["Explain","Explain what makes this job difficult, variable or different from normal."],
        ["Describe","Describe the difference between the procedure, the equipment and what happens in practice."],
        ["Show","Show me how this step is normally performed and what changes during abnormal conditions."],
      ],
      evidence:[
        "People: speak with those directly involved, subject-matter experts, customers and stakeholders.",
        "Procedures: compare accounts with instructions, specifications and other controlled information.",
        "Hardware and software: retain failed items and inspect tools, equipment, settings and electronic records.",
        "Environment: examine physical conditions, interruptions, workload and organisational culture.",
      ],
    },
  ],
  5: [{
    title:"Three-legged 5 Why reference",
    source:"D4 causal analysis",
    introduction:"Develop three separate chains. Each chain answers a different control question and may reach a different actionable root cause.",
    prompts:[
      ["Leg 1: Occurrence","Why did the specific failure happen? Examine the work, equipment, material, conditions and human factors that produced it."],
      ["Leg 2: Escape","Why did prevention, inspection or error-proofing fail to detect the problem before release or impact?"],
      ["Leg 3: Systemic","Why did the management system allow the occurrence and detection weaknesses to exist or persist? Examine process definition, standardisation, review and oversight."],
      ["Why else","Test parallel explanations. A problem can require several conditions and actions to combine."],
      ["Evidence test","Treat every answer as a hypothesis until records, observation, testing or reliable witness evidence supports the causal link."],
    ],
  }],
};

function MethodReferences({ moduleNumber }) {
  const guides = methodGuides[moduleNumber] || [];
  if (!guides.length) return null;
  return <section className="iapReferences"><div className="iapReferenceHead"><small>DETAILED METHOD REFERENCES</small><h3>How to apply the method</h3><p>Open each reference while completing the investigation exercise.</p></div>{guides.map((guide) => <details className="iapReference" open key={guide.title}><summary><span>{guide.title}</span><b>{guide.source}</b></summary><div className="iapReferenceBody"><p>{guide.introduction}</p><div className="iapPromptGrid">{guide.prompts.map(([term,description]) => <article key={term}><strong>{term}</strong><span>{description}</span></article>)}</div>{guide.evidence && <div className="iapEvidence"><h4>Evidence sources to test the interview</h4>{guide.evidence.map((item) => <p key={item}>{item}</p>)}</div>}</div></details>)}</section>;
}

function LearningContent({ module }) {
  const content = module.content || {};
  const lists = Object.keys(listLabels)
    .filter((key) => Array.isArray(content[key]))
    .map((key) => [key, content[key]]);
  return <div className="iapLearning">
    {content.summary && <p className="iapLead">{content.summary}</p>}
    {Array.isArray(content.sections) && <div className="iapSections">{content.sections.map((section,index) => <article key={section.heading}><b>{String(index + 1).padStart(2,"0")}</b><div><h3>{section.heading}</h3><p>{section.body}</p></div></article>)}</div>}
    {Array.isArray(content.directions) && <section className="iapListGroup"><h3>Three-direction causal analysis</h3><div className="iapSections">{content.directions.map((item,index) => <article key={item.name}><b>{String(index + 1).padStart(2,"0")}</b><div><h3>{item.name}</h3><p>{item.question}</p></div></article>)}</div></section>}
    {lists.map(([key,items]) => <section className="iapListGroup" key={key}><h3>{listLabels[key]}</h3><div className="iapChecklist">{items.map((item,index) => <div key={`${key}-${index}`}><b>{index + 1}</b><span>{item}</span></div>)}</div></section>)}
    <MethodReferences moduleNumber={module.module_number}/>
    {content.scenario && <section className="iapScenario"><small>APPLIED RCA SCENARIO</small><h3>{content.scenario.title}</h3><p>{content.scenario.context || content.scenario.prompt}</p></section>}
    {content.interaction?.instruction && <aside className="iapWarning"><strong>Practical exercise</strong><span>{content.interaction.instruction}</span></aside>}
    {content.warning && <aside className="iapWarning"><strong>Investigation caution</strong><span>{content.warning}</span></aside>}
  </div>;
}

function InteractiveExercise({ module, enrolment, completeModuleAction, onBack }) {
  if (module.module_number === 5) return <ThreeWhyExercise module={module} enrolment={enrolment} completeModuleAction={completeModuleAction} onBack={onBack}/>;
  const exercise = exercises[module.module_number];
  const [selected,setSelected] = useState(null);
  const [rationale,setRationale] = useState("");
  const [checked,setChecked] = useState(false);
  const [reviewed,setReviewed] = useState(false);
  const correct = selected === exercise.answer;
  const ready = checked && correct && rationale.trim().length >= 25 && reviewed;
  const evidence = JSON.stringify({ question:exercise.question, selected_response:exercise.options[selected] || null, correct, rationale:rationale.trim(), guidance_reviewed:reviewed });
  return <section className="iapExercise"><button className="iapBack" type="button" onClick={onBack}>← Return to learning</button><small>INTERACTIVE DECISION ENGINE</small><h2>Apply the module</h2><p className="iapPrompt">{exercise.question}</p><div className="iapOptions">{exercise.options.map((option,index) => <button type="button" className={selected === index ? "selected" : ""} onClick={() => {setSelected(index);setChecked(false);setReviewed(false);}} key={option}><i>{String.fromCharCode(65 + index)}</i><span>{option}</span></button>)}</div><label className="iapRationale"><strong>Record your evidence-based rationale</strong><span>Explain why your decision is appropriate and what evidence or principle supports it.</span><textarea value={rationale} onChange={(event) => {setRationale(event.target.value);setChecked(false);setReviewed(false);}} placeholder="Write at least 25 characters. Your response becomes part of the module evidence."/></label><button className="iapCheck" type="button" disabled={selected === null || rationale.trim().length < 25} onClick={() => setChecked(true)}>Check my decision and show guidance</button>{checked && <div className={correct ? "iapFeedback good" : "iapFeedback review"}><strong>{correct ? "Sound RCA judgement" : "Review this decision"}</strong><p>{exercise.why}</p>{!correct && <p>Select the response that is supported by the causal logic and evidence available.</p>}<label><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)}/> I have reviewed the guidance and can explain my decision.</label></div>}<form action={completeModuleAction}><input type="hidden" name="enrolment_id" value={enrolment.id}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="learner_reflection" value={evidence}/><button className="iapSubmit" type="submit" disabled={!ready}>Submit evidence and complete module →</button></form>{!ready && <p className="iapRule">Choose the sound response, provide a rationale, check the guidance and confirm your review before continuing.</p>}</section>;
}

const whyLegs = [
  { key:"occurrence", title:"Leg 1 · Occurrence", question:"Why did the defective batch occur?", tone:"blue" },
  { key:"escape", title:"Leg 2 · Escape", question:"Why was the defect not identified before shipment?", tone:"amber" },
  { key:"systemic", title:"Leg 3 · Systemic", question:"Why did the system allow the occurrence and escape weaknesses?", tone:"green" },
];

const workedWhyExample = {
  occurrence:[
    "The machine calibration was outside the required setting.",
    "The operator did not apply the approved calibration procedure.",
    "The operator had not received practical training on that procedure.",
    "The manager had not verified the operator’s calibration competence.",
    "The competence process did not assign or trigger verification after the procedure changed.",
  ],
  escape:[
    "End-of-line inspection did not test for this defect.",
    "The quality-control checklist omitted the changed calibration characteristic.",
    "The checklist had not been reviewed after the process change.",
    "Quality and production had no defined handover for inspection-control updates.",
    "The change process did not require control-plan and checklist approval before release.",
  ],
  systemic:[
    "No routine review tested whether quality controls remained current.",
    "Management oversight did not include control-plan effectiveness.",
    "Ownership and review frequency for inspection controls were undefined.",
    "Management review received no measure of overdue or ineffective control reviews.",
    "The management system lacked a governed periodic review and escalation process.",
  ],
  evidence:{
    occurrence:"Calibration records, procedure revision, training records, competence authorisation and operator interview.",
    escape:"Inspection plan, checklist revision history, change record, release results and interviews with Quality and production.",
    systemic:"Process ownership, review schedule, management-review inputs, overdue records and change-control requirements.",
  },
};

function emptyWhyModel() {
  return { occurrence:Array(5).fill(""), escape:Array(5).fill(""), systemic:Array(5).fill("") };
}

function ThreeWhyExercise({ module, enrolment, completeModuleAction, onBack }) {
  const [model,setModel] = useState(emptyWhyModel);
  const [evidence,setEvidence] = useState({ occurrence:"", escape:"", systemic:"" });
  const [worked,setWorked] = useState(false);
  const [checked,setChecked] = useState(false);
  const [reviewed,setReviewed] = useState(false);
  const answers = whyLegs.flatMap((leg) => model[leg.key]);
  const missingAnswers = answers.filter((answer) => answer.trim().length < 8).length;
  const missingEvidence = whyLegs.filter((leg) => evidence[leg.key].trim().length < 15).length;
  const complete = missingAnswers === 0 && missingEvidence === 0;
  const ready = checked && complete && reviewed;

  function useWorkedExample(enabled) {
    setWorked(enabled);
    setChecked(false);
    setReviewed(false);
    if (enabled) {
      setModel({ occurrence:[...workedWhyExample.occurrence], escape:[...workedWhyExample.escape], systemic:[...workedWhyExample.systemic] });
      setEvidence({ ...workedWhyExample.evidence });
    } else {
      setModel(emptyWhyModel());
      setEvidence({ occurrence:"", escape:"", systemic:"" });
    }
  }

  function updateWhy(leg,index,value) {
    setModel((current) => ({ ...current, [leg]:current[leg].map((answer,answerIndex) => answerIndex === index ? value : answer) }));
    setChecked(false);
    setReviewed(false);
  }

  const rationale = `Occurrence: ${model.occurrence.join(" | ")} Evidence: ${evidence.occurrence} Escape: ${model.escape.join(" | ")} Evidence: ${evidence.escape} Systemic: ${model.systemic.join(" | ")} Evidence: ${evidence.systemic}`;
  const response = JSON.stringify({ exercise_type:"three_legged_five_why", problem:"Hypothetical defective batch", paths:model, evidence, worked_example_used:worked, all_boxes_completed:complete, correct:complete, rationale, guidance_reviewed:reviewed });

  return <section className="iapExercise iapWhyExercise"><button className="iapBack" type="button" onClick={onBack}>← Return to learning</button><small>INTERACTIVE 3 × 5 WHY MODEL</small><h2>Build all three causal paths</h2><p className="iapPrompt">A manufacturing company produced a defective batch. Complete five linked Why responses for occurrence, escape and systemic control. Record the evidence that would verify each path.</p><label className="iapWorked"><input type="checkbox" checked={worked} onChange={(event) => useWorkedExample(event.target.checked)}/><span><strong>Use the worked example from the training</strong><small>Populate every box. Review and modify the example before submission so the final model reflects your reasoning.</small></span></label><div className="iapWhyGrid">{whyLegs.map((leg) => <section className={`iapWhyLeg ${leg.tone}`} key={leg.key}><header><small>{leg.title}</small><h3>{leg.question}</h3></header>{model[leg.key].map((answer,index) => <label key={`${leg.key}-${index}`}><b>{index === 4 ? "Root cause" : `Why ${index + 1}`}</b><textarea value={answer} onChange={(event) => updateWhy(leg.key,index,event.target.value)} placeholder={index === 0 ? "Start with the immediate causal explanation" : "Why did the preceding condition exist?"}/></label>)}<label className="iapWhyEvidence"><b>Evidence to verify this path</b><textarea value={evidence[leg.key]} onChange={(event) => {setEvidence((current) => ({...current,[leg.key]:event.target.value}));setChecked(false);setReviewed(false);}} placeholder="Records, observation, test or interview evidence"/></label></section>)}</div><button className="iapCheck" type="button" onClick={() => setChecked(true)}>Check the model and show guidance</button>{checked && <div className={complete ? "iapFeedback good" : "iapFeedback review"}><strong>{complete ? "All three causal paths are complete" : "The causal model needs further evidence"}</strong>{missingAnswers > 0 && <p>Complete {missingAnswers} remaining Why box{missingAnswers === 1 ? "" : "es"}. Each answer must explain the condition immediately above it.</p>}{missingEvidence > 0 && <p>Add evidence for {missingEvidence} path{missingEvidence === 1 ? "" : "s"}. A completed chain remains a hypothesis until evidence supports each relationship.</p>}{complete && <p>Review every link for chronology, technical credibility and evidence. Replace any repeated statement that does not explain why the preceding condition existed.</p>}<label><input type="checkbox" disabled={!complete} checked={reviewed} onChange={(event) => setReviewed(event.target.checked)}/> I have reviewed all three paths, their root causes and supporting evidence.</label></div>}<form action={completeModuleAction}><input type="hidden" name="enrolment_id" value={enrolment.id}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="learner_reflection" value={response}/><button className="iapSubmit" type="submit" disabled={!ready}>Submit the 3 × 5 Why model and complete D4 →</button></form>{!ready && <p className="iapRule">Complete all 15 Why boxes, add evidence for each path, check the model and confirm your review.</p>}</section>;
}

export default function RcaTrainingPlayer({ enrolment, course, modules, progress = [], completeModuleAction }) {
  const progressMap = useMemo(() => new Map(progress.map((item) => [item.module_id,item])),[progress]);
  const firstIncomplete = modules.findIndex((item) => progressMap.get(item.id)?.status !== "completed");
  const [activeIndex,setActiveIndex] = useState(firstIncomplete === -1 ? Math.max(0,modules.length - 1) : firstIncomplete);
  const [stage,setStage] = useState("learn");
  const activeModule = modules[activeIndex];
  const completed = modules.filter((item) => progressMap.get(item.id)?.status === "completed").length;
  const percent = modules.length ? Math.round(completed / modules.length * 100) : 0;
  if (!activeModule) return <div>Course content is not currently available.</div>;

  return <div className="iapPlayer"><style>{`
    .iapPlayer{display:grid;grid-template-columns:310px minmax(0,1fr);min-height:720px;overflow:hidden;border:1px solid #d3e0e9;border-radius:18px;background:#fff}.iapSide{padding:25px;background:linear-gradient(180deg,#06264d,#071c38);color:#d7e5f2}.iapSide>small{color:#62dfd2;font-weight:900;letter-spacing:.1em}.iapSide h2{margin:8px 0 18px;color:#fff;font-size:22px}.iapProgress{height:9px;overflow:hidden;border-radius:999px;background:#21476e}.iapProgress i{display:block;height:100%;background:#16b986}.iapProgressText{display:flex;justify-content:space-between;margin-top:7px;font-size:11px}.iapNav{display:grid;gap:7px;margin-top:24px}.iapNav button{display:grid;grid-template-columns:29px minmax(0,1fr) auto;gap:9px;align-items:center;width:100%;padding:11px;border:0;border-radius:9px;background:transparent;color:#c9d9e8;text-align:left;cursor:pointer}.iapNav button:hover:not(:disabled),.iapNav button.active{background:#174e86;color:#fff}.iapNav button:disabled{cursor:not-allowed;color:#7790a8;opacity:.65}.iapNav b{display:grid;place-items:center;width:27px;height:27px;border:1px solid #6587aa;border-radius:50%;font-size:11px}.iapNav button.complete b{border-color:#0aa978;background:#0aa978;color:#fff}.iapNav span{font-size:12px;font-weight:750}.iapNav em{color:#6fe0bd;font-size:10px;font-style:normal}.iapMain{padding:34px clamp(24px,4vw,56px)}.iapTop{display:flex;justify-content:space-between;gap:20px}.iapTop small{color:#1762ef;font-size:11px;font-weight:900;letter-spacing:.1em}.iapTop h1{margin:8px 0;font-size:35px}.iapTop p{max-width:820px;color:#637a91;line-height:1.5}.iapTime{align-self:start;padding:8px 10px;border-radius:999px;background:#eef4f9;color:#45617b;font-size:11px}.iapLead{font-size:18px;line-height:1.65;color:#314f6c}.iapSections{display:grid;gap:11px}.iapSections article{display:grid;grid-template-columns:42px 1fr;gap:13px;padding:17px;border:1px solid #dfe8ee;border-radius:11px}.iapSections article>b{color:#1762ef}.iapSections h3,.iapSections p{margin:0}.iapSections p{margin-top:6px;color:#647a90;line-height:1.5}.iapListGroup{margin-top:18px}.iapListGroup h3{margin:0 0 9px;color:#173c60;font-size:14px}.iapChecklist{display:grid;grid-template-columns:1fr 1fr;gap:9px}.iapChecklist>div{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:center;padding:13px;border-radius:9px;background:#f0f5fa}.iapChecklist b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#e1ebff;color:#1762ef}.iapChecklist span{font-size:13px}.iapReferences{display:grid;gap:12px;margin-top:22px;padding:18px;border:1px solid #bcd3f6;border-radius:14px;background:#f4f8ff}.iapReferenceHead small{color:#1762ef;font-size:9px;font-weight:950;letter-spacing:.11em}.iapReferenceHead h3{margin:5px 0 2px;font-size:18px}.iapReferenceHead p{margin:0;color:#627991;font-size:12px}.iapReference{overflow:hidden;border:1px solid #cbd9e7;border-radius:11px;background:#fff}.iapReference summary{display:flex;justify-content:space-between;gap:14px;padding:14px 16px;cursor:pointer;list-style:none}.iapReference summary span{font-weight:900}.iapReference summary b{color:#1762ef;font-size:10px}.iapReferenceBody{padding:0 16px 17px;border-top:1px solid #e3eaf0}.iapReferenceBody>p{color:#506b84;line-height:1.55}.iapPromptGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.iapPromptGrid article{display:grid;grid-template-columns:85px 1fr;gap:9px;padding:11px;border-radius:8px;background:#edf4ff}.iapPromptGrid strong{color:#124dbb}.iapPromptGrid span{font-size:12px;line-height:1.4}.iapEvidence{margin-top:12px;padding:13px;border-left:4px solid #0a9a79;border-radius:8px;background:#ecf9f5}.iapEvidence h4{margin:0 0 7px}.iapEvidence p{margin:5px 0;font-size:12px}.iapScenario{margin-top:20px;padding:21px;border:1px solid #c9dcfa;border-radius:13px;background:#edf4ff}.iapScenario small,.iapExercise>small{color:#1762ef;font-size:10px;font-weight:900;letter-spacing:.1em}.iapScenario h3{margin:7px 0}.iapScenario p{color:#4c6782;line-height:1.6}.iapWarning{display:grid;gap:5px;margin-top:18px;padding:16px;border-left:5px solid #e3a31f;border-radius:9px;background:#fff7df}.iapFooter{display:flex;justify-content:space-between;gap:14px;margin-top:28px;padding-top:20px;border-top:1px solid #dfe7ed}.iapFooter button,.iapFooter a{padding:12px 16px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;text-decoration:none;cursor:pointer}.iapFooter .secondary{background:#edf3f8;color:#264762}.iapFooter button:disabled{opacity:.4}.iapExercise{max-width:900px}.iapBack{margin-bottom:25px;padding:9px 12px;border:0;border-radius:8px;background:#edf3f8;color:#264762;font-weight:850;cursor:pointer}.iapExercise h2{margin:7px 0;font-size:31px}.iapPrompt{font-size:18px;font-weight:850;line-height:1.45}.iapOptions{display:grid;gap:9px;margin:18px 0}.iapOptions button{display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:center;padding:13px;border:1px solid #ccd9e7;border-radius:10px;background:#fff;color:#183b5c;text-align:left;cursor:pointer}.iapOptions button:hover,.iapOptions button.selected{border-color:#1762ef;background:#edf4ff;box-shadow:inset 0 0 0 1px #1762ef}.iapOptions i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#e8eff8;font-style:normal;font-weight:900}.iapRationale{display:grid;gap:5px;margin-top:18px}.iapRationale span{color:#697e92;font-size:12px}.iapRationale textarea{min-height:105px;padding:13px;border:1px solid #bdcddd;border-radius:9px;font:inherit;resize:vertical}.iapCheck{width:100%;margin-top:12px;padding:12px;border:2px solid #1762ef;border-radius:9px;background:#fff;color:#1454ca;font-weight:900;cursor:pointer}.iapCheck:disabled{opacity:.45;cursor:not-allowed}.iapFeedback{margin-top:14px;padding:17px;border-left:5px solid #e2a11a;border-radius:10px;background:#fff6e5}.iapFeedback.good{border-color:#09916b;background:#eaf8f3}.iapFeedback p{margin:6px 0;line-height:1.5}.iapFeedback label{display:flex;gap:9px;align-items:start;margin-top:12px;font-weight:800}.iapSubmit{width:100%;margin-top:14px;padding:14px;border:0;border-radius:9px;background:#087f6c;color:#fff;font-weight:900;cursor:pointer}.iapSubmit:disabled{background:#9aabba;cursor:not-allowed}.iapRule{text-align:center;color:#74889a;font-size:11px}@media(max-width:850px){.iapPlayer{grid-template-columns:1fr}.iapNav{grid-template-columns:repeat(4,1fr)}.iapNav button{grid-template-columns:1fr;text-align:center}.iapNav span,.iapNav em{display:none}.iapNav b{margin:auto}.iapPromptGrid{grid-template-columns:1fr}}@media(max-width:560px){.iapNav{grid-template-columns:repeat(2,1fr)}.iapChecklist{grid-template-columns:1fr}.iapTop{display:block}.iapReference summary{display:grid}.iapPromptGrid article{grid-template-columns:1fr}}
  `}</style><aside className="iapSide"><small>RCA–8D ACADEMY</small><h2>{course.title}</h2><div className="iapProgress"><i style={{width:`${percent}%`}} /></div><div className="iapProgressText"><span>{completed} of {modules.length}</span><b>{percent}% complete</b></div><nav className="iapNav">{modules.map((module,index) => {const done=progressMap.get(module.id)?.status === "completed";const locked=firstIncomplete !== -1 && index > firstIncomplete && !done;return <button type="button" disabled={locked} className={`${index === activeIndex ? "active " : ""}${done ? "complete " : ""}`} onClick={() => {setActiveIndex(index);setStage("learn");}} key={module.id}><b>{done ? "✓" : locked ? "•" : module.module_number}</b><span>{module.title}</span>{done ? <em>Done</em> : locked ? <em>Locked</em> : null}</button>;})}</nav></aside><article className="iapMain">{stage === "exercise" && progressMap.get(activeModule.id)?.status !== "completed" ? <InteractiveExercise module={activeModule} enrolment={enrolment} completeModuleAction={completeModuleAction} onBack={() => setStage("learn")}/> : <><header className="iapTop"><div><small>MODULE {String(activeModule.module_number).padStart(2,"0")} · PRACTICAL PROBLEM SOLVING</small><h1>{activeModule.title}</h1><p>{activeModule.learning_objective}</p></div><b className="iapTime">{activeModule.estimated_minutes} min</b></header><LearningContent module={activeModule}/><footer className="iapFooter"><button className="secondary" type="button" disabled={activeIndex === 0} onClick={() => {setActiveIndex(activeIndex - 1);setStage("learn");}}>← Previous</button>{progressMap.get(activeModule.id)?.status === "completed" ? activeIndex < modules.length - 1 ? <button type="button" onClick={() => {setActiveIndex(activeIndex + 1);setStage("learn");}}>Next module →</button> : <a href={`/portal/rca/training/${enrolment.id}/assessment`}>Final assessment →</a> : <button type="button" onClick={() => setStage("exercise")}>Open interactive exercise →</button>}</footer></>}</article></div>;
}
