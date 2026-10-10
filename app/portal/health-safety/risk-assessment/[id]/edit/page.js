import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { rcaAdministrationLocations } from "../../../../../../lib/rcaCompanyLinks";

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
  const administrationLocationId = text("administration_location_id");
  const assessorPersonId = text("assessor_person_id");
  const linkedPermitId = text("linked_permit_id");
  const locations = rcaAdministrationLocations(access.organization);
  const location = locations.find((item) => item.id === administrationLocationId);
  const [{ data: assessor }, { data: linkedPermit }] = await Promise.all([
    admin.from("organization_people").select("id,first_name,last_name,email").eq("id", assessorPersonId).eq("organization_id", access.organization.id).eq("account_status", "active").maybeSingle(),
    linkedPermitId ? admin.from("hs_permits").select("id,permit_reference").eq("id", linkedPermitId).eq("organization_id", access.organization.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!location) throw new Error("Select a current business site from Administration → Business Profile.");
  if (!assessor) throw new Error("Select an active assessor from the Company User list.");
  if (linkedPermitId && !linkedPermit) throw new Error("The selected company permit is no longer available.");
  if (permitRequired && !linkedPermit && !text("permit_reference")) throw new Error("Select a company permit or enter a manual permit reference.");
  const assessorName = [assessor.first_name, assessor.last_name].filter(Boolean).join(" ") || assessor.email;
  const { error } = await admin.from("hs_risk_assessments").update({
    title: text("title"), assessment_type: text("assessment_type") || "general",
    project_number: text("project_number") || null, site_location: location.label, administration_location_id: location.id,
    area_department: text("area_department") || null, section_lab: text("section_lab") || null,
    task_description: text("task_description"), assessor_name: assessorName,
    assessor_user_id: access.user.id, assessor_person_id: assessor.id, assessor_competence_basis: text("assessor_competence_basis") || null,
    assessment_date: text("assessment_date"), persons_at_risk: personsAtRisk,
    vulnerable_persons_considered: personsAtRisk.some((item) => ["Young persons", "New or expectant mothers", "Disabled persons"].includes(item)),
    consultation_summary: text("consultation_summary") || null,
    coshh_msds_reference: text("coshh_msds_reference") || null,
    safe_system_reference: text("safe_system_reference") || null,
    permit_required: permitRequired, linked_permit_id: linkedPermit?.id || null,
    permit_reference: permitRequired ? linkedPermit?.permit_reference || text("permit_reference") || null : null,
    associated_documents: text("associated_documents") || null,
    emergency_arrangements: text("emergency_arrangements") || null,
  }).eq("id", id).eq("organization_id", access.organization.id);
  if (error) throw new Error(error.message);
  const permitFile = formData.get("permit_document");
  if (permitFile instanceof File && permitFile.size) {
    if (permitFile.size > 10 * 1024 * 1024) throw new Error("The permit file must be 10 MB or smaller.");
    const permittedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png", "image/webp"];
    if (!permittedTypes.includes(permitFile.type)) throw new Error("Upload the permit as PDF, Word, JPG, PNG or WebP.");
    const safeName = permitFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${access.organization.id}/${id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await admin.storage.from("hs-risk-assessment-evidence").upload(path, permitFile, { contentType: permitFile.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { error: evidenceError } = await admin.from("hs_risk_assessments").update({ permit_document_path: path, permit_document_name: permitFile.name, permit_document_mime_type: permitFile.type, permit_document_size_bytes: permitFile.size }).eq("id", id).eq("organization_id", access.organization.id);
    if (evidenceError) {
      await admin.storage.from("hs-risk-assessment-evidence").remove([path]);
      throw new Error(evidenceError.message);
    }
  }
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
  const locations = rcaAdministrationLocations(access.organization);
  const [{ data: companyPeople, error: peopleError }, { data: permits, error: permitsError }] = await Promise.all([
    admin.from("organization_people").select("id,first_name,last_name,email,position").eq("organization_id", access.organization.id).eq("account_status", "active").order("last_name"),
    admin.from("hs_permits").select("id,permit_reference,permit_type,status").eq("organization_id", access.organization.id).not("status", "in", '(closed,cancelled)').order("updated_at", { ascending: false }),
  ]);
  if (peopleError || permitsError) throw new Error(peopleError?.message || permitsError?.message);
  const selectedPeople = new Set(assessment.persons_at_risk || []);
  return <main className="rae"><style>{`
    *{box-sizing:border-box}.rae{min-height:100vh;padding:32px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.raeShell{max-width:1050px;margin:auto}.raeTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.raeTop small{color:#087f6c;font-weight:900;letter-spacing:.1em}.raeTop h1{margin:7px 0}.raeTop p{margin:0;color:#657b93}.raeBack{padding:11px 15px;border:1px solid #cbd9e4;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.raeForm{display:grid;gap:14px;margin-top:22px}.raeCard{padding:23px;border:1px solid #d5e2ea;border-radius:15px;background:#fff}.raeCard h2{margin:0 0 16px}.raeGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.raeField{display:grid;gap:6px}.raeField.full{grid-column:1/-1}.raeField label,.raeLegend{font-size:12px;font-weight:900;color:#294967}.raeField input,.raeField select,.raeField textarea{width:100%;padding:12px;border:1px solid #cbd8e5;border-radius:9px;background:#fff;font:inherit}.raeField textarea{min-height:90px}.raeChecks{display:flex;gap:8px;flex-wrap:wrap}.raeCheck{display:flex;gap:7px;align-items:center;padding:9px 11px;border:1px solid #d2deea;border-radius:9px;font-size:12px}.raeSubmit{display:flex;justify-content:flex-end;padding:16px;border-radius:13px;background:#082a54}.raeSubmit button{padding:13px 18px;border:0;border-radius:9px;background:#0aae79;color:#fff;font-weight:900}@media(max-width:700px){.raeTop{display:grid}.raeGrid{grid-template-columns:1fr}.raeField.full{grid-column:auto}}
  `}</style><div className="raeShell"><header className="raeTop"><div><small>{assessment.assessment_reference} · VERSION {assessment.version} · DRAFT CONTROL</small><h1>Edit assessment details</h1><p>Update the assessment context before controlled review and approval.</p></div><Link className="raeBack" href={"/portal/health-safety/risk-assessment/" + id}>← Assessment</Link></header><form className="raeForm" action={updateAssessment} encType="multipart/form-data"><input type="hidden" name="assessment_id" value={id}/>
    <section className="raeCard"><h2>Scope and identity</h2><div className="raeGrid"><div className="raeField full"><label>Title *</label><input name="title" defaultValue={assessment.title || ""} required minLength={3}/></div><div className="raeField"><label>Assessment type *</label><select name="assessment_type" defaultValue={assessment.assessment_type || "general"}>{types.map(([value,title])=><option value={value} key={value}>{title}</option>)}</select></div><div className="raeField"><label>Project / job number</label><input name="project_number" defaultValue={assessment.project_number || ""}/></div><div className="raeField"><label>Site / location *</label><select name="administration_location_id" defaultValue={assessment.administration_location_id || ""} required><option value="" disabled>Select business address</option>{locations.map((location)=><option value={location.id} key={location.id}>{location.label}</option>)}</select><small>From Administration → Business Profile.</small></div><div className="raeField"><label>Area / department</label><input name="area_department" defaultValue={assessment.area_department || ""}/></div><div className="raeField"><label>Section / laboratory</label><input name="section_lab" defaultValue={assessment.section_lab || ""}/></div><div className="raeField full"><label>Activity, task or workplace description *</label><textarea name="task_description" defaultValue={assessment.task_description || ""} required/></div></div></section>
    <section className="raeCard"><h2>Assessor and people affected</h2><div className="raeGrid"><div className="raeField"><label>Assessor name *</label><select name="assessor_person_id" defaultValue={assessment.assessor_person_id || ""} required><option value="" disabled>Select active company user</option>{(companyPeople || []).map((person)=><option value={person.id} key={person.id}>{[person.first_name,person.last_name].filter(Boolean).join(" ")} · {person.position || person.email}</option>)}</select><small>From Company Users.</small></div><div className="raeField"><label>Competence basis</label><input name="assessor_competence_basis" defaultValue={assessment.assessor_competence_basis || ""}/></div><div className="raeField"><label>Assessment date *</label><input type="date" name="assessment_date" defaultValue={assessment.assessment_date || ""} required/></div><fieldset className="raeField full" style={{border:0,padding:0,margin:0}}><legend className="raeLegend">People who may be affected *</legend><div className="raeChecks">{people.map((group)=><label className="raeCheck" key={group}><input type="checkbox" name="persons_at_risk" value={group} defaultChecked={selectedPeople.has(group)}/>{group}</label>)}</div></fieldset><div className="raeField full"><label>Worker consultation and input</label><textarea name="consultation_summary" defaultValue={assessment.consultation_summary || ""}/></div></div></section>
    <section className="raeCard"><h2>Related controls</h2><div className="raeGrid"><div className="raeField"><label>COSHH / safety data reference</label><input name="coshh_msds_reference" defaultValue={assessment.coshh_msds_reference || ""}/></div><div className="raeField"><label>Safe system of work reference</label><input name="safe_system_reference" defaultValue={assessment.safe_system_reference || ""}/></div><div className="raeField full"><label><input type="checkbox" name="permit_required" value="yes" defaultChecked={Boolean(assessment.permit_required)}/> Permit to work is required</label></div><div className="raeField full"><label>Existing company permit</label><select name="linked_permit_id" defaultValue={assessment.linked_permit_id || ""}><option value="">No existing RPG permit / enter manually</option>{(permits || []).map((permit)=><option value={permit.id} key={permit.id}>{permit.permit_reference} · {String(permit.permit_type).replaceAll("_"," ")} · {permit.status}</option>)}</select></div><div className="raeField"><label>Manual permit reference / type</label><input name="permit_reference" defaultValue={assessment.linked_permit_id ? "" : assessment.permit_reference || ""}/></div><div className="raeField"><label>Upload or replace external permit evidence</label><input type="file" name="permit_document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"/>{assessment.permit_document_name && <small>Current file: {assessment.permit_document_name}</small>}</div><div className="raeField"><label>Associated documents</label><input name="associated_documents" defaultValue={assessment.associated_documents || ""}/></div><div className="raeField full"><label>Emergency arrangements</label><textarea name="emergency_arrangements" defaultValue={assessment.emergency_arrangements || ""}/></div></div></section>
    <footer className="raeSubmit"><button type="submit">Save assessment details →</button></footer>
  </form></div></main>;
}
