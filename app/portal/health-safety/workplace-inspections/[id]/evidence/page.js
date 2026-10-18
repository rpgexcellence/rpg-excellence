import Link from "next/link";
import { notFound } from "next/navigation";

import WorkplaceInspectionEvidenceManager from "../../../../../../components/WorkplaceInspectionEvidenceManager";
import { requireOrganizationAccess } from "../../../../../../lib/organization-access";
import { requirePlanAccess } from "../../../../../../lib/plan-access";
import { createAdminClient } from "../../../../../../lib/supabase/admin";
import { addInspectionEvidence, createInspectionEvidenceDownload } from "./actions";
import "../../workplace-inspections.css";

export const metadata = { title: "Workplace Inspection Evidence | RPG Excellence" };
export const dynamic = "force-dynamic";

const ROOT = "/portal/health-safety/workplace-inspections";

export default async function WorkplaceInspectionEvidencePage({ params }) {
  const route = await params;
  const inspectionId = route.id;
  const access = await requireOrganizationAccess("risk_management", "view", ROOT + "/" + inspectionId + "/evidence");
  await requirePlanAccess(access.user, "professional", "Health and Safety");
  const admin = createAdminClient();
  const organizationId = access.organization.id;

  const [inspectionResult, responsesResult, findingsResult, actionsResult, evidenceResult] = await Promise.all([
    admin.from("hs_workplace_inspections")
      .select("id,inspection_reference,title,status,administration_location_label,area_department,lead_inspector_person_id")
      .eq("id", inspectionId).eq("organization_id", organizationId).maybeSingle(),
    admin.from("hs_workplace_inspection_responses")
      .select("id,question_code,question_text,section_code,section_title")
      .eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("display_order"),
    admin.from("hs_workplace_inspection_findings")
      .select("id,finding_reference,title,status")
      .eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at"),
    admin.from("hs_workplace_inspection_actions")
      .select("id,finding_id,action_reference,action_text,status")
      .eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at"),
    admin.from("hs_workplace_inspection_evidence")
      .select("id,response_id,finding_id,action_id,evidence_type,title,description,storage_path,original_file_name,mime_type,file_size_bytes,external_url,captured_offline,created_at")
      .eq("inspection_id", inspectionId).eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);

  if (inspectionResult.error) throw new Error(inspectionResult.error.message);
  if (!inspectionResult.data) notFound();
  for (const result of [responsesResult, findingsResult, actionsResult, evidenceResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const inspection = inspectionResult.data;
  const management = access.isOwner || access.isCompanyAdministrator || ["review", "approve", "admin", "owner"].includes(access.level);
  const assignedInspector = access.person?.id === inspection.lead_inspector_person_id;
  const readOnly = ["completed", "cancelled"].includes(inspection.status) || !(management || assignedInspector);

  return <main className="wpiPage"><div className="wpiShell">
    <header className="wpiTop">
      <div><small>{inspection.inspection_reference} · CONTROLLED EVIDENCE</small><h1>Inspection evidence</h1><p>{inspection.title} · {inspection.administration_location_label}{inspection.area_department ? " · " + inspection.area_department : ""}</p></div>
      <div className="wpiButtons"><Link className="wpiButton" href={ROOT + "/" + inspection.id}>← Inspection</Link><Link className="wpiButton" href={ROOT}>Register</Link></div>
    </header>

    <section className="wpiHero compact"><div><h2>Objective evidence at the point of inspection</h2><p>Capture only relevant evidence. Avoid passwords, recovery codes, unnecessary personal data and unrelated confidential information.</p></div><strong>{(evidenceResult.data || []).length}</strong></section>

    {readOnly && !["completed", "cancelled"].includes(inspection.status) ? <div className="wpiMessage error"><strong>View-only evidence record</strong><span>Only the assigned inspector or authorised management can add evidence.</span></div> : null}

    <WorkplaceInspectionEvidenceManager
      inspection={inspection}
      responses={responsesResult.data || []}
      findings={findingsResult.data || []}
      actions={actionsResult.data || []}
      evidence={evidenceResult.data || []}
      addAction={addInspectionEvidence}
      downloadAction={createInspectionEvidenceDownload}
      readOnly={readOnly}
    />
  </div></main>;
}
