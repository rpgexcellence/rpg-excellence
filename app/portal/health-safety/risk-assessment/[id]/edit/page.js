import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../../../../lib/organization-access";

export const metadata = { title: "Edit Risk Assessment | RPG Excellence" };
export const dynamic = "force-dynamic";

const editableStatuses = ["draft", "changes_required"];
const types = [["general","General workplace"],["task","Task / activity"],["workplace","Workplace / area"],["project","Project"],["equipment","Equipment"],["change","Management of change"],["young_person","Young person"],["new_or_expectant_mother","New or expectant mother"],["lone_working","Lone working"],["other","Other"]];
const people = ["Employees", "Contractors", "Visitors", "Members of the public", "Young persons", "New or expectant mothers", "Disabled persons", "Lone workers", "Others"];

async function updateAssessment(formData) {
  "use server";
  const access = await requireOrganizationAccess("risk_management", "contribute", "/portal/health-safety/risk-assessment");
  const admin = createAdminClient();
  const id = String(formData.get("assessment_id") || "");
  const text = (name) => String(formData.get(name) || "").trim();
  const personsAtRisk = formData.getAll("persons_at_risk").map(String);
  if (text("title").length < 3) throw new Error("Enter a clear risk assessment title.");
  if (!text("task_description") || !text("assessor_name") || !text("assessment_date")) throw new Error("Complete the activity, assessor and assessment date fields.");
  if (!personsAtRisk.length) throw new Error("Select at least one group of people who may be affected.");
  const { data: current, error: readError } = await admin.from("hs_risk_assessments").select("status").eq("id", id).eq("organization_id", access.organization.id).single();
  if (readError || !current) throw new Error("The assessment could not be accessed.");
  if (!editableStatuses.includes(current.status)) throw new Error("This controlled version is locked. Create a new revision before changing assessment details.");
  const permitRequired = formData.get("permit_required") === "yes";
  const { error } = await admin.from("hs_risk_assessments").update({
    title: text("title"), assessment_type: text("assessment_type") || "general",
    project_number: text("project_number") || null, site_location: text("site_location") || null,
    area_department: text("area_department") || null, section_lab: text("section_lab") || null,
    task_description: text("task_description"), assessor_name: text("assessor_name"),
    assessor_user_id: access.user.id, assessor_competence_basis: text("assessor_competence_basis") || null,
    assessment_date: text("assessment_date"), persons_at_risk: personsAtRisk,
    vulnerable_persons_considered: personsAtRisk.some((item) => ["Young persons", "New or expectant mothers", "Disabled persons"].includes(item)),
    consultation_summary: text("consultation_summary") || null,
    coshh_msds_reference: text("coshh_msds_reference") || null,
    safe_system_reference: text("safe_system_reference") || null,
    permit_required: permitRequired, permit_reference: permitRequired ? text("permit_reference") || null : null,
    associated_documents: text("associated_documents") || null,
    emergency_arrangements: text("emergency_arrangements") || null,
  }).eq("id", id).eq("organization_id", access.organization.id);
  if (error) throw new Error(error.message);
  redirect("/portal/health-safety/risk-assessment/" + id);
}

export default async function EditRiskAssessmentPage({ params }) {
  const { id } = await params;
  const access = await requireOrganizationAccess("risk_management", "contribute", "/portal/health-safety/risk-assessment/" + id + "/edit");
  const admin = createAdminClient();
  const { data: assessment, error } = await admin.from("hs_risk_assessments").select("*").eq("id", id).eq("organization_id", access.organization.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!assessment) notFound();
  if (!editableStatuses.includes(assessment.status)) redirect("/portal/health-safety/risk-assessment/" + id);
  const selectedPeople = new Set(assessment.persons_at_risk || []);
  return <main className="rae"><style>{`
    *{box-sizing:border-box}.rae{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.raeShell{max-width:1050px;margin:auto}.raeTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.raeTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.raeTop h1{margin:7px 0}.raeTop p{margin:0;color:#657b93}.raeBack{padding:11px 15px;border:1px solid #cbd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.raeForm{display:grid;gap:14px;margin-top:22px}.raeCard{padding:23px;border:1px solid #d5e2ea;border-radius:15px;background:#fff}.raeCard h2{margin:0 0 16px}.raeGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.raeField{display:grid;gap:6px}.raeField.full{grid-column:1/-1}.raeField label,.raeLegend{font-size:12px;font-weight:900;color:#294967}.raeField input,.raeField select,.raeField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;background:#fff;font:inherit}.raeField textarea{min-height:90px}.raeChecks{display:flex;gap:8px;flex-wrap:wrap}.raeCheck{display:flex;gap:7px;align-items:center;padding:9px 11px;border:1px solid #d2deea;border-radius:9px;font-size:12px}.raeSubmit{display:flex;justify-content:flex-end;padding:16px;border-radius:13px;background:#082a54}.raeSubmit button{padding:13px 18px;border:0;border-radius:9px;background:#0aae79;color:#fff;font-weight:900}@media(max-width:700px){.raeTop{display:grid}.raeGrid{grid-template-columns:1fr}.raeField.full{grid-column:auto}}
  `}</style><div className="raeShell"><header className="raeTop"><div><small>{assessment.assessment_reference} · VERSION {assessment.version} · DRAFT CONTROL</small><h1>Edit assessment details</h1><p>Update the assessment context before controlled review and approval.</p></div><Link className="raeBack" href={"/portal/health-safety/risk-assessment/" + id}>← Assessment</Link></header><form className="raeForm" action={updateAssessment}><input type="hidden" name="assessment_id" value={id}/>
    <section className="raeCard"><h2>Scope and identity</h2><div className="raeGrid"><div className="raeField full"><label>Title *</label><input name="title" defaultValue={assessment.title || ""} required minLength={3}/></div><div className="raeField"><label>Assessment type *</label><select name="assessment_type" defaultValue={assessment.assessment_type || "general"}>{types.map(([value,title])=><option value={value} key={value}>{title}</option>)}</select></div><div className="raeField"><label>Project / job number</label><input name="project_number" defaultValue={assessment.project_number || ""}/></div><div className="raeField"><label>Site / location</label><input name="site_location" defaultValue={assessment.site_location || ""}/></div><div className="raeField"><label>Area / department</label><input name="area_department" defaultValue={assessment.area_department || ""}/></div><div className="raeField"><label>Section / laboratory</label><input name="section_lab" defaultValue={assessment.section_lab || ""}/></div><div className="raeField full"><label>Activity, task or workplace description *</label><textarea name="task_description" defaultValue={assessment.task_description || ""} required/></div></div></section>
    <section className="raeCard"><h2>Assessor and people affected</h2><div className="raeGrid"><div className="raeField"><label>Assessor name *</label><input name="assessor_name" defaultValue={assessment.assessor_name || ""} required/></div><div className="raeField"><label>Competence basis</label><input name="assessor_competence_basis" defaultValue={assessment.assessor_competence_basis || ""}/></div><div className="raeField"><label>Assessment date *</label><input type="date" name="assessment_date" defaultValue={assessment.assessment_date || ""} required/></div><fieldset className="raeField full" style={{border:0,padding:0,margin:0}}><legend className="raeLegend">People who may be affected *</legend><div className="raeChecks">{people.map((group)=><label className="raeCheck" key={group}><input type="checkbox" name="persons_at_risk" value={group} defaultChecked={selectedPeople.has(group)}/>{group}</label>)}</div></fieldset><div className="raeField full"><label>Worker consultation and input</label><textarea name="consultation_summary" defaultValue={assessment.consultation_summary || ""}/></div></div></section>
    <section className="raeCard"><h2>Related controls</h2><div className="raeGrid"><div className="raeField"><label>COSHH / safety data reference</label><input name="coshh_msds_reference" defaultValue={assessment.coshh_msds_reference || ""}/></div><div className="raeField"><label>Safe system of work reference</label><input name="safe_system_reference" defaultValue={assessment.safe_system_reference || ""}/></div><div className="raeField full"><label><input type="checkbox" name="permit_required" value="yes" defaultChecked={Boolean(assessment.permit_required)}/> Permit to work is required</label></div><div className="raeField"><label>Permit reference / type</label><input name="permit_reference" defaultValue={assessment.permit_reference || ""}/></div><div className="raeField"><label>Associated documents</label><input name="associated_documents" defaultValue={assessment.associated_documents || ""}/></div><div className="raeField full"><label>Emergency arrangements</label><textarea name="emergency_arrangements" defaultValue={assessment.emergency_arrangements || ""}/></div></div></section>
    <footer className="raeSubmit"><button type="submit">Save assessment details →</button></footer>
  </form></div></main>;
}
