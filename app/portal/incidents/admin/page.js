import Link from "next/link";
import {
  incidentContext,
  loadIncidentRegister,
  checkResult,
} from "../../../../lib/incidents";
import { IncidentHeader, dateTime } from "../../../../components/IncidentUI";
export default async function IncidentAdmin() {
  const c = await incidentContext();
  if (!c.incidentAdministrator)
    return (
      <>
        <IncidentHeader
          title="Incident administration"
          description="Restricted administration"
        />
        <p className="incidentNotice">
          An owner / Super Administrator must grant Incident module Admin access
          and an active Accident / Incident Administrator authorisation.
        </p>
      </>
    );
  const reports = await loadIncidentRegister(c);
  const queue = reports.filter((r) => r.status === "reported");
  const overdue = reports.filter(
    (r) =>
      r.regulatory_decision === "required" &&
      !r.regulatory_reported_at &&
      r.regulatory_due_at &&
      new Date(r.regulatory_due_at) < new Date(),
  );
  return (
    <>
      <IncidentHeader
        title="Incident administration"
        description="Own triage, resources, escalation and verified learning across safety, quality, environment, security and continuity."
        admin
      />
      <section className="incidentCard">
        <h2>Administration shortcuts</h2>
        <nav className="incidentNav">
          <Link href="/portal/company/sites">
            Site Profiles, Buildings & Zones
          </Link>
          <Link href="/portal/company/people">People, Roles & Access</Link>
          <Link href="/portal/tasks?module=incident">
            Incident tasks & approvals
          </Link>
        </nav>
        <p>
          Public reporting requires a published zone within an active site. Its
          QR code remains valid when internal area information requires company
          sign-in.
        </p>
      </section>
      <section className="incidentCard">
        <h2>Awaiting triage · {queue.length}</h2>
        {queue.map((r) => (
          <p key={r.id}>
            <Link href={"/portal/incidents/" + r.id}>
              <strong>{r.reference}</strong> · {r.title}
            </Link>
            <br />
            {r.location_label} · {r.reported_criticality} · received{" "}
            {dateTime(r.created_at)}
          </p>
        ))}
        {!queue.length && <p>No reports waiting for triage.</p>}
      </section>
      <section className="incidentCard">
        <h2>External reporting deadlines overdue · {overdue.length}</h2>
        {overdue.map((r) => (
          <p key={r.id}>
            <Link href={"/portal/incidents/" + r.id}>
              {r.reference} ·{" "}
              {r.regulatory_authority || "Authority not specified"}
            </Link>{" "}
            · due {dateTime(r.regulatory_due_at)}
          </p>
        ))}
        <p className="incidentMuted">
          This is a review queue. No authority, emergency service or manager is
          notified automatically.
        </p>
      </section>
      <section className="incidentCard">
        <h2>Roles & responsibilities</h2>
        <div className="incidentTableWrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Responsibility</th>
                <th>Access required</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Owner / Super Administrator",
                  "Configure access and independent roles; retain organisational accountability.",
                  "Existing owner / active Super Administrator",
                ],
                [
                  "Accident / Incident Administrator",
                  "Triage, determine priorities, appoint teams, allocate / reallocate budget, time and equipment; decide CAPA / ISMS handoff and controlled reporter updates.",
                  "Incidents Admin + active Accident / Incident Administrator function",
                ],
                [
                  "Investigator",
                  "Establish facts, actual and potential consequences, causes and lessons.",
                  "Incidents Create / edit or higher; assigned investigator",
                ],
                [
                  "Action owner / responder",
                  "Implement the allocated task and submit objective completion evidence.",
                  "Incidents Create / edit or higher; assigned owner and case team",
                ],
                [
                  "Independent action verifier",
                  "Challenge evidence and effectiveness; return inadequate actions.",
                  "Incidents Create / edit or higher; assigned verifier and case team; different from implementer",
                ],
                [
                  "Independent case verifier",
                  "Verify investigation, reporting decisions and completed linked cases before closure.",
                  "Incidents Review or higher; assigned case verifier; different from investigator",
                ],
                [
                  "Security Incident Lead",
                  "Assess confidentiality, integrity, availability and privacy; lead specialist ISMS response.",
                  "Incident access plus Information Security access or active Security Incident Lead function",
                ],
                [
                  "Continuity Coordinator",
                  "Assess affected services, recovery objectives, suppliers and plan activation; coordinate recovery tasks.",
                  "Incident scope and assigned team; existing continuity module authority for plan decisions",
                ],
                [
                  "Reporter",
                  "Describe observations and immediate action; optionally leave contact details or use a private progress key.",
                  "No account for published area QR reporting",
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Use People, Roles & Access to grant module permissions and
          professional functions. For assigned-record scopes, add action owners
          and verifiers to the response team. Security reports remain
          additionally restricted.
        </p>
      </section>
      <section className="incidentCard">
        <h2>Response model</h2>
        <p>
          A single report can affect several disciplines without creating
          separate disconnected submissions. Actual harm and credible potential
          harm are scored separately, so a serious near miss receives attention
          even where no injury occurred. Confirmed location signals feed
          workplace inspection planning; security and continuity handoffs remain
          controlled human decisions.
        </p>
        <p className="incidentMuted">
          There is no automatic legal classification, emergency dispatch,
          external messaging, medical record service or promise of untraceable
          reporting. Review retention, secure evidence handling and local
          response cover before enabling live reporting.
        </p>
      </section>
    </>
  );
}
