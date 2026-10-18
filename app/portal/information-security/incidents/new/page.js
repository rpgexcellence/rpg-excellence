import Link from "next/link";
import SecurityIncidentForm from "../../../../../components/SecurityIncidentForm";
import { requireOrganizationAccess } from "../../../../../lib/organization-access";
import { loadSecurityIncidentOptions } from "../../../../../lib/ismsSecurityIncidents";
import { saveSecurityIncident } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report Security Incident | RPG Excellence" };

export default async function NewSecurityIncidentPage() {
  const { organization } = await requireOrganizationAccess("information_security","contribute","/portal/information-security/incidents/new");
  const options = await loadSecurityIncidentOptions(organization);
  const procedure = options.documents.find((document)=>document.document_number==="RPG-SEC-PRO-003");
  return <main className="sifPage"><style>{pageStyles}</style><div className="sifShell"><header><div><small>INFORMATION SECURITY · NEW CONTROLLED RECORD</small><h1>Report a security incident</h1><p>{organization.name} · follow RPG-SEC-PRO-003 from report to verified closure.</p></div><Link href="/portal/information-security/incidents">← Incident Register</Link></header><SecurityIncidentForm action={saveSecurityIncident} options={options} linkedDocumentIds={procedure?[procedure.id]:[]}/></div></main>;
}
const pageStyles=`*{box-sizing:border-box}.sifPage{min-height:100vh;padding:30px 20px 90px;background:#edf3f8;color:#071d3a;font-family:Arial,sans-serif}.sifShell{max-width:1250px;margin:auto}.sifShell>header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}.sifShell>header small{color:#087f91;font-weight:950;letter-spacing:.11em}.sifShell>header h1{margin:6px 0;font-size:36px}.sifShell>header p{margin:0;color:#667e92}.sifShell>header>a{padding:11px 14px;border:1px solid #cbd9e3;border-radius:9px;background:#fff;color:#163b5b;text-decoration:none;font-weight:900}@media(max-width:650px){.sifPage{padding:18px 11px 60px}.sifShell>header{display:block}.sifShell>header h1{font-size:29px}.sifShell>header>a{display:inline-block;margin-top:14px}}`;
