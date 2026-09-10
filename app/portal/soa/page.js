import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { getAvailableStandaloneSoaPasses, getUserSubscription, hasActiveSubscription } from "../../../lib/subscription";
import { createStandaloneSoa } from "../actions";

export const metadata = { title: "Statement of Applicability Register | RPG Intelligence" };
export const dynamic = "force-dynamic";

const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const label = (value) => String(value ?? "draft").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function SoaRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/soa");

  const [{ data: organisations, error: orgError }, { data: assessments, error: assessmentError }, { data: registers, error: registerError }] = await Promise.all([
    supabase.from("organizations").select("id,name").eq("owner_id", user.id).order("created_at"),
    supabase.from("assessments").select("id,organization_id,standard,status,workspace_type,created_at").eq("owner_id", user.id).in("standard", ["ISO/IEC 27001:2022", "ISO/IEC 27001:2022/Amd 1:2024"]).order("created_at", { ascending: false }),
    supabase.from("assessment_soa_registers").select("assessment_id,status,version,updated_at,approved_at").eq("owner_id", user.id),
  ]);
  if (orgError || assessmentError || registerError) throw new Error(orgError?.message || assessmentError?.message || registerError?.message);

  const subscription = await getUserSubscription(user.id);
  const passes = await getAvailableStandaloneSoaPasses(user.id);
  const organisation = organisations?.[0] ?? null;
  const orgMap = new Map((organisations ?? []).map((item) => [item.id, item.name]));
  const registerMap = new Map((registers ?? []).map((item) => [item.assessment_id, item]));
  const rows = (assessments ?? []).filter((item) => registerMap.has(item.id)).map((item) => ({ ...item, register: registerMap.get(item.id) }));
  const standaloneCount = rows.filter((item) => item.workspace_type === "soa_only").length;
  const approvedCount = rows.filter((item) => item.register.status === "approved").length;

  return <main className="soaRegisterPage"><style>{`
    *{box-sizing:border-box}.soaRegisterPage{min-height:100vh;background:#edf4f8;color:#071a33;padding:34px 20px 70px;font-family:Arial,sans-serif}.soaRegisterShell{max-width:1280px;margin:auto}.soaRegisterTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.soaRegisterTop span{color:#0b8e81;font-size:12px;font-weight:900;letter-spacing:.1em}.soaRegisterTop h1{font-size:34px;margin:7px 0}.soaRegisterTop p{margin:0;color:#657990}.soaRegisterActions{display:flex;gap:9px;flex-wrap:wrap}.soaBtn{display:inline-flex;padding:12px 16px;border:0;border-radius:9px;background:#1459d9;color:#fff;text-decoration:none;font-weight:850;cursor:pointer}.soaBtn.secondary{background:#fff;color:#071a33;border:1px solid #cbd8e8}.soaHero{margin-top:24px;padding:28px;border-radius:18px;background:linear-gradient(115deg,#061d3b,#075d69);color:#fff;display:grid;grid-template-columns:1fr auto;gap:25px;align-items:center}.soaHero h2{margin:0 0 7px}.soaHero p{margin:0;color:#cce2e5}.soaHero strong{font-size:46px}.soaMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin:15px 0}.soaMetric{padding:18px;border:1px solid #d5e3e6;border-radius:13px;background:#fff}.soaMetric span,.soaMetric strong{display:block}.soaMetric span{color:#647b8e;font-size:12px;font-weight:850}.soaMetric strong{font-size:30px;margin-top:8px}.soaLaunch,.soaList{padding:22px;border:1px solid #d5e3e6;border-radius:15px;background:#fff;margin-top:15px}.soaLaunch form{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.soaLaunch small{color:#38766f;font-weight:800}.soaList h2{margin-top:0}.soaRows{display:grid;gap:9px}.soaRow{display:grid;grid-template-columns:1.4fr .7fr .6fr auto;gap:16px;align-items:center;padding:16px;border:1px solid #dce7e9;border-radius:11px;color:#183d55;text-decoration:none}.soaRow:hover{border-color:#58bfb1;background:#f4fcfa}.soaRow strong,.soaRow small{display:block}.soaRow small{color:#718699;margin-top:4px}.soaPill{justify-self:start;padding:6px 9px;border-radius:999px;background:#e7f7f3;color:#087568;font-size:12px;font-weight:850}@media(max-width:750px){.soaHero{grid-template-columns:1fr}.soaMetrics{grid-template-columns:1fr}.soaRow{grid-template-columns:1fr auto}.soaRow>:nth-child(2),.soaRow>:nth-child(3){display:none}}
  `}</style><div className="soaRegisterShell">
    <header className="soaRegisterTop"><div><span>RPG INTELLIGENCE · CONTROLLED SoA</span><h1>Statement of Applicability Register</h1><p>Standalone and assessment-linked ISO/IEC 27001 Statements of Applicability in one place.</p></div><div className="soaRegisterActions"><Link href="/portal" className="soaBtn secondary">← Product Dashboard</Link><Link href="/portal/soa/management-board" className="soaBtn">Management Board</Link><Link href="/en/iso-27001" className="soaBtn secondary">ISO 27001 guide</Link></div></header>
    <section className="soaHero"><div><h2>Control selection, risk treatment and approval</h2><p>Manage all 93 Annex A controls with ISO/IEC 27002-aligned guidance, evidence and controlled reporting.</p></div><strong>{rows.length}</strong></section>
    <section className="soaMetrics"><div className="soaMetric"><span>ALL SoA RECORDS</span><strong>{rows.length}</strong></div><div className="soaMetric"><span>STANDALONE WORKSPACES</span><strong>{standaloneCount}</strong></div><div className="soaMetric"><span>APPROVED</span><strong>{approvedCount}</strong></div></section>
    {organisation && (hasActiveSubscription(subscription) || passes.length > 0) && <section className="soaLaunch"><h2>Create a new standalone SoA</h2><form action={createStandaloneSoa}><input type="hidden" name="organization_id" value={organisation.id}/><button className="soaBtn">Create 93-control SoA →</button>{passes.length > 0 && <small>{passes.length} purchased workspace{passes.length === 1 ? "" : "s"} available</small>}</form></section>}
    {!hasActiveSubscription(subscription) && passes.length === 0 && <section className="soaLaunch"><h2>Need another standalone SoA?</h2><p>Purchase one controlled workspace for £129 with no subscription.</p><Link href="/en/pricing" className="soaBtn">View standalone offer →</Link></section>}
    <section className="soaList"><h2>Controlled SoA records</h2>{rows.length ? <div className="soaRows">{rows.map((row) => <Link className="soaRow" href={`/portal/assessments/${row.id}/soa`} key={row.id}><div><strong>{row.workspace_type === "soa_only" ? "Standalone Statement of Applicability" : "Assessment-linked Statement of Applicability"}</strong><small>{orgMap.get(row.organization_id) || "Organisation"} · created {date(row.created_at)}</small></div><div><strong>Version {row.register.version || "1.0"}</strong><small>Updated {date(row.register.updated_at)}</small></div><span className="soaPill">{label(row.register.status)}</span><strong>Open →</strong></Link>)}</div> : <p>No Statement of Applicability has been created yet.</p>}</section>
  </div></main>;
}
