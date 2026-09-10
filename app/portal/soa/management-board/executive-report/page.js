import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { generateSoaBoardGuidedDraft, saveSoaBoardExecutiveReport } from "./actions";
import { loadSoaBoardReportData } from "./report-data";

export const metadata = { title: "SoA Board Executive Report | RPG Intelligence" };
export const dynamic = "force-dynamic";

const field = { width: "100%", padding: "11px 12px", border: "1px solid #c8d6e3", borderRadius: "8px", background: "#fff", color: "#071a33", font: "inherit" };

function Metric({ title, value, detail, tone = "blue" }) {
  return <div className={`reportMetric ${tone}`}><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export default async function SoaBoardExecutiveReport({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login?next=/portal/soa/management-board/executive-report");

  const { data: organisations, error: organisationError } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("created_at");

  if (organisationError) throw new Error(organisationError.message);
  if (!organisations?.length) redirect("/portal");

  const requestedOrganisation = typeof query?.organization === "string" ? query.organization : "";
  const selectedOrganisation = organisations.find((item) => item.id === requestedOrganisation) ?? organisations[0];
  const admin = createAdminClient();
  const data = await loadSoaBoardReportData(admin, user.id, selectedOrganisation.id);
  const { metrics, report, generated, topRisks, ready } = data;
  const reference = report?.report_reference || `SOA-MB-${new Date().toISOString().slice(0, 7).replace("-", "")}-${selectedOrganisation.id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const value = (saved, fallback) => saved || fallback;

  return <main className="soaExecutivePage"><style>{`
    *{box-sizing:border-box}.soaExecutivePage{min-height:100vh;padding:32px 20px 72px;background:#edf3f8;color:#071a33;font-family:Arial,sans-serif}.reportShell{max-width:1280px;margin:auto}.reportTop{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}.reportTop>div:first-child>span{color:#0b8e81;font-size:11px;font-weight:950;letter-spacing:.11em}.reportTop h1{margin:7px 0;font-size:34px}.reportTop p{margin:0;color:#62778e}.reportActions{display:flex;gap:9px;flex-wrap:wrap}.reportButton{display:inline-flex;align-items:center;justify-content:center;padding:11px 15px;border:1px solid #cbd9e5;border-radius:9px;background:#fff;color:#071a33;text-decoration:none;font-weight:850;cursor:pointer}.reportButton.primary{border-color:#1459d9;background:#1459d9;color:#fff}.reportButton.dark{border-color:#071a33;background:#071a33;color:#fff}.reportNotice{margin-top:18px;padding:13px 15px;border:1px solid #b9dfcc;border-radius:10px;background:#edf8f3;color:#12613f;font-weight:800}.reportFilter{display:flex;gap:10px;align-items:end;margin-top:18px;padding:15px;border:1px solid #d7e2eb;border-radius:13px;background:#fff}.reportFilter label{display:grid;gap:6px;flex:1;font-size:12px;font-weight:850}.reportFilter select{padding:11px;border:1px solid #c8d6e3;border-radius:8px;background:#fff}.reportHero{display:flex;justify-content:space-between;gap:20px;align-items:center;margin:14px 0;padding:26px 28px;border-radius:18px;background:linear-gradient(115deg,#061d3b,#075f6d);color:#fff}.reportHero h2{margin:0 0 7px}.reportHero p{margin:0;color:#cce1e7}.reportHero strong{font-size:45px}.reportMetrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.reportMetric{min-height:120px;padding:17px;border:1px solid #d7e2eb;border-top:4px solid #1762ef;border-radius:13px;background:#fff}.reportMetric.red{border-top-color:#b42318}.reportMetric.amber{border-top-color:#e1a514}.reportMetric.green{border-top-color:#169363}.reportMetric span,.reportMetric strong,.reportMetric small{display:block}.reportMetric span{color:#667d93;font-size:11px;font-weight:900}.reportMetric strong{font-size:30px;margin:8px 0 5px}.reportMetric small{color:#74889a}.reportPanel{margin-top:14px;border:1px solid #d7e2eb;border-radius:15px;background:#fff;overflow:hidden}.reportPanelHead{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:20px 22px;border-bottom:1px solid #e0e8ef}.reportPanelHead h2{margin:5px 0}.reportPanelHead p{margin:0;color:#62778e}.guidedForm{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.guidedForm label{display:flex;gap:7px;align-items:center;font-size:13px;font-weight:800}.reportForm{padding:22px}.reportGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.reportField{display:grid;gap:7px;color:#203b5d;font-size:13px;font-weight:850}.reportField.full{grid-column:1/-1}.reportField textarea{min-height:125px;resize:vertical}.riskTable{width:100%;border-collapse:collapse}.riskTable th,.riskTable td{padding:11px;text-align:left;border-bottom:1px solid #e0e8ef;font-size:13px}.riskTable th{color:#61778d;font-size:11px;text-transform:uppercase}.riskTable td:last-child{font-weight:900}.riskEmpty{padding:20px;color:#61778d}@media(max-width:900px){.reportMetrics{grid-template-columns:repeat(2,1fr)}.reportGrid{grid-template-columns:1fr}.reportField.full{grid-column:auto}.reportPanelHead{align-items:flex-start;flex-direction:column}}@media(max-width:620px){.reportMetrics{grid-template-columns:1fr 1fr}.reportHero{display:block}.reportFilter{display:grid}.reportTop h1{font-size:28px}}
  `}</style><div className="reportShell">
    <header className="reportTop"><div><span>RPG INTELLIGENCE · DYNAMIC MANAGEMENT REPORT</span><h1>SoA Board Executive Report</h1><p>Live portfolio assurance, residual-risk exposure and controlled management conclusion.</p></div><div className="reportActions"><Link href="/portal/soa/management-board" className="reportButton">← Management Board</Link><a href={`/portal/soa/management-board/executive-report/pdf?organization=${encodeURIComponent(selectedOrganisation.id)}`} target="_blank" rel="noreferrer" className="reportButton dark">Preview / Download PDF</a></div></header>

    {(query?.saved || query?.generated) && <div className="reportNotice">{query.generated ? "Guided SoA Board report draft created. Review and take ownership before approval." : "Controlled SoA Board Executive Report saved."}</div>}

    <form className="reportFilter"><label>Organisation<select name="organization" defaultValue={selectedOrganisation.id}>{organisations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button className="reportButton primary">Load report</button></form>

    <section className="reportHero"><div><h2>{ready ? "Portfolio positioned for approval" : "Management attention required"}</h2><p>{metrics.approvedRegisters} of {metrics.soaCount} SoA records approved · {metrics.decided} of {metrics.total} control decisions complete</p></div><strong>{metrics.decisionCompletion}%</strong></section>

    <section className="reportMetrics"><Metric title="SoA approval" value={`${metrics.approvedRegisters}/${metrics.soaCount}`} detail="Controlled records approved" tone="green"/><Metric title="Implementation" value={`${metrics.implementationRate}%`} detail={`${metrics.effective} controls concluded effective`} tone="green"/><Metric title="High / Critical" value={metrics.elevated} detail={`${metrics.critical} Critical residual risks`} tone={metrics.elevated ? "red" : "green"}/><Metric title="Overdue actions" value={metrics.overdue} detail="Treatment target date passed" tone={metrics.overdue ? "red" : "green"}/><Metric title="Open findings" value={metrics.openFindings} detail="Formal follow-up required" tone={metrics.openFindings ? "red" : "green"}/><Metric title="Risk ownership gaps" value={metrics.unassigned} detail="Moderate-or-higher without owner" tone={metrics.unassigned ? "amber" : "green"}/><Metric title="Mapped risks" value={metrics.mapped} detail={`${metrics.total - metrics.mapped} control records unmapped`}/><Metric title="Treatment decisions" value={metrics.treatment} detail={`${metrics.accepted} formally accepted`} tone="amber"/></section>

    <section className="reportPanel"><div className="reportPanelHead"><div><span>GUIDED CONTENT ENGINE</span><h2>Dynamic executive narrative</h2><p>Generate from current SoA data, then review, edit and take ownership of the conclusion.</p></div><form action={generateSoaBoardGuidedDraft} className="guidedForm"><input type="hidden" name="organization_id" value={selectedOrganisation.id}/><label><input type="checkbox" name="replace_existing"/> Replace existing narrative</label><button className="reportButton primary">Build Guided Draft</button></form></div>
      <form action={saveSoaBoardExecutiveReport} className="reportForm"><input type="hidden" name="organization_id" value={selectedOrganisation.id}/><div className="reportGrid">
        <label className="reportField">Report reference<input name="report_reference" defaultValue={reference} style={field} required/></label>
        <label className="reportField">Confidentiality<select name="report_confidentiality" defaultValue={report?.report_confidentiality || "Internal"} style={field}><option>Internal</option><option>Confidential</option><option>Restricted</option><option>Client controlled</option></select></label>
        <label className="reportField">Report status<select name="report_status" defaultValue={report?.report_status || "draft"} style={field}><option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="issued">Issued</option></select></label>
        <label className="reportField">Prepared by<input name="prepared_by" defaultValue={report?.prepared_by || user.email || ""} style={field} required/></label>
        <label className="reportField full">Executive summary<textarea name="executive_summary" defaultValue={value(report?.executive_summary, generated.executiveSummary)} style={field} required/></label>
        <label className="reportField full">Portfolio scope<textarea name="portfolio_scope" defaultValue={value(report?.portfolio_scope, generated.portfolioScope)} style={field} required/></label>
        <label className="reportField full">Methodology and sampling<textarea name="methodology_and_sampling" defaultValue={value(report?.methodology_and_sampling, generated.methodology)} style={field}/></label>
        <label className="reportField full">Principal residual risks<textarea name="principal_risks" defaultValue={value(report?.principal_risks, generated.principalRisks)} style={field}/></label>
        <label className="reportField full">Risk-treatment priorities<textarea name="treatment_priorities" defaultValue={value(report?.treatment_priorities, generated.treatmentPriorities)} style={field}/></label>
        <label className="reportField full">Limitations and exclusions<textarea name="limitations_and_exclusions" defaultValue={value(report?.limitations_and_exclusions, generated.limitations)} style={field}/></label>
        <label className="reportField full">Overall management conclusion<textarea name="overall_conclusion" defaultValue={value(report?.overall_conclusion, generated.conclusion)} style={field} required/></label>
        <label className="reportField">Reviewed by<input name="reviewed_by" defaultValue={report?.reviewed_by || ""} style={field}/></label>
        <label className="reportField">Approved by<input name="approved_by" defaultValue={report?.approved_by || ""} style={field}/></label>
      </div><button className="reportButton primary" style={{marginTop:17}}>Save controlled report</button></form>
    </section>

    <section className="reportPanel"><div className="reportPanelHead"><div><span>MANAGEMENT PRIORITIES</span><h2>Highest residual-risk controls</h2><p>The ten highest High or Critical risks included in the dynamic report.</p></div></div>{topRisks.length ? <table className="riskTable"><thead><tr><th>Control</th><th>Title</th><th>Theme</th><th>Owner</th><th>Target</th><th>Risk</th></tr></thead><tbody>{topRisks.map((risk) => <tr key={`${risk.controlId}-${risk.score}`}><td>A.{risk.controlId}</td><td>{risk.title}</td><td>{risk.theme}</td><td>{risk.owner}</td><td>{risk.targetDate}</td><td>{risk.level} · {risk.score}</td></tr>)}</tbody></table> : <p className="riskEmpty">No High or Critical residual risks are recorded.</p>}</section>
  </div></main>;
}
