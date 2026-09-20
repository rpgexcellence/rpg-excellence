import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import BCPDashboardRiskOverview from "../../../components/BCPDashboardRiskOverview";

export const metadata = {
  title: "Business Continuity Planning Hub | RPG Excellence",
};
export const dynamic = "force-dynamic";
const registerEnhancements = `.register>header{display:flex;justify-content:space-between;gap:18px;align-items:center}.register>header h2{margin:0}.register>header p{margin:6px 0 14px;color:#62788e;font-size:12px}.register .registerAdd{padding:10px 13px;border:1px solid #315fe6;border-radius:8px;background:#315fe6;color:#fff;font-weight:850;white-space:nowrap}.registerEmpty{padding:18px;border:1px dashed #c6d5e3;border-radius:10px;background:#f8fbfe;color:#62788e}@media(max-width:720px){.register>header{align-items:flex-start;flex-direction:column}.register>a{gap:12px}.register>a>span{text-align:right}}`;

const NavLink = ({ href, children, active = false }) => (
  <Link className={active ? "bcpNavLink active" : "bcpNavLink"} href={href}>
    <i />
    {children}
  </Link>
);

function PortalSidebar() {
  return (
    <aside className="bcpSidebar">
      <Link className="bcpBrand" href="/portal">
        <b>RPG</b> Excellence
      </Link>
      <small>ASSURANCE WORKSPACE</small>
      <nav>
        <NavLink href="/portal">Dashboard</NavLink>
        <NavLink href="/portal/history">Assessments</NavLink>
        <NavLink href="/portal/internal-audits">Internal Audits</NavLink>
        <NavLink href="/portal/internal-audit-actions">
          Findings &amp; Actions
        </NavLink>
        <div className="bcpNavGroup">
          <NavLink href="/portal/rca">CAPA-8D</NavLink>
          <div className="bcpSub">
            <Link href="/portal/rca">CAPA-8D Register</Link>
            <Link href="/portal/rca?view=management-board">
              Management Board
            </Link>
            <Link href="/portal/rca?view=open">Open Cases</Link>
          </div>
        </div>
        <div className="bcpNavGroup">
          <NavLink href="/portal/health-safety">
            Health &amp; Safety Hub
          </NavLink>
          <div className="bcpSub">
            <Link href="/portal/health-safety">H&amp;S Dashboard</Link>
            <Link href="/portal/health-safety/risk-assessment">
              Risk Assessments
            </Link>
            <Link href="/portal/health-safety/powra">POWRA</Link>
            <Link href="/portal/health-safety/permits">Permit to Work</Link>
            <Link href="/portal/health-safety/moc">Management of Change</Link>
          </div>
        </div>
        <div className="bcpNavGroup">
          <NavLink href="/portal/business-continuity" active>
            Business Continuity
          </NavLink>
          <div className="bcpSub active">
            <Link href="/portal/business-continuity">BCP Dashboard</Link>
            <Link href="/portal/business-continuity/site-profile">
              Site Profile
            </Link>
            <Link href="/portal/business-continuity/training">
              Learning Path
            </Link>
            <Link href="/portal/business-continuity/context">
              Context &amp; Interested Parties
            </Link>
            <Link href="/portal/business-continuity/roles">
              Roles &amp; Responsibilities
            </Link>
            <Link href="/portal/business-continuity/hazard-scenarios">
              Hazard Scenarios
            </Link>
            <Link href="/portal/business-continuity/bia">
              Business Impact Analysis
            </Link>
            <Link href="/portal?standard=ISO%2022301%3A2019#new-assessment">
              ISO 22301 Assessment
            </Link>
          </div>
        </div>
        <NavLink href="/portal/documents">Evidence</NavLink>
        <NavLink href="/portal/reports">Reports</NavLink>
      </nav>
      <div className="bcpSideFoot">
        <strong>ISO 22301</strong>
        <span>Business continuity workspace</span>
      </div>
    </aside>
  );
}

export default async function BCPHub() {
  const s = await createClient(),
    {
      data: { user },
    } = await s.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/business-continuity");
  const { data: org } = await s
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  let profiles = [],
    training = [],
    contexts = [],
    roles = [],
    hazards = [],
    bias = [];
  if (org) {
    ({ data: profiles = [] } = await s
      .from("bcp_site_profiles")
      .select(
        "id,profile_reference,location_name,status,version,completion_percent,review_due_date,updated_at",
      )
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    ({ data: training = [] } = await s
      .from("bcp_training_progress")
      .select("phase_code,status,score")
      .eq("organization_id", org.id));
    ({ data: contexts = [] } = await s
      .from("bcp_context_assessments")
      .select(
        "id,assessment_reference,assessment_title,site_profile_id,status,version,completion_percent,review_due_date,updated_at,external_context,internal_context,interested_parties",
      )
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    ({ data: roles = [] } = await s
      .from("bcp_role_assessments")
      .select(
        "id,assessment_reference,assessment_title,site_profile_id,context_assessment_id,status,version,completion_percent,review_due_date,updated_at",
      )
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    ({ data: hazards = [] } = await s
      .from("bcp_hazard_assessments")
      .select(
        "id,assessment_reference,assessment_title,site_profile_id,status,version,completion_percent,next_review_date,updated_at,scenario_assessments,methodology",
      )
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }));
    const biaResult = await s
      .from("bcp_bia_assessments")
      .select("*")
      .eq("organization_id", org.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    bias = biaResult.data || [];
  }
  const done = training?.filter((x) => x.status === "complete").length || 0;
  const liveRisks = hazards.flatMap((x) =>
      Array.isArray(x.scenario_assessments)
        ? x.scenario_assessments.map((risk) => ({
            ...risk,
            assessmentId: x.id,
          }))
        : [],
    ),
    appetite =
      hazards.find((x) => x.methodology?.appetiteScore)?.methodology
        ?.appetiteScore || 9;
  return (
    <main className="bcpShell">
      <style>{styles}</style>
      <style>{registerEnhancements}</style>
      <PortalSidebar />
      <div className="bcpWorkspace">
        <header className="bcpTop">
          <div>
            <small>BUSINESS CONTINUITY PLANNING · ISO 22301</small>
            <h1>Business Continuity Planning Hub</h1>
            <p>
              {org?.name || "Your organisation"} · build capability from site
              profile to exercised recovery.
            </p>
          </div>
          <Link href="/portal">← Product Dashboard</Link>
        </header>
        <section className="hero">
          <div>
            <span>CONTROLLED IMPLEMENTATION</span>
            <h2>Know what matters. Prepare what must continue.</h2>
            <p>
              Connect organisational context, value-chain priorities, disruption
              risk, BIA, strategy, plans, exercises and improvement through one
              evidence-led programme.
            </p>
          </div>
          <aside>
            <strong>{profiles?.length || 0}</strong>
            <span>site profiles</span>
            <strong>{done}/6</strong>
            <span>learning phases complete</span>
          </aside>
        </section>
        <section className="journey">
          {[
            ["01", "Profile", "Scope, leaders and processes"],
            ["02", "Context", "Parties, duties and roles"],
            ["03", "Analyse", "Risk and BIA"],
            ["04", "Prepare", "Strategies and plans"],
            ["05", "Assure", "Exercise and improve"],
          ].map(([n, t, x]) => (
            <article key={n}>
              <b>{n}</b>
              <h3>{t}</h3>
              <p>{x}</p>
            </article>
          ))}
        </section>
        <BCPDashboardRiskOverview
          risks={liveRisks}
          appetite={appetite}
          contextAssessment={contexts[0] || null}
          biaAssessment={bias[0] || null}
        />
        <section className="cards">
          <Link
            href={
              profiles?.[0]?.id
                ? `/portal/business-continuity/site-profile?id=${profiles[0].id}`
                : "/portal/business-continuity/site-profile?new=1"
            }
          >
            <small>MODULE 1</small>
            <h2>Site Profile Assessment</h2>
            <p>
              Map accountable leadership, operational scope, value-chain and
              support processes, owners, dependencies and the initial learning
              population.
            </p>
            <strong>
              {profiles?.length
                ? "Continue latest profile →"
                : "Start site profile →"}
            </strong>
          </Link>
          <Link href="/portal/business-continuity/training">
            <small>MODULE 2</small>
            <h2>BCP Learning Path</h2>
            <p>
              Role-based learning released alongside each implementation phase,
              with practical decisions, knowledge checks and visual aids.
            </p>
            <strong>Open training →</strong>
          </Link>
          <Link
            href={
              contexts?.[0]?.id
                ? `/portal/business-continuity/context?id=${contexts[0].id}`
                : "/portal/business-continuity/context?new=1"
            }
          >
            <small>MODULE 3 · CLAUSE 4</small>
            <h2>Context &amp; Interested Parties</h2>
            <p>
              Prioritise external and internal issues, stakeholder requirements,
              obligations, risk appetite and the BCMS scope.
            </p>
            <strong>
              {contexts?.length
                ? "Continue latest assessment →"
                : "Start context assessment →"}
            </strong>
          </Link>
          <Link
            href={
              roles?.[0]?.id
                ? `/portal/business-continuity/roles?id=${roles[0].id}`
                : "/portal/business-continuity/roles?new=1"
            }
          >
            <small>MODULE 4 · CLAUSE 5.3</small>
            <h2>Roles &amp; Responsibilities</h2>
            <p>
              Generate accountable roles and process ownership from Modules 1
              and 3, then control authority, competence, deputies and
              operational RACI.
            </p>
            <strong>
              {roles?.length
                ? "Continue latest assessment →"
                : "Start roles assessment →"}
            </strong>
          </Link>
          <Link
            href={
              hazards?.[0]?.id
                ? `/portal/business-continuity/hazard-scenarios?id=${hazards[0].id}`
                : "/portal/business-continuity/hazard-scenarios?new=1"
            }
          >
            <small>MODULE 5 · CLAUSE 8.2.3</small>
            <h2>Risk Assessment - Hazard Scenarios</h2>
            <p>
              Screen disruption threats, calculate inherent and residual risk,
              test controls, assign treatments and maintain the current risk
              register.
            </p>
            <strong>
              {hazards?.length
                ? "Continue latest assessment →"
                : "Start hazard assessment →"}
            </strong>
          </Link>
          <Link href="/portal?standard=ISO%2022301%3A2019#new-assessment">
            <small>ISO 22301</small>
            <h2>Gap Analysis</h2>
            <p>
              Assess Clauses 4–10, retain evidence, create findings and produce
              controlled readiness reporting.
            </p>
            <strong>Start assessment →</strong>
          </Link>
        </section>
        <section className="register">
          <header>
            <div>
              <h2>Site Profile Register</h2>
              <p>
                Select the exact controlled profile used by Module 3, risk
                assessment and BIA.
              </p>
            </div>
            <Link
              className="registerAdd"
              href="/portal/business-continuity/site-profile?new=1"
            >
              + New profile
            </Link>
          </header>
          {profiles?.length ? (
            profiles.map((p) => (
              <Link
                href={`/portal/business-continuity/site-profile?id=${p.id}`}
                key={p.id}
              >
                <div>
                  <strong>{p.location_name || "Unnamed site"}</strong>
                  <small>
                    {p.profile_reference} · Version {p.version || 1}
                  </small>
                </div>
                <span>
                  {p.status.replaceAll("_", " ")} · {p.completion_percent}% →
                </span>
              </Link>
            ))
          ) : (
            <div className="registerEmpty">
              No active site profiles. Create one before starting Module 3.
            </div>
          )}
        </section>
        <section className="register">
          <header>
            <div>
              <h2>Module 3 Assessment Register</h2>
              <p>
                Select an assessment to continue, review or approve its
                controlled outputs.
              </p>
            </div>
            <Link
              className="registerAdd"
              href="/portal/business-continuity/context?new=1"
            >
              + New assessment
            </Link>
          </header>
          {contexts?.length ? (
            contexts.map((c) => (
              <Link
                href={`/portal/business-continuity/context?id=${c.id}`}
                key={c.id}
              >
                <div>
                  <strong>
                    {c.assessment_title ||
                      "Organisational context and interested parties"}
                  </strong>
                  <small>
                    {c.assessment_reference} · Version {c.version || 1}
                    {c.review_due_date
                      ? ` · Review ${new Date(c.review_due_date).toLocaleDateString("en-GB")}`
                      : ""}
                  </small>
                </div>
                <span>
                  {c.status.replaceAll("_", " ")} · {c.completion_percent}% →
                </span>
              </Link>
            ))
          ) : (
            <div className="registerEmpty">
              No active Module 3 assessments. Create one to begin the controlled
              Clause 4 workflow.
            </div>
          )}
        </section>
        <section className="register">
          <header>
            <div>
              <h2>Module 4 Roles Register</h2>
              <p>
                Select the controlled role assessment linked to the exact Module
                1 and optional Module 3 versions.
              </p>
            </div>
            <Link
              className="registerAdd"
              href="/portal/business-continuity/roles?new=1"
            >
              + New roles assessment
            </Link>
          </header>
          {roles?.length ? (
            roles.map((r) => (
              <Link
                href={`/portal/business-continuity/roles?id=${r.id}`}
                key={r.id}
              >
                <div>
                  <strong>
                    {r.assessment_title || "BCMS roles and responsibilities"}
                  </strong>
                  <small>
                    {r.assessment_reference} · Version {r.version || 1}
                    {r.review_due_date
                      ? ` · Review ${new Date(r.review_due_date).toLocaleDateString("en-GB")}`
                      : ""}
                  </small>
                </div>
                <span>
                  {r.status.replaceAll("_", " ")} · {r.completion_percent}% →
                </span>
              </Link>
            ))
          ) : (
            <div className="registerEmpty">
              No active Module 4 assessments. Start one after selecting the
              applicable Site Profile.
            </div>
          )}
        </section>
        <section className="register">
          <header>
            <div>
              <h2>Module 5 Hazard Scenario Register</h2>
              <p>
                Continue or review the risk assessment linked to the exact
                profile, context and role versions.
              </p>
            </div>
            <Link
              className="registerAdd"
              href="/portal/business-continuity/hazard-scenarios?new=1"
            >
              + New hazard assessment
            </Link>
          </header>
          {hazards?.length ? (
            hazards.map((r) => (
              <Link
                href={`/portal/business-continuity/hazard-scenarios?id=${r.id}`}
                key={r.id}
              >
                <div>
                  <strong>
                    {r.assessment_title ||
                      "BC risk assessment - hazard scenarios"}
                  </strong>
                  <small>
                    {r.assessment_reference} · Version {r.version || 1}
                    {r.next_review_date
                      ? ` · Review ${new Date(r.next_review_date).toLocaleDateString("en-GB")}`
                      : ""}
                  </small>
                </div>
                <span>
                  {r.status.replaceAll("_", " ")} · {r.completion_percent}% →
                </span>
              </Link>
            ))
          ) : (
            <div className="registerEmpty">
              No active Module 5 assessment. Link a Site Profile and begin
              scenario screening.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = `*{box-sizing:border-box}.bcpShell{min-height:100vh;display:grid;grid-template-columns:245px minmax(0,1fr);background:#edf3f9;color:#071d3a;font-family:Arial,sans-serif}.bcpSidebar{position:sticky;top:0;height:100vh;overflow-y:auto;padding:27px 17px;background:#08294f;color:#d6e4f2}.bcpBrand{display:block;margin:0 8px 30px;color:#fff;font-size:23px;text-decoration:none}.bcpBrand b{font-weight:950}.bcpSidebar>small{display:block;margin:0 10px 12px;color:#7394b5;font-size:9px;font-weight:900;letter-spacing:.12em}.bcpSidebar nav{display:grid;gap:4px}.bcpNavLink{display:flex;align-items:center;gap:10px;padding:11px;border-radius:8px;color:#d6e4f2;text-decoration:none;font-size:13px;font-weight:800}.bcpNavLink i{width:11px;height:11px;border:1px solid currentColor;border-radius:3px}.bcpNavLink:hover,.bcpNavLink.active{background:#1d568e;color:#fff}.bcpNavLink.active i{background:#5de3d0;border-color:#5de3d0;box-shadow:inset 0 0 0 3px #1d568e}.bcpSub{display:grid;gap:2px;margin:0 0 5px 18px;padding-left:14px;border-left:1px solid #42688e}.bcpSub a{padding:7px 5px;color:#bcd0e3;text-decoration:none;font-size:11px;font-weight:700}.bcpSub a:hover,.bcpSub.active a:first-child{color:#fff}.bcpSideFoot{display:grid;gap:4px;margin-top:25px;padding:15px;border:1px solid #ffffff1c;border-radius:12px;background:#ffffff08}.bcpSideFoot span{color:#9fb7ce;font-size:11px}.bcpWorkspace{min-width:0;padding:28px clamp(22px,3vw,52px) 90px}.bcpTop{display:flex;justify-content:space-between;gap:20px;align-items:start}.bcpTop small,.hero span,.cards small{color:#6845d1;font-weight:950;letter-spacing:.12em}.bcpTop h1{margin:7px 0;font-size:38px}.bcpTop p{margin:0;color:#62788e}.bcpTop>a{padding:11px 14px;border:1px solid #c8d5e2;border-radius:8px;background:#fff;color:#173b60;text-decoration:none;font-weight:850}.hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:28px;align-items:center;min-height:255px;margin-top:22px;padding:28px 30px;overflow:hidden;border:1px solid #24537d;border-radius:17px;background-image:linear-gradient(90deg,rgba(4,27,54,.98) 0%,rgba(4,35,68,.92) 38%,rgba(5,31,60,.58) 68%,rgba(4,24,49,.86) 100%),url('/images/bcp-command-centre.png');background-size:cover;background-position:center 61%;color:#fff;box-shadow:0 14px 35px rgba(7,38,72,.16)}.hero>div{position:relative;z-index:1;max-width:720px}.hero>div>span{display:inline-flex;padding:6px 9px;border:1px solid #43cce055;border-radius:999px;background:#062c55cc;color:#60dfeb;font-size:10px}.hero h2{max-width:680px;margin:10px 0 8px;font-size:31px;line-height:1.08;text-shadow:0 2px 12px #00172f}.hero p{max-width:700px;margin:0;color:#d3e2ef;font-size:14px;line-height:1.55;text-shadow:0 1px 8px #00172f}.hero aside{position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;padding:17px;border:1px solid #7edff255;border-radius:12px;background:rgba(4,29,57,.78);box-shadow:0 10px 30px rgba(0,13,31,.22);backdrop-filter:blur(7px)}.hero aside strong{color:#fff;font-size:25px}.hero aside span{color:#d8e7f3;letter-spacing:0;font-size:11px}.journey{display:grid;grid-template-columns:repeat(5,1fr);gap:11px;margin:16px 0}.journey article{padding:16px;border:1px solid #d0ddea;border-radius:11px;background:#fff}.journey b{color:#6845d1}.journey h3{margin:12px 0 5px}.journey p{margin:0;color:#64798d;font-size:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cards>a{padding:25px;border:1px solid #cbd9e5;border-radius:16px;background:#fff;color:#071d3a;text-decoration:none}.cards h2{margin:13px 0 9px}.cards p{min-height:78px;color:#60768c;line-height:1.55}.cards strong{color:#185fd7}.register{margin-top:17px;padding:24px;border:1px solid #cbd9e5;border-radius:16px;background:#fff}.register h2{margin-top:0}.register>a{display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid #e1e8ef;color:#0b294b;text-decoration:none}.register small{display:block;margin-top:4px;color:#75899c}.register span{font-weight:850;text-transform:capitalize}@media(max-width:1050px){.bcpShell{grid-template-columns:78px minmax(0,1fr)}.bcpSidebar{padding:24px 9px}.bcpBrand{font-size:0;text-align:center;margin-bottom:25px}.bcpBrand b{font-size:21px}.bcpSidebar>small,.bcpSub,.bcpSideFoot{display:none}.bcpNavLink{justify-content:center;font-size:0}.bcpNavLink i{width:15px;height:15px}}@media(max-width:720px){.bcpShell{display:block}.bcpSidebar{position:static;height:auto;padding:14px 18px}.bcpBrand{margin:0;font-size:20px;text-align:left}.bcpBrand b{font-size:inherit}.bcpSidebar nav,.bcpSidebar>small{display:none}.bcpWorkspace{padding:20px 14px 70px}.hero,.cards{grid-template-columns:1fr}.hero{min-height:330px;padding:23px;background-position:58% center}.journey{grid-template-columns:1fr 1fr}.hero aside{grid-template-columns:auto 1fr}.bcpTop>a{display:none}.bcpTop h1{font-size:30px}}`;
