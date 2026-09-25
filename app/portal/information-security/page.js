import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import ISMSDashboardRiskHeatMap from "../../../components/ISMSDashboardRiskHeatMap";
export const metadata = { title: "ISMS Hub | RPG Excellence" };
export const dynamic = "force-dynamic";
const Card = ({ href, n, title, text }) => (
  <Link className="ishCard" href={href}>
    <small>{n}</small>
    <h2>{title}</h2>
    <p>{text}</p>
    <strong>Open workspace →</strong>
  </Link>
);
export default async function ISMSHub() {
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/information-security");
  const { data: org } = await s
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let risks = [],
    soa = [],
    treatments = [],
    appetite = 9;
  if (org) {
    const results = await Promise.all([
      s
        .from("isms_risks")
        .select("id,residual_score,status,review_due_date,inherent_likelihood,inherent_impact,residual_likelihood,residual_impact,target_likelihood,target_impact")
        .eq("organization_id", org.id)
        .neq("status", "archived"),
      s
        .from("assessment_soa_registers")
        .select("id,status")
        .eq("organization_id", org.id),
      s
        .from("isms_risk_treatments")
        .select("id,status,target_date")
        .eq("owner_id", user.id),
      s
        .from("isms_risk_methodologies")
        .select("appetite_score")
        .eq("organization_id", org.id)
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    risks = results[0].data || [];
    soa = results[1].data || [];
    treatments = results[2].data || [];
    appetite = results[3].data?.appetite_score || 9;
  }
  const elevated = risks.filter((x) => x.residual_score >= 10).length,
    overdue = treatments.filter(
      (x) =>
        x.target_date &&
        new Date(x.target_date) < new Date() &&
        !["verified", "cancelled"].includes(x.status),
    ).length;
  return (
    <main className="ish">
      <style>{styles}</style>
      <aside>
        <Link href="/portal" className="ishBrand">
          <b>RPG</b> Excellence
        </Link>
        <small>ISMS HUB</small>
        <nav>
          <Link className="active" href="/portal/information-security">
            ISMS Dashboard
          </Link>
          <Link href="/portal/information-security/risk-management">
            Risk Management
          </Link>
          <Link href="/portal/soa">Statement of Applicability</Link>
          <Link href="/portal/soa/management-board">SoA Management Board</Link>
          <Link href="/portal?standard=ISO%2FIEC%2027001%3A2022%2FAmd%201%3A2024#new-assessment">
            Gap Analysis
          </Link>
          <Link href="/portal/documents">Evidence</Link>
          <Link href="/portal/internal-audits">Internal Audit</Link>
        </nav>
      </aside>
      <div className="ishMain">
        <header>
          <div>
            <small>INFORMATION SECURITY · ISO/IEC 27001</small>
            <h1>Information Security Management Hub</h1>
            <p>
              {org?.name || "Your organisation"} · connect security risk,
              controls, evidence and assurance.
            </p>
          </div>
          <Link href="/portal">← Product Dashboard</Link>
        </header>
        <section className="ishHero">
          <div>
            <span>CONNECTED ISMS GOVERNANCE</span>
            <h2>Know the risk. Select the control. Prove the outcome.</h2>
            <p>
              Manage information-security risk from context and assets through
              treatment, Statement of Applicability, evidence, acceptance and
              review.
            </p>
          </div>
          <div className="ishHeroMetrics">
            <b>
              {risks.length}
              <small>open risks</small>
            </b>
            <b>
              {elevated}
              <small>high / critical</small>
            </b>
            <b>
              {soa.length}
              <small>SoA records</small>
            </b>
            <b>
              {overdue}
              <small>overdue treatments</small>
            </b>
          </div>
        </section>
        <ISMSDashboardRiskHeatMap risks={risks} appetite={appetite} />
        <section className="ishCards">
          <Card
            n="01"
            title="ISMS Risk Management"
            text="Assess inherent, residual and target risk; connect assets, treatment, acceptance and Annex A controls."
            href="/portal/information-security/risk-management"
          />
          <Card
            n="02"
            title="Statement of Applicability"
            text="Determine applicability and implementation across 93 Annex A controls with direct risk-treatment traceability."
            href="/portal/soa"
          />
          <Card
            n="03"
            title="ISO 27001 Gap Analysis"
            text="Assess Clauses 4–10, retain evidence, raise findings and evaluate management-system readiness."
            href="/portal?standard=ISO%2FIEC%2027001%3A2022%2FAmd%201%3A2024#new-assessment"
          />
          <Card
            n="04"
            title="Management Oversight"
            text="Review residual exposure, control status, overdue treatment and risk acceptance across the ISMS."
            href="/portal/soa/management-board"
          />
        </section>
      </div>
    </main>
  );
}
const styles = `*{box-sizing:border-box}.ish{min-height:100vh;display:grid;grid-template-columns:245px 1fr;background:#edf3f8;color:#071d3a;font-family:Arial,sans-serif}.ish>aside{position:sticky;top:0;height:100vh;padding:27px 18px;background:#07364a;color:#d7edf2}.ishBrand{display:block;margin:0 8px 27px;color:#fff;font-size:22px;text-decoration:none}.ishBrand b{font-weight:950}.ish>aside>small{display:block;margin:0 10px 11px;color:#67d9de;font-weight:950;letter-spacing:.14em}.ish nav{display:grid;gap:5px}.ish nav a{padding:11px;border-radius:8px;color:#c4dce3;text-decoration:none;font-size:13px;font-weight:800}.ish nav a:hover,.ish nav a.active{background:#0d6073;color:#fff}.ishMain{padding:29px clamp(22px,3vw,50px) 80px}.ishMain>header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.ishMain>header small,.ishHero span,.ishCard small{color:#07859a;font-weight:950;letter-spacing:.12em}.ishMain>header h1{margin:7px 0;font-size:38px}.ishMain>header p{margin:0;color:#62798e}.ishMain>header>a{padding:11px 14px;border:1px solid #c8d6e2;border-radius:8px;background:#fff;color:#143b5d;text-decoration:none;font-weight:850}.ishHero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:28px;align-items:center;min-height:255px;margin:24px 0 15px;padding:28px 30px;overflow:hidden;border:1px solid #24537d;border-radius:17px;background-image:linear-gradient(90deg,rgba(3,25,49,.99) 0%,rgba(3,31,58,.94) 38%,rgba(4,29,55,.56) 68%,rgba(3,22,44,.88) 100%),url('/images/isms-hub-command-centre.png');background-size:cover;background-position:center 52%;color:#fff;box-shadow:0 14px 35px rgba(7,38,72,.16)}.ishHero>div:first-child{position:relative;z-index:1;max-width:720px}.ishHero>div:first-child>span{display:inline-flex;padding:6px 9px;border:1px solid #43cce055;border-radius:999px;background:#062c55cc;color:#60dfeb;font-size:10px}.ishHero h2{max-width:680px;margin:10px 0 8px;font-size:31px;line-height:1.08;text-shadow:0 2px 12px #00172f}.ishHero p{max-width:700px;margin:0;color:#d3e2ef;font-size:14px;line-height:1.55;text-shadow:0 1px 8px #00172f}.ishHeroMetrics{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;border:1px solid #7edff255;border-radius:12px;background:rgba(4,29,57,.78);box-shadow:0 10px 30px rgba(0,13,31,.22);backdrop-filter:blur(7px)}.ishHeroMetrics b{padding:13px;border:1px solid #ffffff25;border-radius:9px;background:#ffffff0b;color:#fff;font-size:25px}.ishHeroMetrics small{display:block;margin-top:5px;color:#d8e7f3;font-size:10px}.ishCards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ishCard{padding:22px;border:1px solid #cedce6;border-radius:14px;background:#fff;color:#09294a;text-decoration:none}.ishCard h2{margin:12px 0 8px;font-size:20px}.ishCard p{min-height:92px;color:#60778c;line-height:1.55}.ishCard strong{color:#07859a}@media(max-width:1050px){.ish{grid-template-columns:80px 1fr}.ish>aside{padding:20px 8px}.ishBrand{font-size:0;text-align:center}.ishBrand b{font-size:20px}.ish>aside>small{display:none}.ish nav a{font-size:0;text-align:center}.ish nav a:before{content:"□";font-size:18px}.ishCards{grid-template-columns:1fr 1fr}.ishHero{grid-template-columns:1fr;background-position:58% center}}@media(max-width:650px){.ish{display:block}.ish>aside{position:static;height:auto}.ishBrand{margin:0;font-size:19px;text-align:left}.ishBrand b{font-size:inherit}.ish nav{display:none}.ishMain{padding:18px 12px 55px}.ishMain>header>a{display:none}.ishMain>header h1{font-size:30px}.ishHero{min-height:330px;padding:23px;background-position:62% center}.ishHero h2{font-size:29px}.ishHeroMetrics{grid-template-columns:1fr 1fr}.ishCards{grid-template-columns:1fr}.ishCard p{min-height:auto}}`;
