import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import {
  getUserSubscription,
  getPlanLabel,
  hasActiveSubscription,
  hasPlanAccess,
  getAvailableAssessmentPasses,
  getAvailableStandaloneSoaPasses,
} from "../../lib/subscription";
import {
  createOrganization,
  createAssessment,
  createStandaloneSoa,
} from "./actions";
import { calculateSimpleOverallScore } from "./assessments/[id]/scoring";

export const metadata = { title: "RPG Intelligence Dashboard" };

const assessmentStandards = [
  ["ISO 9001:2015/Amd 1:2024", "ISO 9001 — Quality Management"],
  ["ISO 14001:2026", "ISO 14001 — Environmental Management"],
  [
    "ISO 45001:2018",
    "ISO 45001:2018/Amd 1:2024 — Occupational Health & Safety",
  ],
  [
    "ISO/IEC 27001:2022",
    "ISO/IEC 27001:2022/Amd 1:2024 — Information Security",
  ],
  ["ISO/IEC 17024:2026", "ISO/IEC 17024 — Certification of Persons"],
  ["ISO 22301:2019", "ISO 22301:2019 — Business Continuity Management"],
];
const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";
const maturity = (score) =>
  score === null
    ? "Not assessed"
    : score <= 20
      ? "Initial"
      : score <= 40
        ? "Developing"
        : score <= 60
          ? "Managed"
          : score <= 80
            ? "Controlled"
            : "Optimised";

function SideLink({ href, children, active = false }) {
  return (
    <Link href={href} className={active ? "pdSideLink active" : "pdSideLink"}>
      <i />
      {children}
    </Link>
  );
}
function Metric({ label: title, value, detail, tone = "blue", href }) {
  const body = (
    <>
      <span>{title}</span>
      <strong className={tone}>{value}</strong>
      <small>{detail}</small>
    </>
  );
  return href ? (
    <Link href={href} className="pdMetric">
      {body}
    </Link>
  ) : (
    <div className="pdMetric">{body}</div>
  );
}

export default async function PortalPage({ searchParams }) {
  const query = await searchParams;
  const requestedStandard = assessmentStandards.some(
    ([value]) => value === query?.standard,
  )
    ? query.standard
    : "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const subscription = await getUserSubscription(user.id);
  const assessmentPasses = await getAvailableAssessmentPasses(user.id);
  const standaloneSoaPasses = await getAvailableStandaloneSoaPasses(user.id);
  const canUsePaidFeatures =
    hasActiveSubscription(subscription) || assessmentPasses.length > 0;
  const allowedStandards = hasActiveSubscription(subscription)
    ? assessmentStandards
    : assessmentStandards.filter(([value]) =>
        assessmentPasses.some((pass) => pass.standard === value),
      );

  const [
    orgsResult,
    assessmentsResult,
    auditsResult,
    findingsResult,
    actionsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("assessments")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("internal_audits")
      .select(
        "id,audit_reference,title,status,current_gate,updated_at,internal_audit_selected_standards(internal_audit_standard_catalogue(display_name))",
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("internal_audit_findings")
      .select("id,status,finding_type,closure_verified")
      .eq("owner_id", user.id),
    supabase
      .from("rca_actions")
      .select(
        "id,status,discipline,selection_status,effectiveness_result,d6_submitted_at",
      )
      .eq("owner_id", user.id),
  ]);
  for (const result of [
    orgsResult,
    assessmentsResult,
    auditsResult,
    findingsResult,
    actionsResult,
  ])
    if (result.error) throw new Error(result.error.message);
  const organization = orgsResult.data?.[0] ?? null;
  const allAssessments = assessmentsResult.data ?? [];
  const assessments = allAssessments.filter(
    (assessment) => assessment.workspace_type !== "soa_only",
  );
  const soaWorkspaces = allAssessments.filter(
    (assessment) => assessment.workspace_type === "soa_only",
  );
  const audits = auditsResult.data ?? [];
  const findings = findingsResult.data ?? [];
  const controlledActions = (actionsResult.data ?? []).filter(
    (a) => a.discipline === 5 && a.selection_status === "selected",
  );
  const openFindings = findings.filter(
    (f) => !["closed", "withdrawn"].includes(f.status),
  );
  const awaitingVerification = controlledActions.filter(
    (a) => a.effectiveness_result === "awaiting_verification",
  );
  const verifiedActions = controlledActions.filter((a) =>
    ["effective", "effective_verified"].includes(a.effectiveness_result),
  );

  const scored = [];
  for (const assessment of assessments) {
    const { data: answers, error } = await supabase
      .from("assessment_answers")
      .select("score")
      .eq("assessment_id", assessment.id)
      .eq("owner_id", user.id);
    if (error) throw new Error(error.message);
    const score = calculateSimpleOverallScore(answers ?? []);
    scored.push({ ...assessment, score });
  }
  const validScores = scored.filter((a) => a.score !== null);
  const assuranceScore = validScores.length
    ? Math.round(
        validScores.reduce((sum, a) => sum + a.score, 0) / validScores.length,
      )
    : null;
  const completionRate = controlledActions.length
    ? Math.round((verifiedActions.length / controlledActions.length) * 100)
    : 0;
  const activeAudits = audits.filter(
    (audit) => !["closed", "cancelled", "archived"].includes(audit.status),
  );
  const standardsInUse = assessmentStandards
    .map(([value, name]) => {
      const records = scored.filter((assessment) => assessment.standard === value);
      const scores = records.filter((record) => record.score !== null);
      const average = scores.length
        ? Math.round(scores.reduce((sum, record) => sum + record.score, 0) / scores.length)
        : null;
      return { value, name, count: records.length, average };
    })
    .filter((standard) => standard.count > 0);
  const workspaceTiles = [
    ["Internal Audit", "/portal/internal-audits", `${activeAudits.length} active · ${audits.length} total`, "AUD", "professional"],
    ["CAPA-8D", "/portal/rca", `${controlledActions.length} controlled actions · ${awaitingVerification.length} verification`, "8D", "professional"],
    ["Supplier Assurance", "/portal/suppliers", "Risk-based approval, due diligence, monitoring and Code of Conduct", "SUP", "professional"],
    ["Health & Safety", "/portal/health-safety", "Risk assessments, POWRA, permits and change", "H&S", "starter"],
    ["Information Security", "/portal/information-security", `${soaWorkspaces.length} SoA workspaces · risk and treatment`, "IS", "professional"],
    ["Business Continuity", "/portal/business-continuity", "Profiles, context, roles, learning and recovery", "BC", "starter"],
    ["Documents & Evidence", "/portal/documents", "Controlled documents and objective evidence", "DOC", "starter"],
    ["Training & Competence", "/portal/health-safety/training", "Purchased learning, assessments and certificates", "L&D", null],
    ["Gap Assessments", "/portal/history", `${assessments.length} assessments · ${standardsInUse.length} standards`, "GAP", null],
    ["People, Roles & Access", "/portal/company/people", "Company directory, reporting lines, illustrated functions, permissions and QR onboarding", "PPL", null],
  ];

  if (!organization)
    return (
      <main className="pdOnboarding">
        <style>{`
          *{box-sizing:border-box}.pdOnboarding{min-height:100svh;padding:clamp(16px,3vw,38px);display:grid;place-items:center;background:radial-gradient(circle at 10% 10%,#dcecff 0,transparent 34%),linear-gradient(135deg,#eef5fc,#f8fafc);color:#071d3a;font-family:Arial,sans-serif}.pdOnboardingShell{width:min(1180px,100%);min-height:min(760px,calc(100svh - 76px));display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.92fr);overflow:hidden;border:1px solid #cddcea;border-radius:30px;background:#fff;box-shadow:0 30px 80px #082a5426}.pdOnboardingForm{display:flex;flex-direction:column;justify-content:center;padding:clamp(36px,6vw,78px)}.pdOnboardingBrand{display:flex;align-items:center;gap:11px;margin-bottom:44px;color:#082a54;font-weight:950;letter-spacing:.02em}.pdOnboardingMark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#082a54;color:#fff;font-size:15px}.pdOnboardingEyebrow{color:#1762ef;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.pdOnboardingForm h1{max-width:560px;margin:10px 0 13px;font-size:clamp(38px,4.2vw,58px);line-height:1.02;letter-spacing:-.045em}.pdOnboardingLead{max-width:570px;margin:0 0 31px;color:#5b7189;font-size:17px;line-height:1.58}.pdOnboardingFields{display:grid;grid-template-columns:1fr 1fr;gap:17px}.pdOnboardingField{display:grid;gap:8px}.pdOnboardingField.full{grid-column:1/-1}.pdOnboardingField span{color:#29435f;font-size:12px;font-weight:900}.pdOnboardingField input{width:100%;min-height:54px;padding:14px 15px;border:1px solid #c7d5e3;border-radius:12px;outline:0;background:#fbfdff;color:#0a2748;font:inherit;font-size:16px;transition:.18s}.pdOnboardingField input::placeholder{color:#8b9aad}.pdOnboardingField input:focus{border-color:#1762ef;background:#fff;box-shadow:0 0 0 4px #1762ef18}.pdOnboardingActions{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:25px}.pdOnboardingActions small{max-width:270px;color:#708297;line-height:1.45}.pdOnboardingActions button{min-height:54px;padding:0 22px;border:0;border-radius:12px;background:linear-gradient(135deg,#1762ef,#0d4fc8);color:#fff;font:inherit;font-weight:950;cursor:pointer;box-shadow:0 14px 30px #1762ef35}.pdOnboardingActions button:hover{transform:translateY(-1px);box-shadow:0 17px 34px #1762ef45}.pdOnboardingVisual{position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;min-width:0;padding:48px;overflow:hidden;background:#06264d url('/images/bcp-command-centre.png') center/cover no-repeat;color:#fff}.pdOnboardingVisual:before{content:"";position:absolute;z-index:-1;inset:0;background:linear-gradient(180deg,rgba(3,25,51,.08),rgba(3,25,51,.25) 35%,rgba(3,25,51,.95))}.pdOnboardingVisual:after{content:"";position:absolute;z-index:-1;inset:0;border-left:1px solid #fff2}.pdOnboardingVisualCard{max-width:540px;padding:25px;border:1px solid #ffffff35;border-radius:20px;background:#061f40bf;backdrop-filter:blur(12px);box-shadow:0 18px 45px #00142d55}.pdOnboardingVisualCard span{color:#5ce0db;font-size:10px;font-weight:950;letter-spacing:.14em}.pdOnboardingVisualCard h2{margin:10px 0 9px;font-size:29px;line-height:1.1}.pdOnboardingVisualCard p{margin:0;color:#d5e3f2;line-height:1.55}.pdOnboardingProof{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}.pdOnboardingProof div{padding:11px;border-radius:10px;background:#ffffff10}.pdOnboardingProof strong,.pdOnboardingProof small{display:block}.pdOnboardingProof strong{color:#fff;font-size:12px}.pdOnboardingProof small{margin-top:4px;color:#aac0d8;font-size:10px;line-height:1.3}@media(max-width:900px){.pdOnboarding{padding:0;place-items:stretch}.pdOnboardingShell{min-height:100svh;grid-template-columns:1fr;border:0;border-radius:0}.pdOnboardingVisual{order:-1;min-height:280px;padding:28px;background-position:center 58%}.pdOnboardingVisualCard{max-width:620px}.pdOnboardingForm{padding:36px 28px 48px}.pdOnboardingBrand{margin-bottom:28px}.pdOnboardingForm h1{font-size:clamp(38px,8vw,52px)}}@media(max-width:560px){.pdOnboardingVisual{min-height:245px;padding:18px}.pdOnboardingVisualCard{padding:18px;border-radius:16px}.pdOnboardingVisualCard h2{font-size:23px}.pdOnboardingVisualCard p{font-size:13px}.pdOnboardingProof{display:none}.pdOnboardingForm{padding:30px 20px calc(40px + env(safe-area-inset-bottom))}.pdOnboardingBrand{margin-bottom:24px}.pdOnboardingForm h1{font-size:38px}.pdOnboardingLead{font-size:15px;margin-bottom:25px}.pdOnboardingFields{grid-template-columns:1fr;gap:14px}.pdOnboardingField.full{grid-column:auto}.pdOnboardingActions{align-items:stretch;flex-direction:column}.pdOnboardingActions small{max-width:none}.pdOnboardingActions button{width:100%}}
        `}</style>
        <section className="pdOnboardingShell">
          <form action={createOrganization} className="pdOnboardingForm">
            <div className="pdOnboardingBrand"><span className="pdOnboardingMark">RPG</span><span>RPG Excellence</span></div>
            <span className="pdOnboardingEyebrow">Controlled workspace setup</span>
            <h1>Create your organisation</h1>
            <p className="pdOnboardingLead">Build your secure assurance workspace. These details personalise your audits, assessments and executive reporting.</p>
            <div className="pdOnboardingFields">
              <label className="pdOnboardingField full"><span>Organisation name *</span><input name="name" required autoComplete="organization" placeholder="Enter your organisation name" /></label>
              <label className="pdOnboardingField"><span>Industry</span><input name="industry" placeholder="e.g. Engineering" /></label>
              <label className="pdOnboardingField"><span>Country</span><input name="country" autoComplete="country-name" placeholder="e.g. United Kingdom" /></label>
              <label className="pdOnboardingField full"><span>Number of employees</span><input name="employees" type="number" min="1" inputMode="numeric" placeholder="Enter your approximate workforce size" /></label>
            </div>
            <div className="pdOnboardingActions"><small>You can update your organisation details later from your account settings.</small><button type="submit">Create secure workspace →</button></div>
          </form>
          <aside className="pdOnboardingVisual" aria-label="RPG Excellence business continuity command centre">
            <div className="pdOnboardingVisualCard"><span>ONE CONTROLLED ASSURANCE ENVIRONMENT</span><h2>Turn obligations into visible, evidence-led control.</h2><p>Connect risks, audits, actions and business continuity decisions in a workspace built for confident leadership.</p><div className="pdOnboardingProof"><div><strong>Assess</strong><small>Know exposure</small></div><div><strong>Control</strong><small>Own action</small></div><div><strong>Improve</strong><small>Prove progress</small></div></div></div>
          </aside>
        </section>
      </main>
    );

  return (
    <main className="pdPage">
      <style>{`
    *{box-sizing:border-box}.pdPage{min-height:100vh;background:linear-gradient(135deg,#eaf2fb,#f8fafc);color:#071d3a}.pdShell{min-height:100vh;display:grid;grid-template-columns:235px 1fr}.pdSide{position:sticky;top:0;height:100vh;padding:28px 20px;background:#082a54;color:#d5e2f0;display:flex;flex-direction:column}.pdLogo{color:#fff;font-size:25px;font-weight:950;margin:0 10px 30px}.pdLogo span{font-weight:400}.pdSideNav{display:grid;gap:7px}.pdSideLink{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:10px;color:#d5e2f0;font-size:14px;font-weight:750}.pdSideLink:hover,.pdSideLink.active{background:#174e86;color:#fff}.pdSideLink i{width:12px;height:12px;border:1px solid currentColor;border-radius:3px}.pdAccount{margin-top:auto;padding:16px 12px;border-top:1px solid #ffffff20}.pdAccount strong,.pdAccount small{display:block}.pdAccount small{margin-top:4px;color:#9eb4cc;overflow:hidden;text-overflow:ellipsis}.pdSignout{margin-top:13px;width:100%;padding:10px;border:1px solid #ffffff35;border-radius:8px;background:transparent;color:#fff;font-weight:800;cursor:pointer}.pdMain{padding:28px clamp(20px,3vw,48px) 70px;min-width:0}.pdTop{display:flex;justify-content:space-between;align-items:center;gap:20px}.pdTop h1{margin:4px 0;font-size:30px}.pdTop p{margin:0;color:#687d96}.pdTopActions{display:flex;gap:10px}.pdButton{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:10px;background:#1762ef;color:#fff;font-weight:850}.pdButton.secondary{background:#fff;color:#12385f;border:1px solid #d4e0ed}.pdScoreBand{display:grid;grid-template-columns:1.2fr .8fr;gap:18px;margin-top:25px}.pdScoreCard,.pdPlanCard{border-radius:18px;padding:25px;background:#08264d;color:#fff;box-shadow:0 18px 40px #153c6818}.pdScoreCard{display:flex;justify-content:space-between;align-items:center}.pdScoreCard span,.pdPlanCard span{font-size:11px;letter-spacing:.1em;color:#9fb6d0;font-weight:900}.pdScoreCard h2{margin:7px 0 3px}.pdScoreCard strong{font-size:52px}.pdPlanCard{background:#fff;color:#071d3a;border:1px solid #dae4ef}.pdPlanCard span{color:#65809d}.pdPlanCard h2{margin:7px 0}.pdPlanCard p{margin:0;color:#6c8096}.pdMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:16px}.pdMetric{min-height:138px;padding:19px;border:1px solid #dbe5ef;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 8px 24px #12395f0a}.pdMetric:hover{border-color:#9db9dd}.pdMetric span{font-size:12px;font-weight:900;color:#536b86}.pdMetric strong{font-size:34px}.pdMetric small{color:#8090a3}.pdMetric .red{color:#d62f2f}.pdMetric .amber{color:#dd8500}.pdMetric .green{color:#07945d}.pdMetric .blue{color:#1762ef}.pdGrid{display:grid;grid-template-columns:1.35fr .65fr;gap:16px;margin-top:16px}.pdPanel{border:1px solid #dbe5ef;border-radius:16px;background:#fff;padding:22px;box-shadow:0 8px 24px #12395f0a}.pdPanelHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:17px}.pdPanelHead h2{font-size:19px;margin:0}.pdPanelHead a{color:#1762ef;font-size:13px;font-weight:800}.pdAudit{display:grid;grid-template-columns:1.5fr .9fr .75fr 80px;gap:12px;align-items:center;padding:13px 0;border-top:1px solid #ebf0f5}.pdAudit:first-of-type{border-top:0}.pdAudit strong,.pdAudit span{font-size:13px}.pdAudit small{display:block;color:#7a8da2;margin-top:3px}.pdPill{justify-self:start;padding:6px 8px;border-radius:999px;background:#edf3ff;color:#195bcd;font-size:11px!important;font-weight:850}.pdOpen{color:#1762ef;font-weight:850}.pdProgress{height:11px;border-radius:999px;background:#e6edf4;overflow:hidden;margin:18px 0 8px}.pdProgress i{display:block;height:100%;background:#10ae75}.pdProgressText{display:flex;justify-content:space-between;color:#687d96;font-size:12px}.pdQuick{display:grid;gap:10px;margin-top:17px}.pdQuick a{padding:14px;border-radius:11px;background:#f1f6fc;color:#12385f;font-weight:800}.pdCreate{margin-top:16px}.pdCreate form{display:flex;gap:10px;flex-wrap:wrap}.pdCreate select{flex:1;min-width:260px;padding:12px;border:1px solid #ccd9e7;border-radius:9px;background:#fff}.pdCreate button{border:0;cursor:pointer}.pdLocked{padding:14px;border-radius:10px;background:#fff7e7;color:#805500}.pdOnboarding{min-height:100vh;display:grid;place-items:center;background:#edf4fb}.pdOnboardingCard{width:min(520px,90vw);padding:35px;border-radius:20px;background:#fff;box-shadow:0 20px 60px #153c6820;display:grid;gap:12px}.pdOnboardingCard span{color:#1762ef;font-weight:900}.pdOnboardingCard h1{margin:0}.pdOnboardingCard p{color:#60758d}.pdOnboardingCard input{padding:13px;border:1px solid #ccd9e7;border-radius:9px}.pdOnboardingCard button{padding:13px;border:0;border-radius:9px;background:#1762ef;color:#fff;font-weight:900}@media(max-width:1050px){.pdShell{grid-template-columns:78px 1fr}.pdSide{padding:24px 10px}.pdLogo span,.pdSideLink:not(.active){font-size:0}.pdSideLink{justify-content:center}.pdSideLink.active{font-size:0}.pdAccount{display:none}.pdGrid{grid-template-columns:1fr}.pdMetrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:680px){.pdShell{display:block}.pdSide{position:static;width:100%;height:auto;display:block}.pdLogo{margin:0}.pdSideNav,.pdAccount{display:none}.pdMain{padding:22px 14px 60px}.pdTop{align-items:flex-start}.pdTopActions{display:none}.pdScoreBand{grid-template-columns:1fr}.pdMetrics{grid-template-columns:1fr 1fr}.pdAudit{grid-template-columns:1fr auto}.pdAudit>:nth-child(2),.pdAudit>:nth-child(3){display:none}.pdCreate form{display:grid}.pdCreate select{min-width:0;width:100%}}
    .pdEvidenceGroup{display:grid;gap:4px}.pdEvidenceMenu{display:grid;gap:3px;margin:0 0 5px 25px;padding-left:12px;border-left:1px solid #4b7199}.pdEvidenceMenu a{padding:7px 9px;border-radius:7px;color:#b9cbe0;font-size:12px;font-weight:700;line-height:1.25}.pdEvidenceMenu a:hover{background:#174e86;color:#fff}.pdSide{overflow-y:auto}.pdSoa{border-color:#8bdacf;background:linear-gradient(120deg,#fff,#effcf9)}.pdSoa form{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.pdSoaList{display:grid;gap:8px;margin-top:14px}.pdSoaList a{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:9px;background:#fff;border:1px solid #cfe6e2;color:#12385f;font-weight:800}
    .pdCommandHero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 315px;gap:26px;align-items:center;min-height:245px;margin-top:22px;padding:30px 32px;overflow:hidden;border:1px solid #24537d;border-radius:18px;background-image:linear-gradient(90deg,rgba(4,27,54,.98),rgba(4,35,68,.9) 42%,rgba(5,31,60,.58) 70%,rgba(4,24,49,.88)),url('/images/bcp-command-centre.png');background-size:cover;background-position:center 61%;color:#fff;box-shadow:0 16px 38px rgba(7,38,72,.17)}.pdCommandHero>div{position:relative;z-index:1;max-width:760px}.pdCommandHero>div>span{display:inline-flex;padding:6px 9px;border:1px solid #43cce055;border-radius:999px;background:#062c55cc;color:#60dfeb;font-size:10px;font-weight:900;letter-spacing:.12em}.pdCommandHero h2{max-width:710px;margin:11px 0 9px;font-size:34px;line-height:1.08;text-shadow:0 2px 12px #00172f}.pdCommandHero p{max-width:720px;margin:0;color:#d3e2ef;font-size:14px;line-height:1.58;text-shadow:0 1px 8px #00172f}.pdCommandHero aside{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;border:1px solid #7edff255;border-radius:13px;background:rgba(4,29,57,.8);backdrop-filter:blur(7px)}.pdCommandHero aside article{padding:10px;border-radius:9px;background:#ffffff0d}.pdCommandHero aside strong,.pdCommandHero aside span{display:block}.pdCommandHero aside strong{font-size:25px}.pdCommandHero aside span{margin-top:3px;color:#c8d9e8;font-size:10px;line-height:1.25}.pdCommandMetrics{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:12px}.pdCommandMetrics .pdMetric{min-height:116px;padding:15px}.pdCommandMetrics .pdMetric strong{font-size:25px}.pdWorkspaceSection{margin-top:22px}.pdWorkspaceSection>header{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:11px}.pdWorkspaceSection>header small,.pdAttention .pdPanelHead small,.pdCoverage .pdPanelHead small{color:#315fe6;font-size:10px;font-weight:950;letter-spacing:.12em}.pdWorkspaceSection>header h2,.pdAttention .pdPanelHead h2,.pdCoverage .pdPanelHead h2{margin:5px 0 0;font-size:20px}.pdWorkspaceSection>header>span{color:#687d96;font-size:11px}.pdWorkspaceGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.pdWorkspaceGrid>a{display:grid;grid-template-columns:44px minmax(0,1fr);gap:11px;min-height:122px;padding:17px;border:1px solid #d7e2ed;border-radius:13px;background:#fff;box-shadow:0 8px 24px #12395f0a}.pdWorkspaceGrid>a:hover{border-color:#8cafe1;transform:translateY(-1px)}.pdWorkspaceGrid>a>b{display:grid;place-items:center;width:44px;height:44px;border-radius:11px;background:#eaf1ff;color:#315fe6;font-size:11px}.pdWorkspaceGrid strong,.pdWorkspaceGrid p,.pdWorkspaceGrid span{display:block}.pdWorkspaceGrid strong{font-size:14px}.pdWorkspaceGrid p{min-height:31px;margin:5px 0;color:#687d96;font-size:10px;line-height:1.4}.pdWorkspaceGrid span{color:#1762ef;font-size:10px;font-weight:850}.pdCommandLower{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;margin-top:14px}.pdAttention>.pdPanelHead,.pdCoverage>.pdPanelHead{align-items:end}.pdAttention>a{display:grid;grid-template-columns:70px minmax(0,1fr) 60px;gap:11px;align-items:center;padding:13px 0;border-top:1px solid #e3eaf1}.pdAttention>a>b{justify-self:start;padding:6px 8px;border-radius:999px;font-size:10px}.pdAttention>a>b.critical{background:#ffe8e5;color:#b42318}.pdAttention>a>b.warning{background:#fff0ce;color:#8a5800}.pdAttention>a>b.information{background:#e7efff;color:#245cca}.pdAttention>a strong,.pdAttention>a small{display:block}.pdAttention>a strong{font-size:12px}.pdAttention>a small{margin-top:4px;color:#70859a;font-size:10px}.pdAttention>a>span{color:#1762ef;font-size:10px;font-weight:850}.pdCoverage>a:not(.pdPlanLine){display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #e3eaf1}.pdCoverage>a strong,.pdCoverage>a small{display:block}.pdCoverage>a strong{font-size:11px}.pdCoverage>a small{margin-top:3px;color:#70859a;font-size:9px}.pdCoverage>a>span{color:#315fe6;font-size:10px;font-weight:850}.pdPlanLine{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:11px;border-radius:9px;background:#f2f6fb}.pdPlanLine span,.pdPlanLine small{font-size:10px}.pdPlanLine span{font-weight:850}.pdClear{padding:15px;border:1px dashed #c9d7e4;border-radius:9px;background:#f8fbfe;color:#687d96;font-size:11px}@media(max-width:1250px){.pdCommandMetrics{grid-template-columns:repeat(3,1fr)}.pdWorkspaceGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:850px){.pdCommandHero{grid-template-columns:1fr}.pdCommandLower{grid-template-columns:1fr}}@media(max-width:680px){.pdCommandHero{min-height:360px;padding:23px;background-position:58% center}.pdCommandMetrics{grid-template-columns:repeat(2,1fr)}.pdWorkspaceSection>header{display:block}.pdWorkspaceSection>header>span{display:block;margin-top:5px}.pdWorkspaceGrid{grid-template-columns:1fr}.pdAttention>a{grid-template-columns:65px minmax(0,1fr)}.pdAttention>a>span{display:none}}
    .pdWorkspaceGrid>a.locked{background:#f6f8fb;color:#60748a}.pdWorkspaceGrid>a.locked>b{background:#e8edf4;color:#73869a}.pdWorkspaceGrid>a.locked span{color:#8a5a00}
  `}</style>
      <style>{`@media(max-width:900px){.pdShell{display:block}.pdSide{position:static;width:100%;height:auto;display:block;padding:16px 20px}.pdLogo{margin:0}.pdSideNav,.pdAccount{display:none}.pdMain{padding:22px 14px 60px}.pdTop{align-items:flex-start}.pdTopActions{display:none}}`}</style>
      <div className="pdShell">
        <aside className="pdSide">
          <div className="pdLogo">
            RPG <span>Excellence</span>
          </div>
          <nav className="pdSideNav">
            <SideLink href="/portal" active>
              Dashboard
            </SideLink>
            <div className="pdEvidenceGroup">
              <SideLink href="/portal/history">Assessments</SideLink>
              <div className="pdEvidenceMenu" aria-label="Gap analysis views">
                <Link href="/portal/history">Gap Analysis Register</Link>
                <Link href="/portal/history?view=management-board">
                  Gap Analysis Board
                </Link>
                <Link href="/portal/history?view=in-progress">In Progress</Link>
                <Link href="/portal/history?view=completed">Completed</Link>
              </div>
            </div>
            <div className="pdEvidenceGroup">
              <SideLink href="/portal/information-security">Information Security</SideLink>
              <div className="pdEvidenceMenu" aria-label="Information security hub">
                <Link href="/portal/information-security">ISMS Dashboard</Link>
                <Link href="/portal/information-security/risk-management">Risk Management</Link>
                <Link href="/portal/soa">Statement of Applicability</Link>
                <Link href="/portal/soa/management-board">Management Board</Link>
              </div>
            </div>
            <SideLink href="/portal/internal-audits">Internal Audits</SideLink>
            <SideLink href="/portal/internal-audit-actions">
              Findings & Actions
            </SideLink>
            <SideLink href="/portal/suppliers">Supplier Assurance</SideLink>
            <div className="pdEvidenceGroup">
              <SideLink href="/portal/rca">CAPA-8D</SideLink>
              <div className="pdEvidenceMenu" aria-label="CAPA-8D views">
                <Link href="/portal/rca">CAPA-8D Register</Link>
                <Link href="/portal/rca?view=management-board">
                  CAPA Management Board
                </Link>
                <Link href="/portal/rca?view=open">Open Cases</Link>
                <Link href="/portal/rca?view=verification">
                  Awaiting Verification
                </Link>
                <Link href="/portal/rca?view=closed">Closed Cases</Link>
              </div>
            </div>
        <div className="pdEvidenceGroup">
          <SideLink href="/portal/health-safety">
            Health &amp; Safety Hub
              </SideLink>
              <div
                className="pdEvidenceMenu"
                aria-label="Health and safety hub"
              >
                <Link href="/portal/health-safety">H&amp;S Dashboard</Link>
                <Link href="/portal/health-safety/risk-assessment">
                  Risk Assessments
                </Link>
                <Link href="/portal/health-safety/powra">POWRA</Link>
                <Link href="/portal/health-safety/permits">Permit to Work</Link>
                <Link href="/portal/health-safety/moc">
                  Management of Change
                </Link>
                <Link href="/portal/health-safety/actions">Risk Actions</Link>
                <Link href="/portal/health-safety/training">My Training</Link>
            <Link href="/portal/health-safety/training/certificates">
              My Certificates
            </Link>
          </div>
        </div>
        <div className="pdEvidenceGroup">
          <SideLink href="/portal/business-continuity">
            Business Continuity
          </SideLink>
          <div
            className="pdEvidenceMenu"
            aria-label="Business continuity planning hub"
          >
            <Link href="/portal/business-continuity">BCP Dashboard</Link>
            <Link href="/portal/business-continuity/site-profile">
              Site Profile
            </Link>
            <Link href="/portal/business-continuity/training">
              Learning Path
            </Link>
            <Link href="/portal?standard=ISO%2022301%3A2019#new-assessment">
              ISO 22301 Assessment
            </Link>
          </div>
        </div>
        <div className="pdEvidenceGroup">
              <SideLink href="/portal/documents">Evidence</SideLink>
              <div className="pdEvidenceMenu" aria-label="Document families">
                <Link href="/portal/documents?family=ISO%209001%3A2015%2FAmd%201%3A2024">
                  ISO 9001
                </Link>
                <Link href="/portal/documents?family=ISO%2014001%3A2026">
                  ISO 14001
                </Link>
                <Link href="/portal/documents?family=ISO%2045001%3A2018">
                  ISO 45001
                </Link>
                <Link href="/portal/documents?family=ISO%2022301%3A2019">
                  ISO 22301
                </Link>
                <Link href="/portal/documents?family=ISO%2FIEC%2027001%3A2022">
                  ISO 27001
                </Link>
                <Link href="/portal/documents?family=ISO%2FIEC%2017024%3A2026">
                  ISO/IEC 17024
                </Link>
                <Link href="/portal/documents?family=RCA%20%26%20CAPA">
                  RCA–CAPA
                </Link>
                <Link href="/portal/documents?family=Internal%20Audit">
                  Internal Audit
                </Link>
              </div>
            </div>
            <SideLink href="/portal/company/people">People, Roles &amp; Access</SideLink>
            <SideLink href="/portal/reports">Reports</SideLink>
          </nav>
          <div className="pdAccount">
            <strong>{organization.name}</strong>
            <small>{user.email}</small>
            <form action="/auth/signout" method="post">
              <button className="pdSignout">Sign out</button>
            </form>
          </div>
        </aside>
        <div className="pdMain">
          <header className="pdTop">
            <div>
              <small>INTEGRATED ASSURANCE COMMAND CENTRE</small>
              <h1>Welcome to RPG Excellence</h1>
              <p>
                {organization.name}
                {organization.industry ? ` · ${organization.industry}` : ""}
              </p>
            </div>
            <div className="pdTopActions">
              <Link href="/portal/reports" className="pdButton secondary">
                View reports
              </Link>
              <Link href="#new-assessment" className="pdButton">
                + Start assessment
              </Link>
            </div>
          </header>
          <section className="pdCommandHero">
            <div>
              <span>EXECUTIVE ASSURANCE POSITION</span>
              <h2>Know what matters. Act where assurance is weakest.</h2>
              <p>One controlled view across quality, environment, OH&amp;S, information security, business continuity, audits, corrective action and competence.</p>
            </div>
            <aside>
              <article><strong>{completionRate}%</strong><span>actions verified effective</span></article>
              <article><strong>{openFindings.length}</strong><span>open findings</span></article>
              <article><strong>{activeAudits.length}</strong><span>active audits</span></article>
              <article><strong>{standardsInUse.length}</strong><span>standards assessed</span></article>
            </aside>
          </section>
          <section className="pdCommandMetrics">
            <Metric label="Assurance health" value={maturity(assuranceScore)} detail={assuranceScore===null?"No scored assessments":`${assuranceScore}% portfolio readiness`} href="/portal/history" />
            <Metric label="Active audits" value={activeAudits.length} detail={`${audits.length} audit records`} href="/portal/internal-audits" />
            <Metric label="Open findings" value={openFindings.length} detail="Requiring controlled action" tone="red" href="/portal/internal-audit-actions" />
            <Metric label="Awaiting verification" value={awaitingVerification.length} detail="Auditor decision outstanding" tone="amber" href="/portal/rca?view=verification" />
            <Metric label="Verified effective" value={verifiedActions.length} detail={`${completionRate}% of selected actions`} tone="green" href="/portal/rca" />
            <Metric label="Assessment portfolio" value={assessments.length} detail={`${standardsInUse.length} standards represented`} href="/portal/history" />
          </section>
          <section className="pdWorkspaceSection">
            <header><div><small>INTEGRATED WORKSPACES</small><h2>Your assurance workspaces</h2></div><span>Each tile opens its live management board</span></header>
            <div className="pdWorkspaceGrid">{workspaceTiles.map(([title,href,detail,code,requiredPlan])=>{const locked=requiredPlan&&!hasPlanAccess(subscription,requiredPlan);return <Link className={locked?"locked":""} href={locked?`/en/pricing?upgrade=${requiredPlan}&feature=${encodeURIComponent(title)}#subscriptions`:href} key={title}><b>{locked?"LOCK":code}</b><div><strong>{title}</strong><p>{detail}</p><span>{locked?`${requiredPlan[0].toUpperCase()+requiredPlan.slice(1)} plan required →`:"Open workspace →"}</span></div></Link>})}</div>
          </section>
          <section className="pdCommandLower">
            <div className="pdPanel pdAttention">
              <div className="pdPanelHead"><div><small>PRIORITISED ACTION</small><h2>Requires your attention</h2></div><Link href="/portal/internal-audit-actions">Open action centre →</Link></div>
              {openFindings.length>0&&<Link href="/portal/internal-audit-actions"><b className="critical">Priority</b><div><strong>{openFindings.length} open finding{openFindings.length===1?"":"s"} require controlled action</strong><small>Internal Audit · Findings &amp; Actions</small></div><span>Review →</span></Link>}
              {awaitingVerification.length>0&&<Link href="/portal/rca?view=verification"><b className="warning">Verify</b><div><strong>{awaitingVerification.length} corrective action{awaitingVerification.length===1?" is":"s are"} awaiting effectiveness verification</strong><small>CAPA-8D · Auditor decision required</small></div><span>Review →</span></Link>}
              {activeAudits.length>0&&<Link href="/portal/internal-audits"><b className="information">Audit</b><div><strong>{activeAudits.length} active internal audit{activeAudits.length===1?"":"s"}</strong><small>Review programme status and assigned work</small></div><span>Open →</span></Link>}
              {!openFindings.length&&!awaitingVerification.length&&!activeAudits.length&&<p className="pdClear">No priority assurance actions are currently identified.</p>}
            </div>
            <div className="pdPanel pdCoverage">
              <div className="pdPanelHead"><div><small>CUSTOMER-SELECTED SCOPE</small><h2>Standards coverage</h2></div><Link href="/portal/history">View all →</Link></div>
              {standardsInUse.length?standardsInUse.map((standard)=><Link href={`/portal/history?standard=${encodeURIComponent(standard.value)}`} key={standard.value}><div><strong>{standard.name.split(" — ")[0]}</strong><small>{standard.name.split(" — ")[1]}</small></div><span>{standard.average===null?"Not scored":`${standard.average}%`} · {standard.count}</span></Link>):<p className="pdClear">Start an assessment to establish standards coverage.</p>}
              <Link href={subscription?"/portal/billing":"/en/pricing"} className="pdPlanLine"><span>{getPlanLabel(subscription?.plan)} plan</span><small>{subscription?.status==="active"?"Active subscription":subscription?.status==="trialing"?"Free trial":"No active subscription"}</small></Link>
            </div>
          </section>
          <section className="pdPanel pdCreate" id="new-assessment">
            <div className="pdPanelHead">
              <div>
                <h2>Start a new assessment</h2>
                <p style={{ margin: "5px 0 0", color: "#687d96" }}>
                  Measure management-system readiness and generate an executive
                  report.
                </p>
              </div>
            </div>
            {canUsePaidFeatures ? (
              <form action={createAssessment}>
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <select
                  name="standard"
                  required
                  defaultValue={
                    allowedStandards.some(
                      ([value]) => value === requestedStandard,
                    )
                      ? requestedStandard
                      : ""
                  }
                >
                  <option value="" disabled>
                    Select ISO standard
                  </option>
                  {allowedStandards.map(([value, name]) => (
                    <option value={value} key={value}>
                      {name}
                    </option>
                  ))}
                </select>
                <button className="pdButton">Start assessment →</button>
              </form>
            ) : (
              <div className="pdLocked">
                A subscription or unused single-assessment pass is required.{" "}
                <Link href="/en/pricing">
                  <strong>View access options →</strong>
                </Link>
              </div>
            )}
          </section>
          <section className="pdPanel pdCreate pdSoa" id="standalone-soa">
            <div className="pdPanelHead">
              <div>
                <h2>Statement of Applicability</h2>
                <p style={{ margin: "5px 0 0", color: "#687d96" }}>
                  A dedicated ISO/IEC 27001 SoA workspace covering all 93 Annex
                  A controls.
                </p>
              </div>
              <Link href="/portal/soa">Open SoA register →</Link>
            </div>
            {(hasActiveSubscription(subscription) ||
              standaloneSoaPasses.length > 0) && (
              <form action={createStandaloneSoa}>
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <button className="pdButton">Create standalone SoA →</button>
                {standaloneSoaPasses.length > 0 && (
                  <small style={{ color: "#39736b", fontWeight: 800 }}>
                    {standaloneSoaPasses.length} purchased workspace
                    {standaloneSoaPasses.length === 1 ? "" : "s"} available
                  </small>
                )}
              </form>
            )}
            {!hasActiveSubscription(subscription) &&
              standaloneSoaPasses.length === 0 && (
                <div className="pdLocked">
                  Purchase standalone access for £129.{" "}
                  <Link href="/en/pricing">
                    <strong>View SoA offer →</strong>
                  </Link>
                </div>
              )}
            {soaWorkspaces.length > 0 && (
              <div className="pdSoaList">
                {soaWorkspaces.slice(0, 3).map((workspace) => (
                  <Link
                    href={`/portal/assessments/${workspace.id}/soa`}
                    key={workspace.id}
                  >
                    <span>ISO/IEC 27001 Statement of Applicability</span>
                    <span>{label(workspace.status)} →</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
