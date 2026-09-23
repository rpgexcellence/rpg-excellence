import crypto from "node:crypto";
import Link from "next/link";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import ProfessionalFunctionIcon from "../../../components/ProfessionalFunctionIcon";
import { functionLabel, moduleLabel } from "../../../lib/people-access";
import { activateQrInvitation } from "./actions";

export const metadata = { title: "Secure company invitation | RPG Excellence" };
export const dynamic = "force-dynamic";
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

export default async function JoinCompanyPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  const admin = createAdminClient();
  const { data: invitation } = await admin.from("organization_invitations").select("*").eq("token_hash", hash(token)).maybeSingle();
  const invalid = !invitation || invitation.status !== "active" || new Date(invitation.expires_at) <= new Date();
  if (invalid) return <main className="joinPage"><style>{styles}</style><section className="joinCard"><div className="joinBrand">RPG <span>Excellence</span></div><span className="joinEyebrow">SECURE COMPANY ACCESS</span><h1>This QR invitation is no longer active</h1><p>It may have been used, revoked or expired. Ask your company administrator to generate a new personal QR.</p><Link href="/portal/login">Return to secure login</Link></section></main>;
  const [{ data: person }, { data: organisation }, { data: functions = [] }, { data: permissions = [] }] = await Promise.all([
    admin.from("organization_people").select("*").eq("id", invitation.person_id).single(),
    admin.from("organizations").select("id,name").eq("id", invitation.organization_id).single(),
    admin.from("organization_person_authorizations").select("*").eq("person_id", invitation.person_id),
    admin.from("organization_person_permissions").select("*").eq("person_id", invitation.person_id).neq("access_level", "none"),
  ]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const emailMatches = user?.email?.toLowerCase() === person.email.toLowerCase();
  return <main className="joinPage"><style>{styles}</style><section className="joinCard wide"><div className="joinBrand">RPG <span>Excellence</span></div><span className="joinEyebrow">{organisation.name} · CONTROLLED INVITATION</span><h1>Welcome, {person.first_name}</h1><p>Your company has prepared an RPG Excellence profile for <b>{person.email}</b>. Confirm your identity to activate only the functions and platform areas shown below.</p>
    {query?.error && <div className="joinError">{query.error === "email" ? `You are signed in with a different email. Sign out and use ${person.email}.` : "This invitation cannot be activated. Ask your company administrator for a new QR."}</div>}
    <div className="joinSummary"><div><span>Position</span><b>{person.position || "Not specified"}</b></div><div><span>Department</span><b>{person.department || "Not specified"}</b></div><div><span>Site</span><b>{person.site || "Organisation-wide"}</b></div></div>
    <h2>Approved functions</h2><div className="joinFunctions">{functions.length ? functions.map((item) => <div key={item.id}><ProfessionalFunctionIcon type={item.function_key} label={functionLabel(item.function_key)} size={55}/><b>{functionLabel(item.function_key)}</b><small>{item.status}</small></div>) : <p>No professional function has been assigned.</p>}</div>
    <h2>Platform access</h2><div className="joinModules">{permissions.map((item) => <span key={item.id}><b>{moduleLabel(item.module_key)}</b>{item.access_level.replaceAll("_", " ")}</span>)}</div>
    {!user ? <div className="joinActions"><Link className="primary" href={`/portal/login?mode=create&next=${encodeURIComponent(`/join/${token}`)}`}>Create account</Link><Link href={`/portal/login?next=${encodeURIComponent(`/join/${token}`)}`}>I already have an account</Link></div> : emailMatches ? <form action={activateQrInvitation} className="joinActions"><input type="hidden" name="token" value={token}/><button className="primary">Verify identity &amp; activate access</button></form> : <div className="joinError">You are signed in as {user.email}. This QR is restricted to {person.email}. Sign out before continuing.</div>}
    <small className="joinSecurity">Single-use QR · Email-restricted · Activation recorded in the company audit trail</small>
  </section></main>;
}

const styles = `*{box-sizing:border-box}.joinPage{min-height:100vh;display:grid;place-items:center;padding:30px;background:radial-gradient(circle at 10% 10%,#dbeaff,transparent 34%),linear-gradient(145deg,#eff5fb,#f8fafc);color:#08294f;font-family:Arial,sans-serif}.joinCard{width:min(620px,100%);padding:34px;border:1px solid #d3dfeb;border-radius:22px;background:#fff;box-shadow:0 25px 70px #12395f20}.joinCard.wide{width:min(880px,100%)}.joinBrand{margin-bottom:32px;color:#082a54;font-size:21px;font-weight:950}.joinBrand span{font-weight:400}.joinEyebrow{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.13em}.joinCard h1{margin:9px 0 11px;font-size:38px}.joinCard>p{color:#61768c;line-height:1.55}.joinCard>a,.joinActions a,.joinActions button{display:inline-flex;justify-content:center;padding:13px 17px;border:1px solid #bfd0df;border-radius:9px;background:#fff;color:#173b60;text-decoration:none;font:inherit;font-weight:900;cursor:pointer}.joinSummary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0}.joinSummary div{padding:13px;border-radius:9px;background:#f0f5fa}.joinSummary span,.joinSummary b{display:block}.joinSummary span{color:#6c8095;font-size:9px;text-transform:uppercase}.joinSummary b{margin-top:4px;font-size:12px}.joinCard h2{margin:22px 0 10px;font-size:15px}.joinFunctions{display:flex;gap:10px;overflow-x:auto}.joinFunctions>div{min-width:112px;padding:11px;border:1px solid #d9e3ec;border-radius:10px;text-align:center}.joinFunctions svg{display:block;margin:auto;color:#1762cf}.joinFunctions b,.joinFunctions small{display:block;font-size:9px}.joinFunctions small{margin-top:4px;color:#72859a;text-transform:capitalize}.joinModules{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.joinModules span{padding:10px;border-radius:8px;background:#f0f5fa;color:#6b8095;font-size:9px;text-transform:capitalize}.joinModules b{display:block;margin-bottom:3px;color:#173b60;font-size:10px;text-transform:none}.joinActions{display:flex;gap:10px;margin-top:25px}.joinActions .primary{border-color:#315fe6;background:#315fe6;color:#fff}.joinError{margin:16px 0;padding:13px;border:1px solid #ecaaa3;border-radius:9px;background:#fff0ee;color:#922f26;font-size:12px}.joinSecurity{display:block;margin-top:18px;color:#788a9c;text-align:center}@media(max-width:650px){.joinPage{padding:0;place-items:stretch}.joinCard,.joinCard.wide{min-height:100vh;border:0;border-radius:0;padding:27px 20px}.joinCard h1{font-size:32px}.joinSummary,.joinModules{grid-template-columns:1fr}.joinActions{flex-direction:column}}`;
