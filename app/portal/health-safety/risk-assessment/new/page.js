import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

export const metadata = { title: "New Risk Assessment | RPG Excellence" };
export const dynamic = "force-dynamic";

const types = [
  ["general", "General workplace"], ["task", "Task / activity"], ["workplace", "Workplace / area"],
  ["project", "Project"], ["equipment", "Equipment"], ["change", "Management of change"],
  ["young_person", "Young person"], ["new_or_expectant_mother", "New or expectant mother"],
  ["lone_working", "Lone working"], ["other", "Other"],
];
const people = ["Employees", "Contractors", "Visitors", "Members of the public", "Young persons", "New or expectant mothers", "Disabled persons", "Lone workers", "Others"];

async function createRiskAssessment(formData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/risk-assessments/new");
  const { data: organisation, error: orgError } = await supabase.from("organizations").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (orgError) throw new Error(orgError.message);
  if (!organisation) throw new Error("Create an organisation before starting a risk assessment.");

  const text = (name) => String(formData.get(name) || "").trim();
  const title = text("title");
  const taskDescription = text("task_description");
  const assessorName = text("assessor_name");
  const assessmentDate = text("assessment_date");
  const reviewDate = text("review_date");
  const personsAtRisk = formData.getAll("persons_at_risk").map(String);
  if (title.length < 3) throw new Error("Enter a clear risk assessment title.");
  if (!taskDescription || !assessorName) throw new Error("The activity description and assessor name are required.");
  if (!assessmentDate || !reviewDate) throw new Error("Assessment and review dates are required.");
  if (!personsAtRisk.length) throw new Error("Select at least one group of people who may be affected.");
  const permitRequired = formData.get("permit_required") === "yes";
  const permitReference = text("permit_reference");
  if (permitRequired && !permitReference) throw new Error("Enter the permit type or reference.");

  const frequency = text("review_frequency_months");
  const { data: assessment, error } = await supabase.from("hs_risk_assessments").insert({
    owner_id: user.id,
    organization_id: organisation.id,
    title,
    assessment_type: text("assessment_type") || "general",
    site_location: text("site_location") || null,
    area_department: text("area_department") || null,
    section_lab: text("section_lab") || null,
    project_number: text("project_number") || null,
    task_description: taskDescription,
    assessor_name: assessorName,
    assessor_user_id: user.id,
    assessor_competence_basis: text("assessor_competence_basis") || null,
    assessment_date: assessmentDate,
    review_date: reviewDate,
    review_frequency_months: frequency ? Number(frequency) : null,
    coshh_msds_reference: text("coshh_msds_reference") || null,
    safe_system_reference: text("safe_system_reference") || null,
    permit_required: permitRequired,
    permit_reference: permitReference || null,
    associated_documents: text("associated_documents") || null,
    persons_at_risk: personsAtRisk,
    vulnerable_persons_considered: personsAtRisk.some((item) => ["Young persons", "New or expectant mothers", "Disabled persons"].includes(item)),
    consultation_summary: text("consultation_summary") || null,
    emergency_arrangements: text("emergency_arrangements") || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  redirect("/portal/health-safety/risk-assessments/" + assessment.id);
}

export default async function NewRiskAssessmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/health-safety/risk-assessments/new");
  const today = new Date().toISOString().slice(0, 10);

  return <main className="nrPage"><style>{`
    *{box-sizing:border-box}.nrPage{min-height:100vh;padding:34px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.nrShell{max-width:1180px;margin:auto}.nrTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.nrTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.nrTop h1{font-size:35px;margin:7px 0}.nrTop p{margin:0;color:#657b93}.nrBack{padding:11px 15px;border:1px solid #ccd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.nrGuide{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:24px 0}.nrGuide div{padding:13px;border:1px solid #d5e2ea;border-radius:11px;background:#fff}.nrGuide b,.nrGuide span{display:block}.nrGuide b{color:#087f6c}.nrGuide span{font-size:11px;margin-top:5px;color:#647990;font-weight:800}.nrGuide div:first-child{background:#087f6c}.nrGuide div:first-child b,.nrGuide div:first-child span{color:#fff}.nrForm{display:grid;gap:15px}.nrCard{padding:25px;border:1px solid #d5e2ea;border-radius:16px;background:#fff}.nrHead{margin-bottom:20px}.nrHead span{color:#1762ef;font-size:11px;font-weight:900;letter-spacing:.1em}.nrHead h2{margin:6px 0;font-size:22px}.nrHead p{margin:0;color:#6b8096}.nrGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.nrField{display:grid;gap:7px}.nrField.full{grid-column:1/-1}.nrField label,.nrLegend{font-size:12px;font-weight:900;color:#294967}.nrField input,.nrField select,.nrField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;background:#fff;color:#102d49;font:inherit}.nrField textarea{min-height:94px;resize:vertical}.nrField input:focus,.nrField select:focus,.nrField textarea:focus{outline:3px solid #dceaff;border-color:#1762ef}.nrChecks{display:flex;gap:9px;flex-wrap:wrap;margin-top:9px}.nrCheck{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #d2deea;border-radius:9px;color:#37546f;font-size:12px;font-weight:750}.nrCheck input{accent-color:#087f6c}.nrPermit{display:flex!important;align-items:center;gap:9px}.nrPermit input{width:auto}.nrNotice{padding:17px;border-left:5px solid #e6a71d;border-radius:10px;background:#fff8e6;color:#68501b;line-height:1.5}.nrSubmit{position:sticky;bottom:12px;display:flex;justify-content:space-between;gap:20px;align-items:center;padding:17px 20px;border-radius:14px;background:#082a54;color:#fff;box-shadow:0 18px 45px #082a5440}.nrSubmit span{font-size:13px;color:#c8d8e8}.nrSubmit button{padding:13px 19px;border:0;border-radius:9px;background:#0aae79;color:#fff;font-weight:900;cursor:pointer}@media(max-width:760px){.nrGuide{grid-template-columns:1fr}.nrGrid{grid-template-columns:1fr}.nrField.full{grid-column:auto}.nrSubmit{position:static;display:grid}}
  `}</style><div className="nrShell">
    <header className="nrTop"><div><small>H&amp;S HUB · GUIDED ASSESSMENT</small><h1>Create a risk assessment</h1><p>Establish the scope and people affected before identifying individual hazards.</p></div><Link className="nrBack" href="/portal/health-safety/risk-assessments">← Risk Assessment Register</Link></header>
    <section className="nrGuide">{[["1","Define context"],["2","Identify hazards"],["3","Evaluate risk"],["4","Control risk"],["5","Approve & review"]].map(([number,title]) => <div key={number}><b>{number}</b><span>{title}</span></div>)}</section>
    <form className="nrForm" action={createRiskAssessment}>
      <section className="nrCard"><div className="nrHead"><span>STEP 1A</span><h2>Assessment identity and scope</h2><p>Define clear boundaries for the work being assessed.</p></div><div className="nrGrid">
        <div className="nrField full"><label htmlFor="title">Risk assessment title *</label><input id="title" name="title" required minLength={3} placeholder="For example: Operation of pedestal drill in Engineering Workshop"/></div>
        <div className="nrField"><label htmlFor="assessment_type">Assessment type *</label><select id="assessment_type" name="assessment_type" required>{types.map(([value,title]) => <option value={value} key={value}>{title}</option>)}</select></div>
        <div className="nrField"><label htmlFor="project_number">Project / job number</label><input id="project_number" name="project_number"/></div>
        <div className="nrField"><label htmlFor="site_location">Site / location</label><input id="site_location" name="site_location"/></div>
        <div className="nrField"><label htmlFor="area_department">Area / department</label><input id="area_department" name="area_department"/></div>
        <div className="nrField"><label htmlFor="section_lab">Section / laboratory</label><input id="section_lab" name="section_lab"/></div>
        <div className="nrField full"><label htmlFor="task_description">Activity, task or workplace description *</label><textarea id="task_description" name="task_description" required placeholder="Describe normal work, foreseeable abnormal conditions, equipment, materials and boundaries."/></div>
      </div></section>
      <section className="nrCard"><div className="nrHead"><span>STEP 1B</span><h2>Assessor and review control</h2><p>Record who completed the assessment and the basis of competence.</p></div><div className="nrGrid">
        <div className="nrField"><label htmlFor="assessor_name">Assessor name *</label><input id="assessor_name" name="assessor_name" required/></div>
        <div className="nrField"><label htmlFor="assessor_competence_basis">Assessor competence basis</label><input id="assessor_competence_basis" name="assessor_competence_basis" placeholder="Training, knowledge, skills and experience"/></div>
        <div className="nrField"><label htmlFor="assessment_date">Assessment date *</label><input id="assessment_date" name="assessment_date" type="date" defaultValue={today} required/></div>
        <div className="nrField"><label htmlFor="review_date">Planned review date *</label><input id="review_date" name="review_date" type="date" min={today} required/></div>
        <div className="nrField"><label htmlFor="review_frequency_months">Review frequency</label><select id="review_frequency_months" name="review_frequency_months"><option value="">Event-based / not fixed</option><option value="3">Every 3 months</option><option value="6">Every 6 months</option><option value="12">Every 12 months</option><option value="24">Every 24 months</option><option value="36">Every 36 months</option></select></div>
      </div></section>
      <section className="nrCard"><div className="nrHead"><span>STEP 1C</span><h2>People who may be affected</h2><p>Consider routine, non-routine and vulnerable groups.</p></div><fieldset style={{border:0,padding:0,margin:0}}><legend className="nrLegend">Select at least one group *</legend><div className="nrChecks">{people.map((group) => <label className="nrCheck" key={group}><input type="checkbox" name="persons_at_risk" value={group}/>{group}</label>)}</div></fieldset><div className="nrGrid" style={{marginTop:18}}><div className="nrField full"><label htmlFor="consultation_summary">Worker consultation and input</label><textarea id="consultation_summary" name="consultation_summary" placeholder="Record who was consulted and what practical information they contributed."/></div></div></section>
      <section className="nrCard"><div className="nrHead"><span>STEP 1D</span><h2>Related control information</h2><p>Connect existing safe systems, permits and emergency arrangements.</p></div><div className="nrGrid">
        <div className="nrField"><label htmlFor="coshh_msds_reference">COSHH / safety data reference</label><input id="coshh_msds_reference" name="coshh_msds_reference"/></div>
        <div className="nrField"><label htmlFor="safe_system_reference">Safe system of work reference</label><input id="safe_system_reference" name="safe_system_reference"/></div>
        <div className="nrField full"><label className="nrPermit"><input type="checkbox" name="permit_required" value="yes"/>Permit to work is required</label></div>
        <div className="nrField"><label htmlFor="permit_reference">Permit reference / type</label><input id="permit_reference" name="permit_reference"/></div>
        <div className="nrField"><label htmlFor="associated_documents">Associated documents</label><input id="associated_documents" name="associated_documents"/></div>
        <div className="nrField full"><label htmlFor="emergency_arrangements">Emergency arrangements</label><textarea id="emergency_arrangements" name="emergency_arrangements"/></div>
      </div></section>
      <aside className="nrNotice"><strong>Suitable and sufficient:</strong> keep the assessment proportionate to the risk, focused on significant findings and understandable to the people who will use it.</aside>
      <footer className="nrSubmit"><span>A controlled reference will be generated automatically.</span><button type="submit">Create assessment and identify hazards →</button></footer>
    </form>
  </div></main>;
}
