import { hasSubcontractorScope, requestOpen, requestTable, supplierRequestOptions } from "../../../../../../lib/permit-subcontractor.mjs";
import Link from "next/link";
import { loadPermitParticipants } from "../../../../../../lib/permitParticipants";
import { requestSubcontractorInformation, revokeSubcontractorRequest } from "./actions";
import RequestRecipientForm from "./RequestRecipientForm";
import styles from "./requests.module.css";

const messages = {
  sent: "RPG sent the request to the named recipient.",
  revoked: "The request was revoked.",
  active: "Revoke the existing request before sending a replacement.",
  "delivery-failed": "RPG could not confirm email delivery. The request was revoked.",
  "delivery-uncertain": "RPG could not confirm email delivery or revocation. Check the pending request before trying again.",
  "draft-required": "Send requests while the permit is in Draft.",
  "draft-changed": "The draft changed. Review the updated scope before sending.",
  "scope-required": "Save a task description and scope limits before sending.",
  "supplier-contact-required": "Choose an active contact with a business email from the selected supplier.",
  "supplier-contact-changed": "The supplier contact email changed. Review the current address before sending.",
  "recipient-source-required": "Choose how to enter the recipient.",
  "email-required": "Enter a valid business email address.",
  unavailable: "RPG could not complete the request.",
};
const formatDate = value => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London",
}).format(new Date(value));

export default async function SubcontractorRequests({ admin, permit, organization, feedback }) {
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

  const canStart = permit.status === "draft" && !pending;
  const hasScope = hasSubcontractorScope(permit);
  let suppliers = [];
  let lookupFailed = false;
  if (canStart && hasScope) {
    try {
      suppliers = supplierRequestOptions(await loadPermitParticipants(organization));
    } catch {
      lookupFailed = true;
    }
  }

  return <section id="subcontractor" className="pcPanel">
    <h2>Subcontractor information</h2>
    <p>Invite a subcontractor to submit their details and documents for review. The recipient signs in with the invited email address.</p>
    {typeof feedback === "string" && Object.hasOwn(messages, feedback) && <p role="status">{messages[feedback]}</p>}
    {canStart && (hasScope ? <RequestRecipientForm
      action={requestSubcontractorInformation.bind(null, permit.id, permit.updated_at)}
      suppliers={suppliers}
      lookupFailed={lookupFailed}
      savedContactId={permit.receiver_supplier_contact_id}
      reference={permit.permit_reference}
      task={permit.task_description}
      scope={permit.scope_limits}
    /> : <div className={styles.scope}>
      <strong>Complete the job details before sending</strong>
      <p>Save a task description and scope limits. These fields are shared with the subcontractor.</p>
      <Link href={`/portal/health-safety/permits/${permit.id}/edit`}>Edit draft permit</Link>
    </div>)}
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
