import Link from "next/link";
import { redirect } from "next/navigation";
import ProfessionalFunctionIcon from "../../../components/ProfessionalFunctionIcon";
import { accessLabel, functionLabel, moduleLabel } from "../../../lib/people-access";
import { getOrganizationAccess } from "../../../lib/organization-access";

export const metadata = { title: "My RPG Access | RPG Excellence" };
export const dynamic = "force-dynamic";

const routes = {
  dashboard: "/portal/my-access",
  internal_audit: "/portal/internal-audits",
  capa_8d: "/portal/rca",
  supplier_assurance: "/portal/suppliers",
  risk_management: "/portal/health-safety/risk-assessment",
  business_continuity: "/portal/business-continuity",
  information_security: "/portal/information-security",
  documents: "/portal/documents",
  training: "/portal/health-safety/training",
  assessments: "/portal/history",
  reports: "/portal/reports",
  people_access: "/portal/company/people",
};

export default async function MyAccessPage({ searchParams }) {
  const query = await searchParams;
  const context = await getOrganizationAccess();
  if (!context.user) redirect("/portal/login?next=/portal/my-access");
  if (context.isOwner) redirect("/portal");
  if (!context.organization || !context.person) return <main className="maPage"><style>{styles}</style><section className="maEmpty"><h1>No active company access</h1><p>Your RPG login is valid, but it is not connected to an active company profile. Ask your company administrator to issue a personal QR invitation.</p><Link href="/portal">Return to customer portal</Link></section></main>;
  const activeFunctions = context.functions.filter((item) => item.status === "authorised" && (!item.expires_at || item.expires_at >= new Date().toISOString().slice(0, 10)));
  const accessible = context.permissions.filter((item) => item.access_level !== "none");
  return <main className="maPage"><style>{styles}</style><div className="maShell">
    <header className="maTop"><div><span>RPG EXCELLENCE · AUTHORISED USER</span><h1>Welcome, {context.person.first_name}</h1><p>{context.organization.name} · {context.person.position || "Company user"}</p></div><form action="/auth/signout" method="post"><button>Sign out</button></form></header>
    {query?.welcome && <div className="maWelcome"><b>Your company access is active.</b><span>A personalised welcome email has been sent and the activation is recorded in the access audit trail.</span></div>}
    {query?.error === "access" && <div className="maError"><b>Access not authorised.</b><span>Your profile does not provide the permission required for that area.</span></div>}
    <section className="maProfile"><div><small>COMPANY PROFILE</small><h2>{context.person.first_name} {context.person.last_name}</h2><p>{context.person.email}</p></div><dl><div><dt>Position</dt><dd>{context.person.position || "Not assigned"}</dd></div><div><dt>Department</dt><dd>{context.person.department || "Not assigned"}</dd></div><div><dt>Site</dt><dd>{context.person.site || "Organisation-wide"}</dd></div><div><dt>Status</dt><dd>Active system user</dd></div></dl></section>
    <section className="maPanel"><header><div><small>AUTHORISED FUNCTIONS</small><h2>Your professional functions</h2></div><span>{activeFunctions.length} active</span></header><div className="maFunctions">{activeFunctions.length ? activeFunctions.map((item) => <article key={item.id}><ProfessionalFunctionIcon type={item.function_key} label={functionLabel(item.function_key)} size={70}/><b>{functionLabel(item.function_key)}</b><small>{item.expires_at ? `Authorised to ${item.expires_at}` : "Authorised"}</small></article>) : <p>No professional function is currently authorised.</p>}</div></section>
    <section className="maPanel"><header><div><small>CONTROLLED PLATFORM ACCESS</small><h2>Your RPG workspaces</h2></div><span>{accessible.length} available</span></header><div className="maModules">{accessible.map((item) => <Link href={routes[item.module_key] || "/portal/my-access"} key={item.id}><div><b>{moduleLabel(item.module_key)}</b><p>{accessLabel(item.access_level)}</p></div><span>Open →</span></Link>)}</div></section>
    <p className="maFoot">Access and professional authorisation are controlled independently by your company administrator. Contact them if your responsibilities change.</p>
  </div></main>;
}

const styles = `*{box-sizing:border-box}.maPage{min-height:100vh;padding:34px 20px 80px;background:linear-gradient(145deg,#eaf3fb,#f7fafc 50%,#edf8f5);color:#08294f;font-family:Arial,sans-serif}.maShell{max-width:1250px;margin:auto}.maTop{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.maTop span,.maPanel header small,.maProfile small{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.14em}.maTop h1{margin:8px 0 5px;font-size:40px}.maTop p{margin:0;color:#657a90}.maTop button{padding:10px 14px;border:1px solid #c8d6e4;border-radius:8px;background:#fff;color:#173b60;font-weight:850;cursor:pointer}.maWelcome,.maError{display:grid;gap:4px;margin-top:21px;padding:15px 17px;border:1px solid #9ad8bd;border-radius:11px;background:#eaf9f2;color:#087153}.maError{border-color:#e8b0aa;background:#fff0ee;color:#922f26}.maWelcome span,.maError span{font-size:11px}.maProfile,.maPanel{margin-top:18px;padding:22px;border:1px solid #d5e1ec;border-radius:16px;background:#fff;box-shadow:0 12px 30px #173f6910}.maProfile{display:grid;grid-template-columns:.75fr 1.25fr;gap:20px;align-items:center;background:linear-gradient(135deg,#082a54,#0c3d73);color:#fff}.maProfile h2{margin:7px 0 4px;font-size:25px}.maProfile p{margin:0;color:#b9cce0}.maProfile dl{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0}.maProfile dl div{padding:11px;border-radius:9px;background:#ffffff0e}.maProfile dt{color:#aac0d5;font-size:8px;text-transform:uppercase}.maProfile dd{margin:4px 0 0;font-size:11px;font-weight:850}.maPanel>header{display:flex;justify-content:space-between;align-items:end;margin-bottom:16px}.maPanel h2{margin:5px 0 0;font-size:20px}.maPanel>header>span{padding:6px 9px;border-radius:999px;background:#edf3ff;color:#315fe6;font-size:10px;font-weight:900}.maFunctions{display:flex;gap:11px;overflow-x:auto}.maFunctions article{min-width:145px;padding:14px;border:1px solid #d8e3ec;border-radius:11px;text-align:center}.maFunctions svg{display:block;margin:auto;color:#1762cf}.maFunctions b,.maFunctions small{display:block}.maFunctions b{font-size:11px}.maFunctions small{margin-top:5px;color:#74879a;font-size:9px}.maFunctions p{color:#718499}.maModules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.maModules a{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px;border:1px solid #d9e3ec;border-radius:10px;background:#f8fbfd;color:#173b60;text-decoration:none}.maModules a:hover{border-color:#315fe6}.maModules b,.maModules p{display:block;margin:0}.maModules b{font-size:12px}.maModules p{margin-top:4px;color:#708499;font-size:9px}.maModules a>span{color:#315fe6;font-size:10px;font-weight:900}.maFoot{color:#75889b;font-size:10px;text-align:center}.maEmpty{width:min(600px,100%);margin:15vh auto;padding:30px;border:1px solid #d5e1ec;border-radius:16px;background:#fff}.maEmpty p{color:#657a90;line-height:1.55}.maEmpty a{color:#315fe6;font-weight:850}@media(max-width:800px){.maProfile{grid-template-columns:1fr}.maProfile dl{grid-template-columns:1fr 1fr}.maModules{grid-template-columns:1fr 1fr}}@media(max-width:550px){.maPage{padding:24px 13px 60px}.maTop h1{font-size:33px}.maProfile dl,.maModules{grid-template-columns:1fr}.maPanel{padding:17px}}`;
