const sections = [
  ["profile", "Supplier profile", [
    ["legalName", "Legal supplier name"], ["registration", "Company registration number"],
    ["address", "Registered address", true], ["scope", "Scope of supply", true],
    ["sites", "Operating sites and scope", true],
  ]],
  ["contact", "Contact details", [
    ["primaryName", "Primary contact"], ["title", "Title and department"],
    ["email", "Email address"], ["telephone", "Telephone"],
    ["escalation", "Secondary contact and escalation route", true],
  ]],
  ["standards", "Standards and certification", [
    ["certifications", "Standards and certification details", true],
    ["subtiers", "Sub-tier suppliers and certifications", true],
  ]],
  ["risk", "Risk and continuity", [
    ["disruption", "Disruption history and controls", true],
    ["dependencies", "Business dependencies and continuity arrangements", true],
  ]],
  ["monitoring", "Approval and monitoring", [
    ["contact", "Monitoring contact and availability"],
    ["changes", "Restrictions or changes declared"],
  ]],
  ["acknowledgement", "Code of Conduct acknowledgement", [
    ["signatory", "Signed by"], ["version", "Document version"],
    ["documentReference", "Document reference", true],
  ]],
];

const responses = new Map([
  ["yes", "Yes"], ["partial", "Partial"], ["no", "No"], ["na", "Not applicable"],
]);

export function formatInvitationDate(date) {
  return new Date(date).toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function AnswerSection({ title, fields, values }) {
  return <section className="saSubmissionSection">
    <h4>{title}</h4>
    {values ? <dl className="saSubmissionFields">
      {fields.map(([key, label, wide]) => <div key={key} className={wide ? "saSubmissionWide" : undefined}>
        <dt>{label}</dt>
        <dd>{values[key] === "" || values[key] == null ? "—" : values[key]}</dd>
      </div>)}
    </dl> : <p className="saSubmissionMeta">No details recorded.</p>}
  </section>;
}

export default function SupplierSubmissionRevision({ submission, questionnaire, revision, initiallyOpen, evidenceUrl }) {
  const answers = submission.answers ?? {};
  const controls = Object.entries(answers.controls ?? {});
  const questions = new Map((questionnaire ?? []).map(({ id, question }) => [id, question]));
  const evidence = submission.evidence ?? [];

  return <details className="saSubmissionPanel" open={initiallyOpen}>
    <summary>
      <span className="saSubmissionSummary">
        <strong>Submitted revision {revision}</strong>
        <time dateTime={submission.submittedAt}>{formatInvitationDate(submission.submittedAt)}</time>
      </span>
    </summary>
    <div className="saSubmissionBody">
      {sections.slice(0, 4).map(([key, title, fields]) =>
        <AnswerSection key={key} title={title} fields={fields} values={answers[key]} />
      )}
      <section className="saSubmissionSection">
        <h4>Due diligence responses <span className="saSubmissionMeta">({controls.length})</span></h4>
        {controls.length ? <ul className="saSubmissionControls">
          {controls.map(([id, answer]) => <li key={id}>
            <div className="saSubmissionControlHeader">
              <div><span className="saSubmissionControlId">{id}</span>{questions.get(id) && <strong>{questions.get(id)}</strong>}</div>
              <span className="saSubmissionResponse" data-response={answer?.response}>{responses.get(answer?.response) ?? "No response"}</span>
            </div>
            <dl className="saSubmissionNotes">
              <dt>Evidence notes</dt>
              <dd>{answer?.evidence || "—"}</dd>
            </dl>
          </li>)}
        </ul> : <p className="saSubmissionMeta">No responses recorded.</p>}
      </section>
      {sections.slice(4).map(([key, title, fields]) =>
        <AnswerSection key={key} title={title} fields={fields} values={answers[key]} />
      )}
      <section className="saSubmissionSection">
        <h4>Supporting evidence <span className="saSubmissionMeta">({evidence.length})</span></h4>
        {evidence.length ? <ul className="saSubmissionFiles">
          {evidence.map(file => <li key={file.id}><a href={evidenceUrl(file.id)}>{file.name}</a></li>)}
        </ul> : <p className="saSubmissionMeta">No files attached.</p>}
      </section>
    </div>
  </details>;
}
