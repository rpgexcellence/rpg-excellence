import { requestOpen, requestTable } from "../../../../../../lib/permit-subcontractor.mjs";
import { requestSubcontractorInformation, revokeSubcontractorRequest } from "./actions";

const messages = {
  sent: "RPG sent the request to the named recipient.",
  revoked: "The request was revoked.",
  active: "Revoke the existing request before sending a replacement.",
  "delivery-failed": "RPG could not confirm email delivery. The request was revoked.",
  "delivery-uncertain": "RPG could not confirm email delivery or revocation. Check the pending request before trying again.",
  "draft-required": "Send requests while the permit is in Draft.",
  "email-required": "Enter a valid business email address.",
  unavailable: "RPG could not complete the request.",
};
const formatDate = value => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London",
}).format(new Date(value));

export default async function SubcontractorRequests({ admin, permit, feedback }) {
  const { data, error } = await admin.from(requestTable)
    .select("id,recipient_email,requested_at,expires_at,revoked_at,submitted_at,permit_updated_at,company,work_lead,telephone,method_summary")
    .eq("permit_id", permit.id).order("requested_at", { ascending: false }).limit(10);

  if (error) return permit.status === "draft" ? (
    <section id="subcontractor" className="pcPanel">
      <h2>Subcontractor information</h2><p>Information requests are currently unavailable.</p>
    </section>
  ) : null;

  const requests = data ?? [];
  const pending = requests.find(row => !row.revoked_at && !row.submitted_at);
  if (permit.status !== "draft" && !requests.length) return null;

  return <section id="subcontractor" className="pcPanel">
    <h2>Subcontractor information</h2>
    <p>The recipient signs in with the named business email and submits information for review. Permit verification, acceptance and issue are separate actions.</p>
    {typeof feedback === "string" && Object.hasOwn(messages, feedback) && <p role="status">{messages[feedback]}</p>}
    {permit.status === "draft" && !pending && <form className="pcAction" action={requestSubcontractorInformation.bind(null, permit.id)}>
      <label>Verified subcontractor business email<input name="email" type="email" maxLength={254} required /></label>
      <div>
        <strong>Shared job details</strong>
        <p>{permit.permit_reference} · {permit.task_description}</p>
        {permit.scope_limits && <p>{permit.scope_limits}</p>}
      </div>
      <p>Check the recipient address and shared scope. The link expires after three days or when the draft changes.</p>
      <button type="submit" className="pcButton">Send subcontractor request</button>
    </form>}
    {requests.map(row => {
      const current = requestOpen(row, permit);
      const status = row.submitted_at ? "Submitted for review" : row.revoked_at ? "Revoked" : current ? "Awaiting submission" : "Link unavailable";
      return <div className="pcRecord" style={{ marginTop: 10 }} key={row.id}>
        <strong>{status}</strong>
        <p>{row.recipient_email} · Requested {formatDate(row.requested_at)}{current && ` · Expires ${formatDate(row.expires_at)}`}</p>
        {row.id === pending?.id && <form action={revokeSubcontractorRequest.bind(null, permit.id, row.id)}>
          <button type="submit" className="pcButton red">Revoke request</button>
        </form>}
        {row.submitted_at && <>
          <p>Submitted {formatDate(row.submitted_at)}{row.permit_updated_at !== permit.updated_at && " · Permit has changed since the request was issued"}</p>
          <p>{row.company} · Work lead: {row.work_lead}{row.telephone && ` · ${row.telephone}`}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{row.method_summary}</p>
          <a href={`/portal/health-safety/permits/${permit.id}/subcontractor/evidence/${row.id}`}>Download submitted PDF</a>
          <p>Review the evidence and transfer verified details to the permit or supplier record as applicable.</p>
        </>}
      </div>;
    })}
  </section>;
}
