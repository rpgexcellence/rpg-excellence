import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";

const DISCIPLINE_NAMES = [
  "Prepare and Protect",
  "Establish the Team",
  "Define the Problem",
  "Contain the Problem",
  "Determine and Validate Root Causes",
  "Select Permanent Corrective Actions",
  "Implement and Validate Corrective Actions",
  "Prevent Recurrence",
  "Recognise and Close",
];

const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const money = (value, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value || 0));

export default async function RcaExecutiveSummary({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const [caseResult, disciplinesResult, causesResult, actionsResult, costsResult] =
    await Promise.all([
      supabase.from("rca_cases").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
      supabase.from("rca_8d_disciplines").select("*").eq("case_id", id).eq("owner_id", user.id).order("discipline"),
      supabase.from("rca_causes").select("*").eq("case_id", id).eq("owner_id", user.id).order("created_at"),
      supabase.from("rca_actions").select("*").eq("case_id", id).eq("owner_id", user.id).order("created_at"),
      supabase.from("rca_cost_entries").select("*").eq("case_id", id).eq("owner_id", user.id).order("discipline"),
    ]);

  if (caseResult.error) throw new Error(caseResult.error.message);
  if (!caseResult.data) notFound();
  for (const result of [disciplinesResult, causesResult, actionsResult, costsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rcaCase = caseResult.data;
  const disciplines = disciplinesResult.data ?? [];
  const causes = causesResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const costs = costsResult.data ?? [];
  const validatedCauses = causes.filter((cause) => cause.status === "validated");
  const selectedActions = actions.filter(
    (action) => action.selection_status === "selected" || ["in_progress", "completed", "verified"].includes(action.status)
  );
  const openActions = actions.filter(
    (action) => !["verified", "cancelled"].includes(action.status)
  );
  const approvedCount = disciplines.filter((discipline) => discipline.status === "approved").length;
  const costTotals = costs.reduce((totals, entry) => {
    const currency = entry.currency || "GBP";
    totals[currency] = (totals[currency] || 0) + Number(entry.amount || 0);
    return totals;
  }, {});
  const confirmedTotals = costs
    .filter((entry) => entry.cost_status === "confirmed")
    .reduce((totals, entry) => {
      const currency = entry.currency || "GBP";
      totals[currency] = (totals[currency] || 0) + Number(entry.amount || 0);
      return totals;
    }, {});

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: "1450px", margin: "0 auto" }}>
        <header style={headerStyle}>
          <div>
            <img src="/rpg-excellence-logo.png" alt="RPG Excellence" style={logoStyle} />
            <div style={kickerStyle}>RCA Executive Summary</div>
            <h1 style={{ margin: "8px 0", fontSize: "clamp(30px, 5vw, 48px)" }}>{rcaCase.title}</h1>
            <div style={{ color: "#607089" }}>
              {rcaCase.case_reference} · {label(rcaCase.source_type)} · {label(rcaCase.severity)}
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Link href={`/portal/rca/${id}`} style={secondaryLinkStyle}>← Investigation</Link>
            <a href={`/portal/rca/${id}/report`} style={primaryLinkStyle}>Download PDF</a>
          </div>
        </header>

        <section style={heroStyle}>
          <div>
            <div style={heroLabelStyle}>Current position</div>
            <strong style={{ fontSize: "34px" }}>D{rcaCase.current_discipline} · {DISCIPLINE_NAMES[rcaCase.current_discipline]}</strong>
            <div style={{ marginTop: "8px", color: "#b9c8dc" }}>{approvedCount}/9 disciplines approved</div>
          </div>
          <div>
            <div style={heroLabelStyle}>Open actions</div>
            <strong style={{ fontSize: "44px" }}>{openActions.length}</strong>
          </div>
          <div>
            <div style={heroLabelStyle}>Validated causes</div>
            <strong style={{ fontSize: "44px" }}>{validatedCauses.length}</strong>
          </div>
          <div>
            <div style={heroLabelStyle}>Recorded COPQ</div>
            <strong style={{ fontSize: "25px" }}>
              {Object.keys(costTotals).length
                ? Object.entries(costTotals).map(([currency, total]) => money(total, currency)).join(" · ")
                : "Not recorded"}
            </strong>
          </div>
        </section>

        <div style={twoColumnStyle}>
          <section style={cardStyle}>
            <div style={kickerStyle}>Executive context</div>
            <h2>Problem and business impact</h2>
            <SummaryText value={rcaCase.problem_statement} fallback="Problem statement not yet recorded." />
            <dl style={definitionGridStyle}>
              <Fact term="Customer / stakeholder" value={rcaCase.customer_or_stakeholder} />
              <Fact term="Product / service / process" value={rcaCase.product_service_process} />
              <Fact term="Location" value={rcaCase.location} />
              <Fact term="Target closure" value={rcaCase.target_close_date} />
              <Fact term="Sponsor" value={rcaCase.sponsor_name} />
              <Fact term="8D leader" value={rcaCase.leader_name} />
            </dl>
          </section>

          <section style={cardStyle}>
            <div style={kickerStyle}>Management attention</div>
            <h2>Current decisions and exposure</h2>
            <ul style={listStyle}>
              <li>{openActions.length} action{openActions.length === 1 ? " remains" : "s remain"} open or awaiting verification.</li>
              <li>{causes.filter((cause) => cause.status === "hypothesis").length} cause hypothesis/hypotheses remain unvalidated.</li>
              <li>{disciplines.filter((item) => item.status === "ready_for_review").length} discipline(s) await human approval.</li>
              <li>{costs.length} Cost of Poor Quality entr{costs.length === 1 ? "y" : "ies"} recorded.</li>
            </ul>
          </section>
        </div>

        <section style={cardStyle}>
          <div style={kickerStyle}>Root-cause conclusion</div>
          <h2>Validated causal architecture</h2>
          {validatedCauses.length ? (
            <div style={threeColumnStyle}>
              {["occurrence", "escape", "systemic"].map((type) => (
                <div key={type} style={subCardStyle}>
                  <strong>{label(type)} cause</strong>
                  {validatedCauses.filter((cause) => cause.cause_type === type).map((cause) => (
                    <div key={cause.id} style={{ marginTop: "12px", lineHeight: 1.55 }}>
                      {cause.profile_code && (
                        <div style={{ color: "#155eef", fontWeight: 900 }}>
                          {cause.profile_code} — {cause.profile_title}
                        </div>
                      )}
                      <p style={{ margin: "4px 0" }}>{cause.statement}</p>
                      {cause.profile_rationale && <small style={{ color: "#607089" }}>{cause.profile_rationale}</small>}
                    </div>
                  ))}
                  {!validatedCauses.some((cause) => cause.cause_type === type) && (
                    <p style={{ color: "#607089" }}>Not yet validated.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyText>No causes have been validated.</EmptyText>
          )}
        </section>

        <section style={cardStyle}>
          <div style={kickerStyle}>Corrective action</div>
          <h2>Selected actions and status</h2>
          {selectedActions.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th>Effectiveness measure</th></tr></thead>
                <tbody>
                  {selectedActions.map((action) => (
                    <tr key={action.id}>
                      <td>{action.title}</td><td>{action.action_owner || "Unassigned"}</td>
                      <td>{action.due_date || "Not set"}</td><td>{label(action.status)}</td>
                      <td>{action.effectiveness_criteria || "Not defined"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyText>No permanent corrective actions have been selected.</EmptyText>}
        </section>

        <section style={cardStyle}>
          <div style={kickerStyle}>Cost of Poor Quality</div>
          <h2>Financial impact by discipline</h2>
          <p style={{ color: "#607089" }}>
            Optional management estimate. Confirmed totals: {Object.keys(confirmedTotals).length
              ? Object.entries(confirmedTotals).map(([currency, total]) => money(total, currency)).join(" · ")
              : "none confirmed"}.
          </p>
          {costs.length ? (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead><tr><th>Stage</th><th>Category</th><th>Description</th><th>Basis</th><th>Status</th><th>Amount</th></tr></thead>
                <tbody>
                  {costs.map((entry) => (
                    <tr key={entry.id}>
                      <td>D{entry.discipline}</td><td>{label(entry.cost_category)}</td><td>{entry.description}</td>
                      <td>{entry.quantity} × {money(entry.unit_cost, entry.currency)}</td>
                      <td>{label(entry.cost_status)}</td><td>{money(entry.amount, entry.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyText>No Cost of Poor Quality data has been recorded. This does not prevent RCA completion.</EmptyText>}
        </section>

        <section style={cardStyle}>
          <div style={kickerStyle}>8D progress</div>
          <h2>Stage conclusions</h2>
          <div style={stageGridStyle}>
            {disciplines.map((item) => (
              <div key={item.id} style={subCardStyle}>
                <strong>D{item.discipline} · {DISCIPLINE_NAMES[item.discipline]}</strong>
                <div style={{ marginTop: "5px", color: item.status === "approved" ? "#067647" : "#607089", fontWeight: 800 }}>
                  {label(item.status)}
                </div>
                {item.narrative && <p style={{ lineHeight: 1.55 }}>{item.narrative}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryText({ value, fallback }) {
  return <p style={{ color: value ? "#253a58" : "#607089", lineHeight: 1.65 }}>{value || fallback}</p>;
}

function Fact({ term, value }) {
  return <div><dt style={{ color: "#607089", fontSize: "13px" }}>{term}</dt><dd style={{ margin: "5px 0 0", fontWeight: 800 }}>{value || "Not recorded"}</dd></div>;
}

function EmptyText({ children }) {
  return <div style={{ padding: "18px", borderRadius: "12px", background: "#f7f9fc", color: "#607089" }}>{children}</div>;
}

const pageStyle = { minHeight: "100vh", background: "#f3f6fa", color: "#061a35", padding: "42px 22px 80px" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" };
const logoStyle = { width: "260px", height: "70px", objectFit: "contain", objectPosition: "left center", marginBottom: "20px" };
const kickerStyle = { color: "#155eef", fontWeight: 800, textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.04em" };
const buttonRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };
const secondaryLinkStyle = { padding: "12px 16px", borderRadius: "10px", border: "1px solid #cfdae8", background: "white", color: "#061a35", fontWeight: 800, textDecoration: "none" };
const primaryLinkStyle = { ...secondaryLinkStyle, background: "#061a35", borderColor: "#061a35", color: "white" };
const heroStyle = { margin: "26px 0", padding: "26px", borderRadius: "22px", background: "#061a35", color: "white", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" };
const heroLabelStyle = { color: "#9fb2cb", textTransform: "uppercase", fontSize: "12px", fontWeight: 800, marginBottom: "8px" };
const cardStyle = { marginBottom: "18px", padding: "24px", borderRadius: "18px", border: "1px solid #dce4ee", background: "white" };
const subCardStyle = { padding: "17px", borderRadius: "13px", border: "1px solid #dce4ee", background: "#f8fafc" };
const twoColumnStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "18px" };
const threeColumnStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" };
const stageGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" };
const definitionGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px", marginTop: "22px" };
const listStyle = { lineHeight: 1.75, paddingLeft: "22px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
