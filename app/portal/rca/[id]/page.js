import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import {
  addCauseHypothesis,
  addCorrectiveAction,
  addTeamMember,
  saveCaseOverview,
  saveDiscipline,
} from "./actions";

const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cfdae8",
  borderRadius: "10px",
  background: "white",
  color: "#061a35",
  padding: "13px 14px",
  font: "inherit",
};

export default async function RcaCasePage({
  params,
  searchParams,
}) {
  const { id } = await params;
  const query = await searchParams;
  const selected = Math.min(
    8,
    Math.max(0, Number(query?.d ?? 0) || 0)
  );
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const [
    caseResult,
    disciplinesResult,
    teamResult,
    causesResult,
    actionsResult,
  ] = await Promise.all([
    supabase
      .from("rca_cases")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("rca_8d_disciplines")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("discipline"),
    supabase
      .from("rca_team_members")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("rca_causes")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at"),
    supabase
      .from("rca_actions")
      .select("*")
      .eq("case_id", id)
      .eq("owner_id", user.id)
      .order("created_at"),
  ]);

  if (caseResult.error) throw new Error(caseResult.error.message);
  if (!caseResult.data) notFound();
  for (const result of [
    disciplinesResult,
    teamResult,
    causesResult,
    actionsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rcaCase = caseResult.data;
  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", rcaCase.organization_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (organizationError) {
    throw new Error(organizationError.message);
  }
  const disciplines = disciplinesResult.data ?? [];
  const team = teamResult.data ?? [];
  const causes = causesResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const discipline = disciplines.find(
    (item) => item.discipline === selected
  );
  const approvedCount = disciplines.filter(
    (item) => item.status === "approved"
  ).length;
  const openActions = actions.filter(
    (item) => !["verified", "cancelled"].includes(item.status)
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fa",
        color: "#061a35",
        padding: "42px 22px 80px",
      }}
    >
      <div style={{ maxWidth: "1500px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#155eef",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {rcaCase.case_reference} · 8D Investigation
            </div>
            <h1
              style={{
                margin: "8px 0",
                fontSize: "clamp(30px, 5vw, 48px)",
              }}
            >
              {rcaCase.title}
            </h1>
            <div style={{ color: "#607089" }}>
              {organization?.name ?? "Organisation"} · {label(rcaCase.source_type)} · {label(rcaCase.severity)}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/portal/rca" style={linkButton}>
              ← 8D Command Centre
            </Link>
          </div>
        </div>

        <section
          style={{
            marginTop: "26px",
            background: "#061a35",
            color: "white",
            borderRadius: "22px",
            padding: "26px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "18px",
          }}
        >
          {[
            ["Current gate", `D${rcaCase.current_discipline}`],
            ["Disciplines approved", `${approvedCount}/9`],
            ["Cause hypotheses", causes.length],
            ["Open actions", openActions],
          ].map(([title, value]) => (
            <div key={title}>
              <div
                style={{
                  color: "#9fb2cb",
                  textTransform: "uppercase",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {title}
              </div>
              <strong
                style={{
                  display: "block",
                  marginTop: "7px",
                  fontSize: "30px",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "22px",
            marginTop: "24px",
          }}
        >
          <aside>
            <div
              style={{
                background: "white",
                border: "1px solid #dce4ee",
                borderRadius: "18px",
                padding: "14px",
                display: "grid",
                gap: "8px",
              }}
            >
              {disciplines.map((item) => {
                const active = item.discipline === selected;
                return (
                  <Link
                    key={item.id}
                    href={`/portal/rca/${id}?d=${item.discipline}`}
                    style={{
                      padding: "13px",
                      borderRadius: "12px",
                      textDecoration: "none",
                      color: active ? "white" : "#061a35",
                      background: active ? "#155eef" : "#f6f8fb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        fontWeight: 800,
                      }}
                    >
                      <span>D{item.discipline}</span>
                      <span>{item.status === "approved" ? "✓" : ""}</span>
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <div style={{ minWidth: 0 }}>
            {discipline && (
              <section style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "18px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#155eef",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "13px",
                      }}
                    >
                      Discipline D{selected}
                    </div>
                    <h2 style={{ margin: "6px 0" }}>
                      {discipline.title}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: "#607089",
                        lineHeight: 1.6,
                        maxWidth: "900px",
                      }}
                    >
                      {discipline.objective}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      background:
                        discipline.status === "approved"
                          ? "#e8f8ef"
                          : "#eef4ff",
                      color:
                        discipline.status === "approved"
                          ? "#067647"
                          : "#175cd3",
                      fontWeight: 800,
                    }}
                  >
                    {label(discipline.status)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    padding: "18px",
                    borderRadius: "14px",
                    background: "#eef4ff",
                    color: "#274c7a",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>AI Evidence Challenge</strong>
                  <div style={{ marginTop: "5px" }}>
                    The assistant will challenge assumptions,
                    identify missing evidence and propose tests. It
                    cannot approve this gate or convert a hypothesis
                    into a validated cause.
                  </div>
                </div>

                <form action={saveDiscipline}>
                  <input type="hidden" name="case_id" value={id} />
                  <input type="hidden" name="discipline" value={selected} />
                  <label
                    style={{
                      display: "block",
                      marginTop: "20px",
                      fontWeight: 800,
                    }}
                  >
                    Evidence, analysis and conclusion
                  </label>
                  <textarea
                    name="narrative"
                    rows={10}
                    defaultValue={discipline.narrative ?? ""}
                    placeholder="Record verified facts, evidence reviewed, analysis performed, decisions made and unresolved uncertainty."
                    style={{
                      ...fieldStyle,
                      marginTop: "8px",
                      resize: "vertical",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "14px",
                    }}
                  >
                    <button name="intent" value="save" style={primaryButton}>
                      Save Progress
                    </button>
                    <button name="intent" value="review" style={secondaryButton}>
                      Ready for Review
                    </button>
                    {discipline.status !== "approved" && (
                      <button name="intent" value="approve" style={approveButton}>
                        Human Approve D{selected}
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {selected === 0 && (
              <section style={cardStyle}>
                <h2>Case control</h2>
                <form action={saveCaseOverview}>
                  <input type="hidden" name="case_id" value={id} />
                  <input name="title" defaultValue={rcaCase.title} required style={fieldStyle} />
                  <textarea
                    name="problem_statement"
                    rows={5}
                    defaultValue={rcaCase.problem_statement ?? ""}
                    placeholder="Initial known facts"
                    style={{ ...fieldStyle, marginTop: "12px" }}
                  />
                  <div style={formGrid}>
                    <input name="sponsor_name" defaultValue={rcaCase.sponsor_name ?? ""} placeholder="Sponsor" style={fieldStyle} />
                    <input name="leader_name" defaultValue={rcaCase.leader_name ?? ""} placeholder="8D leader" style={fieldStyle} />
                    <input name="customer_or_stakeholder" defaultValue={rcaCase.customer_or_stakeholder ?? ""} placeholder="Customer / stakeholder" style={fieldStyle} />
                    <input name="product_service_process" defaultValue={rcaCase.product_service_process ?? ""} placeholder="Product / service / process" style={fieldStyle} />
                    <input name="location" defaultValue={rcaCase.location ?? ""} placeholder="Location" style={fieldStyle} />
                    <input type="date" name="target_close_date" defaultValue={rcaCase.target_close_date ?? ""} style={fieldStyle} />
                  </div>
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Save Case Control
                  </button>
                </form>
              </section>
            )}

            {selected === 1 && (
              <section style={cardStyle}>
                <h2>Cross-functional team</h2>
                <div style={{ display: "grid", gap: "10px" }}>
                  {team.map((member) => (
                    <div key={member.id} style={itemStyle}>
                      <strong>{member.member_name}</strong>
                      <span style={{ color: "#607089" }}>
                        {member.role_title || "Team member"}
                        {member.expertise ? ` · ${member.expertise}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <form action={addTeamMember} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <div style={formGrid}>
                    <input name="member_name" required placeholder="Member name" style={fieldStyle} />
                    <input name="role_title" placeholder="Role" style={fieldStyle} />
                    <input name="expertise" placeholder="Relevant expertise" style={fieldStyle} />
                    <input name="responsibility" placeholder="8D responsibility" style={fieldStyle} />
                  </div>
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Team Member
                  </button>
                </form>
              </section>
            )}

            {selected === 4 && (
              <section style={cardStyle}>
                <h2>Cause architecture</h2>
                <p style={{ color: "#607089" }}>
                  Record occurrence, escape and systemic causes separately. A plausible cause is not a validated cause.
                </p>
                <div style={{ display: "grid", gap: "10px" }}>
                  {causes.map((cause) => (
                    <div key={cause.id} style={itemStyle}>
                      <div>
                        <strong>{label(cause.cause_type)} cause</strong>
                        <div style={{ marginTop: "5px" }}>{cause.statement}</div>
                      </div>
                      <span style={{ color: "#607089" }}>{label(cause.status)}</span>
                    </div>
                  ))}
                </div>
                <form action={addCauseHypothesis} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <div style={formGrid}>
                    <select name="cause_type" defaultValue="occurrence" style={fieldStyle}>
                      <option value="occurrence">Occurrence cause</option>
                      <option value="escape">Escape cause</option>
                      <option value="systemic">Systemic cause</option>
                      <option value="contributing">Contributing factor</option>
                    </select>
                    <select name="fishbone_category" defaultValue="process" style={fieldStyle}>
                      <option value="people">People</option>
                      <option value="process">Process</option>
                      <option value="equipment">Equipment</option>
                      <option value="material">Material</option>
                      <option value="measurement">Measurement</option>
                      <option value="environment">Environment</option>
                      <option value="management">Management</option>
                    </select>
                  </div>
                  <textarea name="statement" required rows={3} placeholder="Testable cause hypothesis" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <div style={formGrid}>
                    <textarea name="evidence_for" rows={3} placeholder="Evidence supporting" style={fieldStyle} />
                    <textarea name="evidence_against" rows={3} placeholder="Evidence against / missing" style={fieldStyle} />
                  </div>
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Cause Hypothesis
                  </button>
                </form>
              </section>
            )}

            {[3, 5, 6, 7].includes(selected) && (
              <section style={cardStyle}>
                <h2>Containment and corrective actions</h2>
                <div style={{ display: "grid", gap: "10px" }}>
                  {actions.map((action) => (
                    <div key={action.id} style={itemStyle}>
                      <div>
                        <strong>{action.title}</strong>
                        <div style={{ color: "#607089", marginTop: "4px" }}>
                          {label(action.action_type)} · {action.action_owner || "Unassigned"}
                        </div>
                      </div>
                      <span>{label(action.status)}</span>
                    </div>
                  ))}
                </div>
                <form action={addCorrectiveAction} style={{ marginTop: "16px" }}>
                  <input type="hidden" name="case_id" value={id} />
                  <div style={formGrid}>
                    <select name="action_type" defaultValue={selected === 3 ? "containment" : "corrective"} style={fieldStyle}>
                      <option value="containment">Containment</option>
                      <option value="correction">Correction</option>
                      <option value="corrective">Corrective action</option>
                      <option value="preventive">Preventive action</option>
                      <option value="systemic">Systemic action</option>
                    </select>
                    <select name="cause_id" defaultValue="" style={fieldStyle}>
                      <option value="">No linked cause yet</option>
                      {causes.map((cause) => (
                        <option value={cause.id} key={cause.id}>
                          {label(cause.cause_type)}: {cause.statement}
                        </option>
                      ))}
                    </select>
                    <input name="action_owner" placeholder="Action owner" style={fieldStyle} />
                    <input type="date" name="due_date" style={fieldStyle} />
                  </div>
                  <input name="action_title" required placeholder="Action title" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <textarea name="description" rows={3} placeholder="What will change?" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <textarea name="effectiveness_criteria" rows={3} placeholder="Define measurable effectiveness criteria before implementation" style={{ ...fieldStyle, marginTop: "12px" }} />
                  <button style={{ ...primaryButton, marginTop: "14px" }}>
                    Add Controlled Action
                  </button>
                </form>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const cardStyle = {
  background: "white",
  border: "1px solid #dce4ee",
  borderRadius: "18px",
  padding: "24px",
  marginBottom: "18px",
};

const itemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "12px",
  background: "#f6f8fb",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const primaryButton = {
  border: 0,
  borderRadius: "10px",
  background: "#155eef",
  color: "white",
  padding: "13px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#e9eff8",
  color: "#173a68",
};

const approveButton = {
  ...primaryButton,
  background: "#067647",
};

const linkButton = {
  padding: "13px 16px",
  border: "1px solid #d5deea",
  borderRadius: "10px",
  color: "#061a35",
  background: "white",
  fontWeight: 800,
  textDecoration: "none",
};
