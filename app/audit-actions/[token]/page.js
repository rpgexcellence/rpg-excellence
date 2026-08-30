import { createHash } from "node:crypto";
import { createAdminClient } from "../../../lib/supabase/admin";
import { submitExternal8DDiscipline } from "./actions";

export const dynamic = "force-dynamic";

const DISCIPLINES = [
  [0, "Prepare and protect", "Record the immediate correction, protective action, initial risk and why the response is proportionate."],
  [1, "Establish the team", "Identify the 8D leader, team members, relevant competence, authority and responsibilities."],
  [2, "Define the problem", "Describe what, where, when, who, how many and the extent. Compare the actual condition with the requirement."],
  [3, "Develop interim containment", "Define containment actions, owners, dates and evidence demonstrating containment effectiveness."],
  [4, "Determine and validate root causes", "Address occurrence cause, escape/detection cause and systemic cause. Record evidence validating each cause."],
  [5, "Select permanent corrective actions", "Link actions to validated causes, assign owners and dates, assess risk and define effectiveness criteria."],
  [6, "Implement and validate corrective actions", "Record implementation evidence, completion dates, deviations, results and initial validation."],
  [7, "Prevent recurrence", "Document systemic changes, horizontal deployment, updated controls, competence and lessons learned."],
  [8, "Recognise and close", "Summarise sustained-effectiveness evidence, remaining risk, recognition and the proposed closure rationale."],
];

export default async function AuditActionOwnerPage({ params, searchParams }) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: access, error } = await supabase
    .from("internal_audit_action_access")
    .select("*")
    .eq("secure_token_hash", tokenHash)
    .gt("secure_token_expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`Secure action lookup failed: ${error.message}`);
  }

  if (!access) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#eef4fb",
          color: "#061a35",
          fontFamily: "Arial,sans-serif",
        }}
      >
        <section
          style={{
            maxWidth: 650,
            padding: 32,
            border: "1px solid #d5e1ed",
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 15px 35px #061a3510",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            This secure action link is invalid or has expired
          </h1>
          <p>
            Ask the lead auditor to generate a new action-owner link from the
            audit’s Actions tab. For security, expired and replaced links cannot
            be reopened.
          </p>
        </section>
      </main>
    );
  }

  const [findingResult, auditResult] = await Promise.all([
    supabase
      .from("internal_audit_findings")
      .select(
        "finding_reference, finding_type, risk_level, title, failure_statement, criteria, objective_evidence, process_area, agreed_date"
      )
      .eq("id", access.finding_id)
      .maybeSingle(),

    supabase
      .from("internal_audits")
      .select("audit_reference, title")
      .eq("id", access.audit_id)
      .maybeSingle(),
  ]);

  if (findingResult.error) {
    throw new Error(
      `Assigned finding lookup failed: ${findingResult.error.message}`
    );
  }

  if (auditResult.error) {
    throw new Error(
      `Assigned audit lookup failed: ${auditResult.error.message}`
    );
  }

  if (!findingResult.data || !auditResult.data) {
    throw new Error(
      "The secure assignment exists but its controlled audit record is unavailable."
    );
  }

  const finding = findingResult.data;
  const audit = auditResult.data;

  if (!access.rca_case_id) {
    throw new Error(
      "The assigned nonconformity is not linked to a controlled 8D case."
    );
  }

  const [caseResult, disciplinesResult, evidenceResult] = await Promise.all([
    supabase
      .from("rca_cases")
      .select(
        "id, case_reference, status, current_discipline, target_close_date"
      )
      .eq("id", access.rca_case_id)
      .maybeSingle(),

    supabase
      .from("rca_8d_disciplines")
      .select(
        "discipline, narrative, status, completion_score, approved_at"
      )
      .eq("case_id", access.rca_case_id)
      .order("discipline"),

    supabase
      .from("internal_audit_action_evidence")
      .select(
        "id, discipline, original_file_name, evidence_description, created_at"
      )
      .eq("action_access_id", access.id)
      .order("created_at"),
  ]);

  if (caseResult.error || !caseResult.data) {
    throw new Error(
      `Linked 8D lookup failed: ${
        caseResult.error?.message || "case not found"
      }`
    );
  }

  if (disciplinesResult.error) {
    throw new Error(
      `8D discipline lookup failed: ${disciplinesResult.error.message}`
    );
  }

  if (evidenceResult.error) {
    throw new Error(
      `8D evidence lookup failed: ${evidenceResult.error.message}`
    );
  }

  const rcaCase = caseResult.data;

  const disciplineByNumber = new Map(
    (disciplinesResult.data || []).map((item) => [
      item.discipline,
      item,
    ])
  );

  const evidenceByDiscipline = new Map();

  for (const item of evidenceResult.data || []) {
    const current = evidenceByDiscipline.get(item.discipline) || [];
    current.push(item);
    evidenceByDiscipline.set(item.discipline, current);
  }

  return (
    <main className="ownerPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .ownerPage {
          min-height: 100vh;
          padding: 32px 18px 70px;
          background: #eef4fb;
          color: #061a35;
          font-family: Arial, sans-serif;
        }

        .ownerShell {
          max-width: 1050px;
          margin: auto;
        }

        .ownerHead {
          padding: 30px;
          border-radius: 22px;
          background: linear-gradient(125deg, #061a35, #0b4477);
          color: #fff;
        }

        .ownerHead small {
          color: #63e2dd;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .ownerHead h1 {
          margin: 8px 0;
        }

        .ownerHead p {
          margin: 0;
          color: #d5e3f2;
        }

        .notice {
          margin: 18px 0;
          padding: 15px 18px;
          border-radius: 12px;
          background: #e8f8ef;
          color: #07613a;
          font-weight: 800;
        }

        .notice.error {
          background: #fff1e2;
          color: #844800;
        }

        .card {
          margin-top: 18px;
          padding: 24px;
          border: 1px solid #d5e1ed;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 15px 35px #061a3510;
        }

        .locked {
          border-left: 5px solid #1761e8;
        }

        .locked h2 {
          margin: 6px 0;
        }

        .meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 18px;
        }

        .meta div {
          padding: 13px;
          border-radius: 10px;
          background: #f3f7fb;
        }

        .meta b,
        .meta span {
          display: block;
        }

        .meta span {
          margin-top: 5px;
          color: #60758d;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field span {
          font-size: 13px;
          font-weight: 850;
        }

        .field textarea,
        .field input {
          width: 100%;
          min-height: 48px;
          padding: 12px;
          border: 1px solid #cbd8e6;
          border-radius: 10px;
          font: inherit;
        }

        .field textarea {
          min-height: 150px;
          resize: vertical;
        }

        .wide {
          grid-column: 1 / -1;
        }

        .button {
          margin-top: 18px;
          min-height: 48px;
          padding: 0 20px;
          border: 0;
          border-radius: 10px;
          background: #1761e8;
          color: #fff;
          font: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .control {
          margin-top: 18px;
          padding: 14px;
          border-radius: 12px;
          background: #fff8e7;
          color: #6a4c08;
          line-height: 1.5;
        }

        .stageList {
          display: grid;
          gap: 3px;
        }

        .stage {
          border-left: 5px solid #9aabc0;
        }

        .stage.active {
          border-left-color: #1761e8;
        }

        .stage.approved {
          border-left-color: #07824d;
          background: #fbfffd;
        }

        .stage.lockedStage {
          opacity: 0.65;
          background: #f5f7fa;
        }

        .stageTop {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
        }

        .stageTop small {
          color: #1761e8;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .stageTop h2 {
          margin: 5px 0 6px;
        }

        .stageTop p {
          margin: 0;
          color: #60758d;
          line-height: 1.5;
        }

        .stageBadge {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eaf1ff;
          color: #1557c8;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .approved .stageBadge {
          background: #e8f8ef;
          color: #087447;
        }

        .evidenceList {
          display: grid;
          gap: 5px;
          margin-top: 14px;
          padding: 13px;
          border-radius: 10px;
          background: #f3f7fb;
        }

        .evidenceList span {
          display: block;
          color: #526a84;
        }

        .stageNarrative {
          margin-top: 16px;
          padding: 14px;
          border-radius: 11px;
          background: #f3f7fb;
          line-height: 1.5;
        }

        @media (max-width: 700px) {
          .grid,
          .meta {
            grid-template-columns: 1fr;
          }

          .wide {
            grid-column: auto;
          }

          .stageTop {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="ownerShell">
        <header className="ownerHead">
          <small>Restricted corrective-action workspace</small>
          <h1>{audit?.title || "Internal audit action"}</h1>
          <p>
            {audit?.audit_reference} · Assigned to {access.assignee_name} ·
            Link expires{" "}
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "medium",
            }).format(new Date(access.secure_token_expires_at))}
          </p>
        </header>

        {query?.submitted ? (
          <div className="notice">
            Response submitted successfully. The auditor will review it and may
            accept it or return it for revision.
          </div>
        ) : null}

        {query?.error === "incomplete" ? (
          <div className="notice error">
            Complete correction/containment, root cause, corrective-action plan
            and effectiveness measure before submitting.
          </div>
        ) : null}

        {query?.error === "file_size" ? (
          <div className="notice error">
            The evidence file exceeds the 10 MB limit.
          </div>
        ) : null}

        <section className="card locked">
          <small>Auditor-controlled record — read only</small>

          <h2>
            {finding?.finding_reference} · {finding?.title}
          </h2>

          <div className="meta">
            <div>
              <b>Classification</b>
              <span>{finding?.finding_type?.replaceAll("_", " ")}</span>
            </div>

            <div>
              <b>Risk</b>
              <span>{finding?.risk_level}</span>
            </div>

            <div>
              <b>Process</b>
              <span>{finding?.process_area || "—"}</span>
            </div>
          </div>

          <h3>Statement of nonconformity</h3>
          <p>{finding?.failure_statement}</p>

          <h3>Requirement</h3>
          <p>{finding?.criteria}</p>

          <h3>Objective evidence</h3>
          <p>{finding?.objective_evidence}</p>
        </section>

        <section className="card">
          <div className="stageTop">
            <div>
              <small>Linked controlled investigation</small>
              <h2>{rcaCase.case_reference} · D0–D8 response</h2>
              <p>
                Current authorised discipline: D
                {rcaCase.current_discipline || 0} · Case status:{" "}
                {rcaCase.status?.replaceAll("_", " ")}
              </p>
            </div>

            <span className="stageBadge">
              {finding?.finding_type === "major_nc"
                ? "Full 8D required"
                : "Proportionate 8D"}
            </span>
          </div>

          <div className="control">
            <strong>Governance:</strong> submit one discipline at a time. The
            auditor reviews and approves the stage in the controlled CAPA–8D
            case. Later stages remain locked until preceding disciplines are
            approved.
          </div>
        </section>

        <div className="stageList">
          {DISCIPLINES.map(([number, title, guidance]) => {
            const stage = disciplineByNumber.get(number);
            const stageEvidence = evidenceByDiscipline.get(number) || [];
            const approved = stage?.status === "approved";
            const unlocked =
              number <= Number(rcaCase.current_discipline || 0);
            const selected =
              String(query?.d || "") === String(number);

            return (
              <section
                className={`card stage ${
                  approved
                    ? "approved"
                    : unlocked
                      ? "active"
                      : "lockedStage"
                }`}
                id={`d${number}`}
                key={number}
              >
                <div className="stageTop">
                  <div>
                    <small>D{number}</small>
                    <h2>{title}</h2>
                    <p>{guidance}</p>
                  </div>

                  <span className="stageBadge">
                    {approved
                      ? "Approved"
                      : stage?.status === "ready_for_review"
                        ? "Awaiting auditor review"
                        : unlocked
                          ? "Open"
                          : "Locked"}
                  </span>
                </div>

                {query?.submitted === String(number) ? (
                  <div className="notice">
                    D{number} submitted successfully for auditor review.
                  </div>
                ) : null}

                {selected && query?.error === "narrative" ? (
                  <div className="notice error">
                    Complete the D{number} response before submitting.
                  </div>
                ) : null}

                {selected && query?.error === "locked" ? (
                  <div className="notice error">
                    D{number} is locked until the preceding disciplines are
                    approved by the auditor.
                  </div>
                ) : null}

                {selected && query?.error === "approved" ? (
                  <div className="notice error">
                    D{number} is already approved and cannot be changed by the
                    action owner.
                  </div>
                ) : null}

                {unlocked && !approved ? (
                  <form action={submitExternal8DDiscipline}>
                    <input type="hidden" name="token" value={token} />
                    <input
                      type="hidden"
                      name="discipline"
                      value={number}
                    />

                    <label className="field">
                      <span>D{number} documented response *</span>
                      <textarea
                        name="narrative"
                        required
                        defaultValue={stage?.narrative || ""}
                        placeholder={guidance}
                      />
                    </label>

                    <div className="grid" style={{ marginTop: 14 }}>
                      <label className="field">
                        <span>D{number} supporting evidence</span>
                        <input
                          type="file"
                          name="evidence_file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx"
                        />
                      </label>

                      <label className="field">
                        <span>Evidence description</span>
                        <input name="evidence_description" />
                      </label>
                    </div>

                    {stageEvidence.length ? (
                      <div className="evidenceList">
                        <strong>Evidence submitted:</strong>

                        {stageEvidence.map((item) => (
                          <span key={item.id}>
                            {item.original_file_name}
                            {item.evidence_description
                              ? ` — ${item.evidence_description}`
                              : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <button className="button">
                      Submit D{number} for Auditor Review
                    </button>
                  </form>
                ) : (
                  <div className="stageNarrative">
                    <strong>
                      {approved
                        ? "Approved response"
                        : "Stage not yet available"}
                    </strong>

                    {stage?.narrative ? <p>{stage.narrative}</p> : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="card">
          <div className="control">
            <strong>Closure authority:</strong> completing D8 does not close the
            nonconformity. The auditor must independently verify implementation
            and sustained effectiveness before closing the NC and audit.
          </div>
        </section>
      </div>
    </main>
  );
}
