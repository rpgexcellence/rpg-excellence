import Link from "next/link";
import { notFound } from "next/navigation";
import SecurityIncidentForm from "../../../../../components/SecurityIncidentForm";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { loadSecurityIncidentOptions } from "../../../../../lib/ismsSecurityIncidents";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { saveSecurityIncident } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security Incident | RPG Excellence" };

export default async function SecurityIncidentPage({params,searchParams}) {
  const { id } = await params;
  const query = await searchParams;
  const { organization, level } = await requireOrganizationAccess("information_security","view",`/portal/information-security/incidents/${id}`);
  const admin=createAdminClient();
  const [{data:incident,error},options,{data:documentLinks=[]},{data:evidence=[]}]=await Promise.all([
    admin.from("isms_security_incidents").select("*").eq("id",id).eq("organization_id",organization.id).maybeSingle(),
    loadSecurityIncidentOptions(organization),
    admin.from("isms_security_incident_documents").select("controlled_document_id").eq("incident_id",id).eq("organization_id",organization.id),
    admin.from("isms_security_incident_evidence").select("id,evidence_type,description,original_file_name,file_size_bytes,created_at").eq("incident_id",id).eq("organization_id",organization.id).order("created_at",{ascending:false}),
  ]);
  if(error)throw new Error(error.message); if(!incident)notFound();
  const canEdit=["contribute","review","approve","admin","owner"].includes(level);
  return <main className="sifPage"><style>{pageStyles}</style><div className="sifShell"><header><div><small>{incident.incident_reference} · CONTROLLED INCIDENT</small><h1>{incident.title}</h1><p>{organization.name} · {incident.status.replaceAll("_"," ")}</p></div><Link href="/portal/information-security/incidents">← Incident Register</Link></header>{query?.saved&&<div className="sifSaved">Incident record saved successfully.</div>}{evidence.length>0&&<section className="sifEvidence"><h2>Recorded evidence</h2><div>{evidence.map((item)=><article key={item.id}><strong>{item.original_file_name}</strong><span>{item.evidence_type.replaceAll("_"," ")} · {Math.ceil(item.file_size_bytes/1024)} KB</span><small>{item.description||"No description"}</small></article>)}</div></section>}{canEdit?<SecurityIncidentForm action={saveSecurityIncident} incident={incident} options={options} linkedDocumentIds={documentLinks.map((row)=>row.controlled_document_id)}/>:<div className="sifSaved">You have view access. Ask an Information Security contributor or administrator to update this incident.</div>}</div></main>;
}
const pageStyles=`*{box-sizing:border-box}.sifPage{min-height:100vh;padding:30px 20px 90px;background:#edf3f8;color:#071d3a;font-family:Arial,sans-serif}.sifShell{max-width:1250px;margin:auto}.sifShell>header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.sifShell>header small{color:#087f91;font-weight:950;letter-spacing:.11em}.sifShell>header h1{margin:6px 0;font-size:36px}.sifShell>header p{margin:0;color:#667e92;text-transform:capitalize}.sifShell>header>a{padding:11px 14px;border:1px solid #cbd9e3;border-radius:9px;background:#fff;color:#163b5b;text-decoration:none;font-weight:900}.sifSaved{margin:0 0 15px;padding:13px 15px;border:1px solid #8fd5b6;border-radius:9px;background:#e7f6ef;color:#096044;font-weight:850}.sifEvidence{margin-bottom:16px;padding:18px;border:1px solid #d0dee8;border-radius:13px;background:#fff}.sifEvidence h2{margin:0 0 11px}.sifEvidence>div{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.sifEvidence article{padding:11px;border:1px solid #d8e3ea;border-radius:8px;background:#f7fafc}.sifEvidence strong,.sifEvidence span,.sifEvidence small{display:block}.sifEvidence span{margin:4px 0;color:#087f91;font-size:11px;font-weight:850}.sifEvidence small{color:#6d8295}@media(max-width:720px){.sifPage{padding:18px 11px 60px}.sifShell>header{display:block}.sifShell>header h1{font-size:29px}.sifShell>header>a{display:inline-block;margin-top:14px}.sifEvidence>div{grid-template-columns:1fr}}`;
