import crypto from "node:crypto";
// RPG PEOPLE PAGE FIX V3 — NULL-SAFE DATA HANDLING — 2026-09-23
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import ProfessionalFunctionIcon from "../../../../components/ProfessionalFunctionIcon";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";
import { functionLabel } from "../../../../lib/people-access";
import PeopleAccessForm from "./PeopleAccessForm";
import { suspendPerson } from "./actions";
import "./people-access-readable.css";

export const metadata = { title: "People, Roles & Access | RPG Excellence" };
export const dynamic = "force-dynamic";
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/company/people");
  const admin = createAdminClient();
  const { data: owned } = await admin.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (owned) return { user, admin, organization: owned };
  const { data: person } = await admin.from("organization_people").select("id,organization_id").eq("user_id", user.id).eq("account_status", "active").limit(1).maybeSingle();
  if (!person) redirect("/portal");
  const { data: authorization } = await admin.from("organization_person_authorizations").select("id,expires_at").eq("person_id", person.id).eq("function_key", "company_administrator").eq("status", "authorised").maybeSingle();
  const { data: access } = await admin.from("organization_person_permissions").select("id").eq("person_id", person.id).eq("module_key", "people_access").eq("access_level", "admin").maybeSingle();
  if (!authorization || !access || (authorization.expires_at && authorization.expires_at < new Date().toISOString().slice(0, 10))) redirect("/portal");
  const { data: organization } = await admin.from("organizations").select("id,name").eq("id", person.organization_id).single();
  return { user, admin, organization };
}

export default async function PeopleAccessPage({ searchParams }) {
  const params = await searchParams;
  const { admin, organization } = await getAdminContext();
  const [peopleResult, authorizationsResult, permissionsResult, invitationsResult] = await Promise.all([
    admin.from("organization_people").select("*").eq("organization_id", organization.id).order("last_name"),
    admin.from("organization_person_authorizations").select("*").eq("organization_id", organization.id),
    admin.from("organization_person_permissions").select("*").eq("organization_id", organization.id),
    admin.from("organization_invitations").select("id,person_id,status,expires_at,invitation_reference").eq("organization_id", organization.id).order("created_at", { ascending: false }),
  ]);
  const people = peopleResult.data || [];
  const authorizations = authorizationsResult.data || [];
  const permissions = permissionsResult.data || [];
  const invitations = invitationsResult.data || [];
  const setupError = [peopleResult, authorizationsResult, permissionsResult, invitationsResult].find((result) => result.error)?.error || null;
  const byPerson = (rows, personId) => {
    const matches = [];
    for (const item of Array.isArray(rows) ? rows : []) {
      if (item?.person_id === personId) matches.push(item);
    }
    return matches;
  };
  const accessByPerson = (rows, personId) => {
    const matches = [];
    for (const item of Array.isArray(rows) ? rows : []) {
      if (item?.person_id === personId && item?.access_level !== "none") matches.push(item);
    }
    return matches;
  };
  let active = 0;
  let invited = 0;
  let directory = 0;
  for (const person of people) {
    if (person?.account_status === "active") active += 1;
    if (person?.account_status === "invited") invited += 1;
    if (person?.account_type === "directory") directory += 1;
  }
  let invitePreview = null;
  if (params?.invite) {
    const { data: invitation } = await admin.from("organization_invitations").select("*,organization_people(first_name,last_name,email,position)").eq("organization_id", organization.id).eq("token_hash", hash(params.invite)).eq("status", "active").maybeSingle();
    if (invitation) {
      const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rpgexcellence.com";
      invitePreview = { ...invitation, qr: await QRCode.toDataURL(`${site}/join/${params.invite}`, { width: 700, margin: 2, errorCorrectionLevel: "M", color: { dark: "#082a54", light: "#ffffff" } }) };
    }
  }
  return <main className="paPage"><style>{styles}</style><div className="paShell">
    <header className="paTop"><div><span>RPG EXCELLENCE · COMPANY GOVERNANCE</span><h1>People, Roles &amp; Access</h1><p>Control people, reporting relationships, illustrated professional functions, module permissions and QR onboarding from one auditable company register.</p></div><Link href="/portal">← Customer portal</Link></header>
    <section className="paMetrics"><article><span>People</span><b>{people.length}</b></article><article><span>Active users</span><b>{active}</b></article><article><span>Awaiting activation</span><b>{invited}</b></article><article><span>Directory only</span><b>{directory}</b></article></section>
    {params?.created === "directory" && <div className="paNotice success"><b>Directory person created.</b><span>The person can now be selected as an owner, manager, deputy or escalation contact.</span></div>}
    {params?.suspended && <div className="paNotice"><b>Access suspended.</b><span>Active QR invitations were revoked and the event was added to the audit trail.</span></div>}
    {setupError && <div className="paError" role="alert"><b>People &amp; Access database setup is incomplete</b><span>{setupError.message}. Run the complete File 1 migration in the Supabase SQL Editor, then refresh this page.</span></div>}
    {invitePreview && <section className="paQr"><div><span>SECURE QR INVITATION</span><h2>{invitePreview.organization_people.first_name} {invitePreview.organization_people.last_name}</h2><p>{invitePreview.organization_people.email} · {invitePreview.organization_people.position || "Position not recorded"}</p><dl><div><dt>Reference</dt><dd>{invitePreview.invitation_reference}</dd></div><div><dt>Expires</dt><dd>{date(invitePreview.expires_at)}</dd></div><div><dt>Email</dt><dd>{params.email === "sent" ? "Invitation sent" : "Email not sent — download and issue the QR securely"}</dd></div></dl><p className="paSecurity">The QR is restricted to the approved email, can be used once and contains no personal information.</p></div><div className="paQrImage"><Image src={invitePreview.qr} width={260} height={260} alt={`Personal RPG invitation QR for ${invitePreview.organization_people.first_name} ${invitePreview.organization_people.last_name}`} unoptimized/><a href={invitePreview.qr} download={`${invitePreview.invitation_reference}.png`}>Download QR as PNG</a></div></section>}
    <details className="paCreate" open={people.length === 0 || Boolean(params?.new)}><summary><span>＋</span><div><b>Create person or system user</b><small>Build the profile, organisational connections, functions, permissions and QR invitation.</small></div></summary><PeopleAccessForm people={people}/></details>
    <section className="paRegister"><header><div><span>CONTROLLED REGISTER</span><h2>Company people and access</h2></div><b>{people.length} records</b></header>
      {people.length ? <div className="paPeople">{people.map((person) => { const functions = byPerson(authorizations, person.id); const access = accessByPerson(permissions, person.id); const manager = people.find((item) => item.id === person.manager_person_id); const invitation = invitations.find((item) => item.person_id === person.id && item.status === "active"); return <article key={person.id}><div className="paIdentity"><div className="paInitials">{person.first_name[0]}{person.last_name[0]}</div><div><h3>{person.first_name} {person.last_name}</h3><p>{person.position || "Position not recorded"}{person.department ? ` · ${person.department}` : ""}</p><small>{person.email}</small></div><span className={`status ${person.account_status}`}>{person.account_status}</span></div><div className="paRelations"><span><b>Reports to</b>{manager ? `${manager.first_name} ${manager.last_name}` : "Not assigned"}</span><span><b>Site</b>{person.site || "All / not assigned"}</span><span><b>Module access</b>{access.length} modules</span></div><div className="paFunctionStrip">{functions.length ? functions.map((item) => <div key={item.id} title={`${functionLabel(item.function_key)} — ${item.status}`}><ProfessionalFunctionIcon type={item.function_key} label={functionLabel(item.function_key)} size={45}/><span>{functionLabel(item.function_key)}</span><small>{item.status}</small></div>) : <p>No professional function assigned.</p>}</div><footer><span>{invitation ? `QR ${invitation.invitation_reference} expires ${date(invitation.expires_at)}` : person.account_type === "directory" ? "Directory record — no login" : "No active QR invitation"}</span>{!['suspended','closed'].includes(person.account_status) && <form action={suspendPerson}><input type="hidden" name="person_id" value={person.id}/><button>Revoke / suspend</button></form>}</footer></article>; })}</div> : <div className="paEmpty">No people have been added. Open “Create person or system user” to begin.</div>}
    </section>
  </div></main>;
}

const styles = `*{box-sizing:border-box}.paPage{min-height:100vh;padding:34px 20px 80px;background:linear-gradient(145deg,#eaf3fb,#f7fafc 48%,#edf8f5);color:#08294f;font-family:Arial,sans-serif}.paShell{max-width:1450px;margin:auto}.paTop{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.paTop>div>span,.paRegister header span,.paQr>div>span{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.14em}.paTop h1{margin:8px 0;font-size:42px;line-height:1.05}.paTop p{max-width:850px;margin:0;color:#60758b;line-height:1.55}.paTop>a{padding:11px 14px;border:1px solid #cbd9e6;border-radius:9px;background:#fff;color:#173b60;text-decoration:none;font-weight:850}.paMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.paMetrics article{padding:18px;border:1px solid #d6e2ed;border-radius:14px;background:#fff}.paMetrics span,.paMetrics b{display:block}.paMetrics span{color:#687e94;font-size:11px;font-weight:850}.paMetrics b{margin-top:8px;font-size:30px}.paNotice,.paError{display:grid;gap:4px;margin:14px 0;padding:14px 16px;border:1px solid #efc688;border-radius:10px;background:#fff7e8;color:#784c00}.paNotice.success{border-color:#9bd8bd;background:#edfbf4;color:#08714f}.paNotice span,.paError span{font-size:12px}.paQr{display:grid;grid-template-columns:1fr 300px;gap:25px;align-items:center;margin:18px 0;padding:25px;border:1px solid #9fc5ec;border-radius:18px;background:linear-gradient(135deg,#fff,#edf6ff);box-shadow:0 14px 34px #173f6912}.paQr h2{margin:8px 0 4px;font-size:27px}.paQr p{color:#63798f}.paQr dl{display:flex;gap:10px;flex-wrap:wrap}.paQr dl div{min-width:150px;padding:11px;border-radius:9px;background:#fff}.paQr dt{color:#6c8196;font-size:9px;text-transform:uppercase}.paQr dd{margin:4px 0 0;font-size:12px;font-weight:850}.paQr .paSecurity{font-size:11px}.paQrImage{text-align:center}.paQrImage img{display:block;width:260px;height:260px;margin:auto;border:10px solid #fff;border-radius:12px}.paQrImage a{display:inline-block;margin-top:9px;color:#155dca;font-size:12px;font-weight:900}.paCreate,.paRegister{margin-top:18px;border:1px solid #d5e1ec;border-radius:17px;background:#fff;box-shadow:0 12px 30px #173f6910}.paCreate>summary{display:flex;gap:13px;align-items:center;padding:20px;cursor:pointer;list-style:none}.paCreate>summary>span{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:#315fe6;color:#fff;font-size:22px}.paCreate>summary b,.paCreate>summary small{display:block}.paCreate>summary small{margin-top:4px;color:#6c8094}.paForm{padding:0 20px 22px}.paSection{margin-top:13px;padding:19px;border:1px solid #dce6ef;border-radius:14px;background:#f9fbfd}.paSection>header{display:flex;gap:11px;align-items:flex-start;margin-bottom:16px}.paSection>header>span{display:grid;place-items:center;min-width:31px;height:31px;border:1px solid #b9cde1;border-radius:8px;color:#315fe6;font-size:10px;font-weight:950}.paSection h2{margin:0;font-size:18px}.paSection header p{margin:4px 0 0;color:#718499;font-size:11px}.paGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.paGrid label,.paFunctionControl label,.paPermissions label{display:grid;gap:6px}.paGrid label>span,.paFunctionControl label,.paPermissions label>span{font-size:10px;font-weight:900}.paGrid .wide,.paFunctionControl .wide{grid-column:1/-1}.paGrid input,.paGrid select,.paGrid textarea,.paFunctionControl input,.paFunctionControl select,.paPermissions select{width:100%;min-height:43px;padding:10px;border:1px solid #c8d6e4;border-radius:8px;background:#fff;color:#102f51;font:inherit}.paChoice{display:grid;grid-template-columns:1fr 1fr;gap:12px}.paChoice label{position:relative;padding:16px;border:1px solid #cbd9e5;border-radius:11px;background:#fff;cursor:pointer}.paChoice label.selected{border-color:#315fe6;box-shadow:0 0 0 3px #315fe614}.paChoice input{position:absolute;right:13px}.paChoice b,.paChoice small{display:block}.paChoice small{margin-top:5px;color:#718499}.paFunctions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.paFunctions article{border:1px solid #d4e0eb;border-radius:12px;background:#fff;overflow:hidden}.paFunctions article.selected{border-color:#315fe6}.paFunctions button{width:100%;min-height:180px;padding:14px;border:0;background:transparent;color:#12385f;text-align:left;cursor:pointer}.paFunctions svg{display:block;margin-bottom:7px;color:#1762cf}.paFunctions button b,.paFunctions button small,.paFunctions button span{display:block}.paFunctions button small{min-height:31px;margin-top:5px;color:#718499;font-size:10px;line-height:1.4}.paFunctions button span{margin-top:9px;color:#315fe6;font-size:10px;font-weight:900}.paFunctionControl{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px;background:#edf4ff}.paFunctionControl label{font-size:9px}.paPermissions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.paPermissions label{padding:11px;border:1px solid #d7e2ec;border-radius:9px;background:#fff}.paSection.disabled{opacity:.55}.paSubmit{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:20px 0 3px}.paSubmit b,.paSubmit span{display:block}.paSubmit span{margin-top:4px;color:#72859a;font-size:11px}.paSubmit button{padding:14px 18px;border:0;border-radius:9px;background:#315fe6;color:#fff;font-weight:900;cursor:pointer}.paSubmit button:disabled{opacity:.55}.paError{border-color:#eba69f;background:#fff0ee;color:#922f26}.paRegister{padding:22px}.paRegister>header{display:flex;justify-content:space-between;align-items:end;margin-bottom:15px}.paRegister h2{margin:5px 0 0}.paRegister>header>b{padding:7px 10px;border-radius:999px;background:#edf3ff;color:#315fe6;font-size:11px}.paPeople{display:grid;grid-template-columns:1fr 1fr;gap:12px}.paPeople>article{padding:17px;border:1px solid #d9e3ec;border-radius:13px;background:#fbfdff}.paIdentity{display:grid;grid-template-columns:45px 1fr auto;gap:11px;align-items:center}.paInitials{display:grid;place-items:center;width:45px;height:45px;border-radius:9px;background:#092d57;color:#fff;font-weight:900}.paIdentity h3{margin:0;font-size:16px}.paIdentity p,.paIdentity small{display:block;margin:3px 0 0;color:#6f8295;font-size:10px}.status{padding:6px 8px;border-radius:999px;background:#e9eef4;color:#62768a;font-size:9px;font-weight:900;text-transform:uppercase}.status.active{background:#e3f7ed;color:#087553}.status.invited{background:#fff1d9;color:#8a5b00}.status.suspended{background:#ffe8e5;color:#a52d23}.paRelations{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.paRelations span{padding:9px;border-radius:8px;background:#eef4f9;font-size:10px}.paRelations b{display:block;margin-bottom:3px;color:#678097;font-size:8px;text-transform:uppercase}.paFunctionStrip{display:flex;gap:8px;overflow-x:auto;margin-top:12px;padding:10px 0;border-top:1px solid #e4eaf0}.paFunctionStrip>div{min-width:88px;text-align:center;color:#155dcc}.paFunctionStrip svg{display:block;margin:auto}.paFunctionStrip span,.paFunctionStrip small{display:block;color:#173b60;font-size:8px}.paFunctionStrip small{color:#74879a;text-transform:capitalize}.paFunctionStrip p{color:#7a8da0;font-size:10px}.paPeople footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:10px;border-top:1px solid #e4eaf0;color:#718499;font-size:9px}.paPeople footer button{padding:7px 9px;border:1px solid #e0a69f;border-radius:7px;background:#fff4f2;color:#982f25;font-size:9px;font-weight:850;cursor:pointer}.paEmpty{padding:35px;text-align:center;color:#718499}@media(max-width:1000px){.paFunctions,.paPermissions,.paGrid{grid-template-columns:1fr 1fr}.paPeople{grid-template-columns:1fr}}@media(max-width:700px){.paPage{padding:22px 12px 60px}.paTop{display:block}.paTop>a{display:inline-block;margin-top:15px}.paTop h1{font-size:34px}.paMetrics{grid-template-columns:1fr 1fr}.paQr{grid-template-columns:1fr}.paGrid,.paFunctions,.paPermissions,.paChoice{grid-template-columns:1fr}.paSubmit{align-items:stretch;flex-direction:column}.paSubmit button{width:100%}.paRelations{grid-template-columns:1fr}.paIdentity{grid-template-columns:45px 1fr}.paIdentity>.status{grid-column:2}.paPeople footer{align-items:flex-start;flex-direction:column}}`;
