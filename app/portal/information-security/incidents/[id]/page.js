import Link from "next/link";
import { notFound } from "next/navigation";
import SecurityIncidentForm from "../../../../../components/SecurityIncidentForm";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { loadSecurityIncidentOptions } from "../../../../../lib/ismsSecurityIncidents";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { saveSecurityIncident } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security Incident | RPG Excellence" };

const displayDateTime = (value) => value
  ? new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(value))
  : "Not recorded";

export default async function SecurityIncidentPage({params,searchParams}) {
  const { id } = await params;
  const query = await searchParams;
  const { organization, level } = await requireOrganizationAccess(
    "information_security",
    "view",
    `/portal/information-security/incidents/${id}`,
  );
  const admin=createAdminClient();
  const [{data:incident,error},options,{data:documentLinks=[]},{data:evidence=[]}]=await Promise.all([
    admin.from("isms_security_incidents").select("*").eq("id",id).eq("organization_id",organization.id).maybeSingle(),
    loadSecurityIncidentOptions(organization),
    admin.from("isms_security_incident_documents").select("controlled_document_id").eq("incident_id",id).eq("organization_id",organization.id),
    admin.from("isms_security_incident_evidence").select("id,evidence_type,description,original_file_name,file_size_bytes,created_at").eq("incident_id",id).eq("organization_id",organization.id).order("created_at",{ascending:false}),
  ]);

  if(error)throw new Error(error.message);
  if(!incident)notFound();
  const canEdit=["contribute","review","approve","admin","owner"].includes(level);

  return <main className="sifPage"><style>{pageStyles}</style><div className="sifShell">
    <header><div><small>{incident.incident_reference} · CONTROLLED INCIDENT</small><h1>{incident.title}</h1><p>{organization.name} · {incident.status.replaceAll("_"," ")}</p></div><div className="sifHeaderActions"><Link href={`/portal/information-security/incidents/${id}/report`}>View controlled report</Link><Link href="/portal/information-security/incidents">← Incident Register</Link></div></header>

    {query?.saved&&<div className="sifSaved">Incident record saved successfully.</div>}

    {(incident.verified_at||incident.closure_approved_at)&&<section className="sifDecisions"><h2>Controlled decisions</h2><div>
      <article><small>INDEPENDENT VERIFICATION</small><strong>{incident.verification_result?.replaceAll("_"," ")||"Pending"}</strong><span>{incident.verification_summary||"No conclusion recorded"}</span><b>{displayDateTime(incident.verified_at)}</b></article>
      <article><small>CLOSURE APPROVAL</small><strong>{incident.closure_approved_at?"Approved":"Pending"}</strong><span>{incident.closure_approval_comment||"No approval rationale recorded"}</span><b>{displayDateTime(incident.closure_approved_at)}</b></article>
    </div></section>}

    {evidence.length>0&&<section className="sifEvidence"><div className="sifEvidenceHead"><div><small>CONTROLLED OBJECTIVE EVIDENCE</small><h2>Recorded evidence</h2></div><span>{evidence.length} file{evidence.length===1?"":"s"}</span></div><div>{evidence.map((item)=><article key={item.id}><strong>{item.original_file_name}</strong><span>{item.evidence_type.replaceAll("_"," ")} · {Math.ceil(item.file_size_bytes/1024)} KB</span><small>{item.description||"No description"}</small><small>Uploaded {displayDateTime(item.created_at)}</small><a href={`/portal/information-security/incidents/${id}/evidence/${item.id}`}>Download evidence ↓</a></article>)}</div></section>}

    {canEdit
      ? <SecurityIncidentForm action={saveSecurityIncident} incident={incident} options={options} linkedDocumentIds={documentLinks.map((row)=>row.controlled_document_id)}/>
      : <div className="sifSaved">You have view access. Ask an Information Security contributor or administrator to update this incident.</div>}
  </div></main>;
}

const pageStyles=`*{box-sizing:border-box}.sifPage{min-height:100vh;padding:30px 20px 90px;background:#edf3f8;color:#071d3a;font-family:Arial,sans-serif}.sifShell{max-width:1250px;margin:auto}.sifShell>header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.sifShell>header small,.sifEvidenceHead small{color:#087f91;font-weight:950;letter-spacing:.11em}.sifShell>header h1{margin:6px 0;font-size:36px}.sifShell>header p{margin:0;color:#667e92;text-transform:capitalize}.sifHeaderActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.sifHeaderActions>a{padding:11px 14px;border:1px solid #cbd9e3;border-radius:9px;background:#fff;color:#163b5b;text-decoration:none;font-weight:900}.sifHeaderActions>a:first-child{border-color:#1762ef;background:#1762ef;color:#fff}.sifSaved{margin:0 0 15px;padding:13px 15px;border:1px solid #8fd5b6;border-radius:9px;background:#e7f6ef;color:#096044;font-weight:850}.sifDecisions,.sifEvidence{margin-bottom:16px;padding:18px;border:1px solid #d0dee8;border-radius:13px;background:#fff}.sifDecisions h2,.sifEvidence h2{margin:0 0 11px}.sifDecisions>div{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sifDecisions article{display:grid;gap:6px;padding:14px;border:1px solid #d8e3ea;border-radius:9px;background:#f7fafc}.sifDecisions article small{color:#087f91;font-weight:900;letter-spacing:.08em}.sifDecisions article strong{text-transform:capitalize}.sifDecisions article span{color:#506b80;line-height:1.4}.sifDecisions article b{font-size:12px;color:#096044}.sifEvidenceHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}.sifEvidenceHead h2{margin:4px 0 0}.sifEvidenceHead>span{padding:6px 9px;border-radius:999px;background:#e8f0ff;color:#164fc6;font-size:12px;font-weight:900}.sifEvidence>div:last-child{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.sifEvidence article{display:grid;align-content:start;gap:4px;padding:12px;border:1px solid #d8e3ea;border-radius:8px;background:#f7fafc}.sifEvidence article>span{color:#087f91;font-size:11px;font-weight:850;text-transform:capitalize}.sifEvidence article>small{color:#6d8295;line-height:1.35}.sifEvidence article>a{display:inline-block;margin-top:8px;padding:8px 10px;border:1px solid #bdd0df;border-radius:7px;background:#fff;color:#124f8c;text-align:center;text-decoration:none;font-size:12px;font-weight:900}.sifEvidence article>a:hover{border-color:#1762ef;color:#1762ef}@media(max-width:720px){.sifPage{padding:18px 11px 60px}.sifShell>header{display:block}.sifShell>header h1{font-size:29px}.sifHeaderActions{margin-top:14px;justify-content:flex-start}.sifHeaderActions>a{width:100%;text-align:center}.sifDecisions>div,.sifEvidence>div:last-child{grid-template-columns:1fr}}`;
