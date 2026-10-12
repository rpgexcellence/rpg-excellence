import { randomUUID } from "node:crypto";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { mocPersonName } from "../../../../../lib/mocCompanyLinks";
export const dynamic = "force-dynamic";
const title = (v) =>
    String(v || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  date = (v) =>
    v
      ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
          new Date(v),
        )
      : "—";

async function controlledMoc(id, minimumLevel = "contribute") {
  const context = await requireOrganizationAccess(
    "risk_management",
    minimumLevel,
    `/portal/health-safety/moc/${id}`,
  );
  const admin = createAdminClient();
  const { data: item, error } = await admin
    .from("hs_moc_changes")
    .select("*")
    .eq("id", id)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!item) notFound();
  return { ...context, admin, item };
}

async function controlledPerson(admin, organizationId, personId, label) {
  const { data, error } = await admin
    .from("organization_people")
    .select("id,first_name,last_name,email,position")
    .eq("id", personId)
    .eq("organization_id", organizationId)
    .eq("account_status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${label} must be selected from the active Company User list.`);
  return { ...data, name: mocPersonName(data) };
}

async function progress(fd) {
  "use server";
  const id = String(fd.get("id") || ""),
    intent = String(fd.get("intent") || ""),
    personId = String(fd.get("person_id") || "").trim(),
    comments = String(fd.get("comments") || "").trim(),
    now = new Date().toISOString();
  const { admin, item, organization } = await controlledMoc(id);
  const person = ["verify_gate", "return_gate", "close"].includes(intent) || intent.startsWith("approve_")
    ? await controlledPerson(admin, organization.id, personId, intent === "close" ? "Closure approver" : intent.startsWith("approve_") ? "Approver" : "HSE reviewer")
    : null;
  let values = { updated_at: now };
  if (intent === "verify_gate") {
    values = {
      ...values,
      hse_gate_status: "verified",
      hse_reviewer_person_id: person.id,
      hse_gate_reviewer: person.name,
      hse_gate_comments: comments || null,
      hse_gate_at: now,
      status: item.pathway === "full" ? "risk_review" : "approval",
    };
  } else if (intent === "return_gate") {
    if (!comments)
      throw new Error("Reviewer and return reason are required.");
    values = {
      ...values,
      hse_gate_status: "returned",
      hse_reviewer_person_id: person.id,
      hse_gate_reviewer: person.name,
      hse_gate_comments: comments,
      hse_gate_at: now,
      status: "returned",
    };
  } else if (intent.startsWith("approve_")) {
    const role = intent.replace("approve_", "");
    const approvals = {
      ...(item.approvals || {}),
      [role]: { status: "approved", person_id: person.id, name: person.name, comments, at: now },
    };
    const required =
      item.pathway === "full"
        ? ["hse", "engineering", "operations", "quality"]
        : ["manager"];
    const done = required.every((x) => approvals[x]?.status === "approved");
    values = { ...values, approvals, status: done ? "approved" : "approval" };
  } else if (intent === "begin_implementation") {
    if (item.pssr_required && !item.pssr_complete)
      throw new Error("Complete the PSSR before implementation.");
    values = { ...values, status: "implementation" };
  } else if (intent === "complete_implementation") {
    if (!comments) throw new Error("Record implementation evidence.");
    values = {
      ...values,
      status: "verification",
      actual_date: new Date().toISOString().slice(0, 10),
      post_implementation_review: comments,
    };
  } else if (intent === "complete_pssr")
    values = { ...values, pssr_complete: true };
  else if (intent === "close") {
    if (!comments)
      throw new Error(
        "Closure approver and verification comments are required.",
      );
    values = {
      ...values,
      status: "closed",
      closure_approver_person_id: person.id,
      closure_approver: person.name,
      closure_comments: comments,
      closed_at: now,
    };
  } else throw new Error("Unsupported MOC action.");
  const { error } = await admin
    .from("hs_moc_changes")
    .update(values)
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/health-safety/moc/${id}`);
  revalidatePath("/portal/health-safety/moc");
}
async function addAction(fd) {
  "use server";
  const id = String(fd.get("id") || ""),
    action = String(fd.get("action") || "").trim(),
    responsiblePersonId = String(fd.get("responsible_person_id") || "").trim(),
    target = String(fd.get("target") || "");
  if (!action || !responsiblePersonId || !target)
    throw new Error(
      "Complete the action, select an active Company User and enter the target date.",
    );
  const { admin, user, organization } = await controlledMoc(id);
  const owner = await controlledPerson(admin, organization.id, responsiblePersonId, "Action owner");
  const { error } = await admin.from("hs_moc_actions").insert({
    moc_id: id,
    owner_id: user.id,
    action_required: action,
    responsible_person_id: owner.id,
    responsible_name: owner.name,
    responsible_email: owner.email || null,
    target_date: target,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/health-safety/moc/${id}`);
}
async function completeAction(fd) {
  "use server";
  const id = String(fd.get("id") || ""),
    moc = String(fd.get("moc") || ""),
    evidence = String(fd.get("evidence") || "").trim(),
    file = fd.get("evidence_file");
  if (!evidence)
    throw new Error("Record an objective-evidence description or reference.");
  if (!(file instanceof File) || !file.size)
    throw new Error("Upload objective evidence before submitting the action.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Objective evidence must be 10 MB or smaller.");
  const { admin, user, item } = await controlledMoc(moc);
  const { data: controlledAction } = await admin
    .from("hs_moc_actions")
    .select("id")
    .eq("id", id)
    .eq("moc_id", item.id)
    .maybeSingle();
  if (!controlledAction)
    throw new Error("The selected MOC action is not available.");
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
    path = `${user.id}/${moc}/${id}/${randomUUID()}-${safe}`,
    storage = admin.storage.from("hs-moc-evidence");
  const { error: uploadError } = await storage.upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await admin
    .from("hs_moc_actions")
    .update({
      status: "awaiting_verification",
      evidence,
      evidence_storage_path: path,
      evidence_file_name: file.name,
      evidence_mime_type: file.type,
      evidence_size_bytes: file.size,
      completed_at: new Date().toISOString(),
      verification_result: null,
      verifier_name: null,
      verification_comments: null,
      verified_at: null,
    })
    .eq("id", id)
    .eq("moc_id", item.id);
  if (error) {
    await storage.remove([path]);
    throw new Error(error.message);
  }
  revalidatePath(`/portal/health-safety/moc/${moc}`);
}
async function verifyAction(fd) {
  "use server";
  const id = String(fd.get("id") || ""),
    moc = String(fd.get("moc") || ""),
    result = String(fd.get("result") || ""),
    verifierPersonId = String(fd.get("verifier_person_id") || "").trim(),
    comments = String(fd.get("comments") || "").trim();
  if (!["successful", "rejected"].includes(result) || !verifierPersonId || !comments)
    throw new Error(
      "Record the verifier, decision and objective-evidence conclusion.",
    );
  const { admin, item, organization } = await controlledMoc(moc);
  const verifier = await controlledPerson(admin, organization.id, verifierPersonId, "Independent verifier");
  const { error } = await admin
    .from("hs_moc_actions")
    .update({
      status: result === "successful" ? "verified" : "rejected",
      verification_result: result,
      verifier_person_id: verifier.id,
      verifier_name: verifier.name,
      verification_comments: comments,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("moc_id", item.id)
    .eq("status", "awaiting_verification");
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/health-safety/moc/${moc}`);
}
export default async function MocRecord({ params }) {
  const { id } = await params;
  const {
    admin,
    item: controlledItem,
    organization,
  } = await controlledMoc(id, "view");
  const [{ data: actions }, { data: assessment }, { data: asset }, { data: people = [] }, { data: permitLinks = [] }, { data: assessmentLinks = [] }] =
    await Promise.all([
      admin
        .from("hs_moc_actions")
        .select("*")
        .eq("moc_id", id)
        .order("created_at"),
      controlledItem.linked_assessment_id
        ? admin
            .from("hs_risk_assessments")
            .select("id,assessment_reference,title")
            .eq("id", controlledItem.linked_assessment_id)
            .eq("organization_id", organization.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      controlledItem.organization_asset_id
        ? admin
            .from("organization_assets")
            .select(
              "id,asset_reference,asset_name,asset_type,site_location_label,area_department,asset_owner_person_id,criticality,ppm_required,last_maintenance_date,next_maintenance_date,operational_status",
            )
            .eq("id", controlledItem.organization_asset_id)
            .eq("organization_id", organization.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("organization_people")
        .select("id,first_name,last_name,email,position")
        .eq("organization_id", organization.id)
        .eq("account_status", "active")
        .order("last_name"),
      admin
        .from("hs_moc_permits")
        .select("relationship_type,hs_permits(id,permit_reference,permit_type,task_description,status)")
        .eq("moc_id", id),
      admin
        .from("hs_moc_risk_assessments")
        .select("relationship_type,hs_risk_assessments(id,assessment_reference,title,status)")
        .eq("moc_id", id),
    ]);
  const { data: assetOwner } = asset?.asset_owner_person_id
    ? await admin
        .from("organization_people")
        .select("id,first_name,last_name,email")
        .eq("id", asset.asset_owner_person_id)
        .eq("organization_id", organization.id)
        .maybeSingle()
    : { data: null };
  const item = {
    ...controlledItem,
    hs_risk_assessments: assessment,
  };
  const companyPeople = people.map((person) => ({ ...person, name: mocPersonName(person) }));
  const personOptions = (label = "Select active company user") => <><option value="">{companyPeople.length ? label : "No active company users available"}</option>{companyPeople.map((person) => <option value={person.id} key={person.id}>{person.name}{person.position ? ` — ${person.position}` : ""}</option>)}</>;
  const requestor = companyPeople.find((person) => person.id === item.requestor_person_id);
  const changeOwner = companyPeople.find((person) => person.id === item.change_owner_person_id);
  const linkedPermits = permitLinks.map((link) => link.hs_permits).filter(Boolean);
  const linkedAssessments = assessmentLinks.map((link) => link.hs_risk_assessments).filter(Boolean);
  const approvals = item.approvals || {},
    screen = Array.isArray(item.screening_answers)
      ? item.screening_answers
      : [],
    path = Array.isArray(item.path_answers) ? item.path_answers : [],
    impacts = Array.isArray(item.impact_areas) ? item.impact_areas : [],
    required =
      item.pathway === "full"
        ? ["hse", "engineering", "operations", "quality"]
        : ["manager"],
    openActions = (actions || []).filter(
      (x) => x.status !== "verified" && x.status !== "cancelled",
    ).length,
    evidencePaths = (actions || [])
      .filter((x) => x.evidence_storage_path)
      .map((x) => x.evidence_storage_path),
    { data: signed } = evidencePaths.length
      ? await admin.storage
          .from("hs-moc-evidence")
          .createSignedUrls(evidencePaths, 3600)
      : { data: [] },
    evidenceUrls = new Map((signed || []).map((x) => [x.path, x.signedUrl]));
  return (
    <main className="md">
      <style>{`*{box-sizing:border-box}.md{min-height:100vh;padding:30px 22px 90px;background:#edf4f8;color:#071d3a;font-family:Arial,sans-serif}.mocShell{width:100%;max-width:1280px;margin:0 auto}.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.top small{color:#087f6c;font-weight:900;letter-spacing:.09em}.top h1{margin:6px 0;font-size:32px}.top p{margin:0;color:#647b91}.back,.button{padding:11px 15px;border:1px solid #c9d7e2;border-radius:9px;background:#fff;color:#173b59;text-decoration:none;font-weight:850}.stage{margin:21px 0;padding:20px;border-radius:15px;background:linear-gradient(120deg,#082a54,#126c69);color:#fff}.stage strong,.stage span{display:block}.stage strong{font-size:25px}.stage span{margin-top:5px;color:#dce8f1}.flow{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:14px 0}.flow div{padding:11px 6px;border-radius:8px;background:#dfe9f2;color:#60768a;text-align:center;font-size:10px;font-weight:850}.flow .on{background:#087f6c;color:#fff}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.box,.panel{border:1px solid #d4e1e9;border-radius:13px;background:#fff}.box{padding:15px}.box span,.box strong{display:block}.box span{color:#698095;font-size:10px;font-weight:850}.box strong{margin-top:5px}.panel{margin-top:14px;padding:21px}.panel h2{margin:0 0 4px}.panel>p{margin:0 0 15px;color:#667e93}.questions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.question{display:flex;justify-content:space-between;gap:12px;padding:11px;border-radius:9px;background:#f0f5f8;font-size:11px}.question b.no{color:#087f6c}.question b.yes{color:#c34d27}.chips{display:flex;gap:7px;flex-wrap:wrap}.chip{padding:7px 9px;border-radius:999px;background:#e7f2ff;color:#1759ad;font-size:10px;font-weight:850}.approvalGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.approval{padding:14px;border:1px solid #d6e1e9;border-radius:10px}.approval.done{border-color:#8fd3bd;background:#edf9f5}.approval strong,.approval span{display:block}.approval span{margin-top:4px;color:#697f92;font-size:11px}.form{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:10px}.form label{display:grid;gap:5px;flex:1;min-width:170px;color:#294964;font-size:11px;font-weight:850}.form input,.form textarea,.form select{padding:10px;border:1px solid #c9d7e3;border-radius:8px;background:#fff;font:inherit}.button{cursor:pointer}.green{border:0;background:#087f6c;color:#fff}.red{border:0;background:#c34b3f;color:#fff}.amber{border:0;background:#c77a08;color:#fff}.action{display:grid;gap:12px;padding:18px 10px;border-top:1px solid #e2e9ef}.action:first-of-type{border-top:0}.action small{display:block;color:#71869a}.actionHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.actionMeta{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.actionWorkflow{padding:15px;border:1px solid #d8e3eb;border-radius:11px;background:#f6f9fb}.actionWorkflow .form{margin-top:0}.actionWorkflow .form label{min-width:220px}.evidenceLink{display:inline-flex;align-items:center;padding:9px 12px;border:1px solid #bcd0df;border-radius:8px;background:#fff;color:#1762a3;text-decoration:none;font-size:11px;font-weight:900}.status{padding:5px 7px;border-radius:999px;background:#e8f2ff;font-size:10px;font-weight:850}.note{padding:13px;border-left:4px solid #db951a;border-radius:8px;background:#fff5e2}.empty{padding:16px;border-radius:9px;background:#f0f5f8;color:#687f93}@media(max-width:800px){.grid,.questions,.approvalGrid{grid-template-columns:1fr 1fr}.flow{grid-template-columns:1fr 1fr 1fr}.actionHead{display:grid}.actionWorkflow .form{display:grid}.actionWorkflow .form label{min-width:0}}`}</style>
      <div className="mocShell">
        <header className="top">
          <div>
            <small>
              {item.moc_reference} · {item.pathway.toUpperCase()} MOC
            </small>
            <h1>{item.title}</h1>
            <p>
              {item.department} · {item.affected_area} · requested by{" "}
              {requestor?.name || item.requestor_name}
            </p>
          </div>
          <Link className="back" href="/portal/health-safety/moc">
            ← MOC Register
          </Link>
        </header>
        <section className="stage">
          <strong>{title(item.status)}</strong>
          <span>
            {item.status === "hse_gate"
              ? "HSE must verify the change classification before the workflow progresses."
              : item.status === "approval"
                ? "Required functional approvals must be recorded before implementation."
                : item.status === "approved"
                  ? "Approved change awaiting controlled implementation."
                  : item.status === "verification"
                    ? "Implementation complete; effectiveness and closure verification required."
                    : "Controlled change record and current assurance position."}
          </span>
        </section>
        <div className="flow">
          {[
            "Screening",
            "HSE gate",
            "Risk review",
            "Approval",
            "Implementation",
            "Closure",
          ].map((x, i) => (
            <div
              className={
                (["draft", "screening_complete"].includes(item.status)
                  ? 0
                  : item.status === "hse_gate"
                    ? 1
                    : item.status === "risk_review"
                      ? 2
                      : ["approval", "approved"].includes(item.status)
                        ? 3
                        : ["implementation", "verification"].includes(
                              item.status,
                            )
                          ? 4
                          : 5) >= i
                  ? "on"
                  : ""
              }
              key={x}
            >
              {x}
            </div>
          ))}
        </div>
        <section className="grid">
          <div className="box">
            <span>CHANGE TYPE</span>
            <strong>{title(item.change_type)}</strong>
          </div>
          <div className="box">
            <span>PATHWAY</span>
            <strong>{item.pathway.toUpperCase()}</strong>
          </div>
          <div className="box">
            <span>RISK LEVEL</span>
            <strong>{title(item.risk_level)}</strong>
          </div>
          <div className="box">
            <span>TARGET DATE</span>
            <strong>{date(item.target_date)}</strong>
          </div>
        </section>
        <section className="panel">
          <h2>Controlled company connections</h2>
          <p>Live links to Administration, Company Users and Permit to Work records used by this change.</p>
          <div className="grid">
            <div className="box"><span>COMPANY LOCATION</span><strong>{item.administration_location_snapshot || "Not linked"}</strong></div>
            <div className="box"><span>REQUESTOR</span><strong>{requestor?.name || item.requestor_name || "Not linked"}</strong></div>
            <div className="box"><span>ACCOUNTABLE CHANGE OWNER</span><strong>{changeOwner?.name || "Not assigned"}</strong></div>
            <div className="box"><span>LINKED RECORDS</span><strong>{linkedAssessments.length} assessments · {linkedPermits.length} permits</strong></div>
          </div>
          {linkedAssessments.length > 0 && <div className="chips" style={{marginTop:12}}>{linkedAssessments.map((assessment) => <Link className="chip" href={`/portal/health-safety/risk-assessment/${assessment.id}`} key={assessment.id}>{assessment.assessment_reference} · {assessment.title}</Link>)}</div>}
          {linkedPermits.length > 0 && <div className="chips" style={{marginTop:12}}>{linkedPermits.map((permit) => <Link className="chip" href={`/portal/health-safety/permits/${permit.id}`} key={permit.id}>{permit.permit_reference} · {title(permit.status)}</Link>)}</div>}
        </section>
        {asset && (
          <section className="panel">
            <h2>Linked company asset</h2>
            <p>
              Live Asset Register details are shown below. The MOC also retains
              the asset snapshot captured when the change was raised.
            </p>
            <div className="grid">
              <div className="box">
                <span>ASSET</span>
                <strong>
                  {asset.asset_reference} — {asset.asset_name}
                </strong>
              </div>
              <div className="box">
                <span>LOCATION</span>
                <strong>
                  {asset.site_location_label || "No site"}
                  {asset.area_department ? ` · ${asset.area_department}` : ""}
                </strong>
              </div>
              <div className="box">
                <span>ACCOUNTABLE OWNER</span>
                <strong>{assetOwner ? mocPersonName(assetOwner) : "Not assigned"}</strong>
              </div>
              <div className="box">
                <span>CRITICALITY / PPM</span>
                <strong>
                  {title(asset.criticality)} ·{" "}
                  {asset.ppm_required
                    ? `due ${date(asset.next_maintenance_date)}`
                    : "PPM not required"}
                </strong>
              </div>
            </div>
            <div className="form">
              <Link
                className="button"
                href={`/portal/company/assets?edit=${asset.id}`}
              >
                Open controlled asset
              </Link>
            </div>
          </section>
        )}
        <section className="panel">
          <h2>Change definition</h2>
          <p>Controlled scope and justification used by all reviewers.</p>
          <div className="grid">
            <div className="box">
              <span>DURATION</span>
              <strong>
                {title(item.duration_type)}
                {item.temporary_end_date
                  ? ` to ${date(item.temporary_end_date)}`
                  : ""}
              </strong>
            </div>
            <div className="box">
              <span>EQUIPMENT</span>
              <strong>{item.equipment_id || "Not specified"}</strong>
            </div>
            <div className="box">
              <span>NEW CHEMICAL</span>
              <strong>{item.new_chemical ? "Yes" : "No"}</strong>
            </div>
            <div className="box">
              <span>RISK ASSESSMENT</span>
              <strong>
                {linkedAssessments.length ? `${linkedAssessments.length} controlled assessment${linkedAssessments.length === 1 ? "" : "s"}` : item.hs_risk_assessments?.assessment_reference || "Not linked"}
              </strong>
            </div>
          </div>
          <p style={{ marginTop: 15, color: "#173957" }}>
            {item.change_description}
          </p>
          <div className="chips">
            {impacts.map((x) => (
              <span className="chip" key={x}>
                {x}
              </span>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Screening and dynamic pathway</h2>
          <p>
            Yes answers determine the Full pathway and specialist review
            requirements.
          </p>
          <div className="questions">
            {[...screen, ...path].map((x, i) => (
              <div className="question" key={i}>
                <span>{x.question}</span>
                <b className={x.answer}>{String(x.answer).toUpperCase()}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>HSE gate verification</h2>
          <p>
            Confirm the change type and pathway before releasing risk and
            approval controls.
          </p>
          {item.hse_gate_status !== "pending" && (
            <div className="note">
              <strong>
                {title(item.hse_gate_status)} by {item.hse_gate_reviewer}
              </strong>
              <div>{item.hse_gate_comments || "No additional comments."}</div>
            </div>
          )}
          {item.status === "hse_gate" && (
            <div className="approvalGrid">
              <form className="form" action={progress}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="intent" value="verify_gate" />
                <label>
                  HSE reviewer
                  <select name="person_id" required defaultValue="">{personOptions()}</select>
                </label>
                <label>
                  Comments
                  <input name="comments" />
                </label>
                <button className="button green">Verify gate</button>
              </form>
              <form className="form" action={progress}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="intent" value="return_gate" />
                <label>
                  HSE reviewer
                  <select name="person_id" required defaultValue="">{personOptions()}</select>
                </label>
                <label>
                  Correction required
                  <input name="comments" required />
                </label>
                <button className="button red">Return</button>
              </form>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Risk and readiness</h2>
          <p>Hazard analysis and pre-start safety review requirements.</p>
          <div className="grid">
            <div className="box">
              <span>HAZARD ANALYSIS</span>
              <strong>
                {item.hazard_analysis_required
                  ? item.hazard_analysis_type || "Required"
                  : "Not required"}
              </strong>
            </div>
            <div className="box">
              <span>PSSR REQUIRED</span>
              <strong>{item.pssr_required ? "Yes" : "No"}</strong>
            </div>
            <div className="box">
              <span>PSSR COMPLETE</span>
              <strong>{item.pssr_complete ? "Yes" : "No"}</strong>
            </div>
            <div className="box">
              <span>OPEN ACTIONS</span>
              <strong>{openActions}</strong>
            </div>
          </div>
          {item.pssr_required && !item.pssr_complete && (
            <form className="form" action={progress}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="intent" value="complete_pssr" />
              <button className="button green">Confirm PSSR complete</button>
            </form>
          )}
          <p style={{ marginTop: 15, color: "#173957" }}>
            <strong>Implementation plan:</strong> {item.implementation_plan}
          </p>
        </section>
        <section className="panel">
          <h2>Change actions and verification</h2>
          <p>
            Action completion is not closure. Upload objective evidence, then
            record an independent Successful or Rejected verification decision.
          </p>
          {(actions || []).length ? (
            (actions || []).map((x) => (
              <article className="action" key={x.id}>
                <header className="actionHead">
                  <div>
                    <strong>{x.action_required}</strong>
                    <small>
                      Owner: {x.responsible_name}
                      {x.responsible_email && <> · {x.responsible_email}</>} ·
                      target {date(x.target_date)}
                    </small>
                    {x.evidence && (
                      <small>Evidence reference: {x.evidence}</small>
                    )}
                    {x.verification_comments && (
                      <small>
                        Verification conclusion: {x.verification_comments}
                      </small>
                    )}
                  </div>
                  <div className="actionMeta">
                    <span className="status">{title(x.status)}</span>
                    {evidenceUrls.get(x.evidence_storage_path) && (
                      <a
                        className="evidenceLink"
                        href={evidenceUrls.get(x.evidence_storage_path)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open objective evidence ↗
                      </a>
                    )}
                  </div>
                </header>
                <div className="actionWorkflow">
                  {["open", "rejected"].includes(x.status) ? (
                    <form className="form" action={completeAction}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="moc" value={id} />
                      <label>
                        Objective-evidence description / reference
                        <input
                          name="evidence"
                          required
                          defaultValue={
                            x.status === "rejected" ? x.evidence || "" : ""
                          }
                        />
                      </label>
                      <label>
                        Objective-evidence file *
                        <input
                          type="file"
                          name="evidence_file"
                          accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
                          required
                        />
                      </label>
                      <button className="button green">
                        Submit for verification
                      </button>
                    </form>
                  ) : x.status === "awaiting_verification" ? (
                    <form className="form" action={verifyAction}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="moc" value={id} />
                      <label>
                        Verification decision
                        <select name="result" defaultValue="successful">
                          <option value="successful">
                            Successful — verified effective
                          </option>
                          <option value="rejected">
                            Rejected — return for action
                          </option>
                        </select>
                      </label>
                      <label>
                        Independent verifier
                        <select name="verifier_person_id" required defaultValue="">{personOptions()}</select>
                      </label>
                      <label>
                        Evidence reviewed and conclusion
                        <textarea name="comments" required rows={2} />
                      </label>
                      <button className="button green">
                        Record verification
                      </button>
                    </form>
                  ) : (
                    <div
                      className={
                        x.verification_result === "successful"
                          ? "note"
                          : "note red"
                      }
                    >
                      <strong>
                        {x.verification_result === "successful"
                          ? "Successful — verified effective"
                          : "Rejected — further action required"}
                      </strong>
                      <div>
                        {x.verifier_name
                          ? `Decision by `
                          : "Verification decision recorded"}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty">No actions recorded.</div>
          )}
          {!["closed", "rejected", "cancelled"].includes(item.status) && (
            <form className="form" action={addAction}>
              <input type="hidden" name="id" value={id} />
              <label>
                Action required
                <input name="action" required />
              </label>
              <label>
                Action owner — Company User
                <select name="responsible_person_id" required defaultValue="">{personOptions()}</select>
              </label>
              <label>
                Target date
                <input type="date" name="target" required />
              </label>
              <button className="button green">Add action</button>
            </form>
          )}
        </section>
        <section className="panel">
          <h2>Approvals</h2>
          <p>
            {item.pathway === "full"
              ? "Full MOC requires HSE, Engineering, Operations and Quality approval."
              : "MOC Lite requires accountable manager approval."}
          </p>
          <div className="approvalGrid">
            {required.map((role) => (
              <div
                className={`approval ${approvals[role]?.status === "approved" ? "done" : ""}`}
                key={role}
              >
                <strong>{title(role)} approval</strong>
                <span>
                  {approvals[role]?.status === "approved"
                    ? `Approved by ${approvals[role].name}`
                    : "Awaiting approval"}
                </span>
                {["approval", "risk_review"].includes(item.status) &&
                  approvals[role]?.status !== "approved" && (
                    <form className="form" action={progress}>
                      <input type="hidden" name="id" value={id} />
                      <input
                        type="hidden"
                        name="intent"
                        value={`approve_${role}`}
                      />
                      <label>
                        Approver
                        <select name="person_id" required defaultValue="">{personOptions()}</select>
                      </label>
                      <label>
                        Conditions
                        <input name="comments" />
                      </label>
                      <button className="button green">Approve</button>
                    </form>
                  )}
              </div>
            ))}
          </div>
        </section>
        {item.status === "approved" && (
          <section className="panel">
            <h2>Authorise implementation</h2>
            {item.pssr_required && !item.pssr_complete ? (
              <>
                <p>
                  Implementation is locked until the Pre-Startup Safety Review
                  is complete.
                </p>
                <div className="note">
                  <strong>PSSR required</strong>
                  <div>
                    Confirm equipment, safeguards, procedures, training,
                    emergency arrangements and outstanding actions before
                    authorising start-up.
                  </div>
                </div>
                <form className="form" action={progress}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="intent" value="complete_pssr" />
                  <button className="button green">
                    Confirm PSSR complete
                  </button>
                </form>
              </>
            ) : (
              <>
                <p>
                  All required approvals and readiness checks are complete.
                  Confirm before work begins.
                </p>
                <form className="form" action={progress}>
                  <input type="hidden" name="id" value={id} />
                  <input
                    type="hidden"
                    name="intent"
                    value="begin_implementation"
                  />
                  <button className="button green">Begin implementation</button>
                </form>
              </>
            )}
          </section>
        )}
        {item.status === "implementation" && (
          <section className="panel">
            <h2>Complete implementation</h2>
            <p>
              Record what was implemented, deviations, evidence and immediate
              checks.
            </p>
            <form className="form" action={progress}>
              <input type="hidden" name="id" value={id} />
              <input
                type="hidden"
                name="intent"
                value="complete_implementation"
              />
              <label>
                Implementation evidence
                <textarea name="comments" required />
              </label>
              <button className="button green">Move to verification</button>
            </form>
          </section>
        )}
        {item.status === "verification" && (
          <section className="panel">
            <h2>Post-implementation verification and closure</h2>
            <p>
              Confirm the change is effective, documentation and training are
              complete, and no uncontrolled hazards were introduced.
            </p>
            <form className="form" action={progress}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="intent" value="close" />
              <label>
                Closure approver
                <select name="person_id" required defaultValue="">{personOptions()}</select>
              </label>
              <label>
                Verification and lessons learned
                <textarea name="comments" required />
              </label>
              <button className="button green" disabled={openActions > 0}>
                Close MOC
              </button>
            </form>
            {openActions > 0 && (
              <div className="note" style={{ marginTop: 10 }}>
                Complete all open actions before closure.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
