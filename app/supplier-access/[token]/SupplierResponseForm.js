"use client";

import { useActionState, useState } from "react";
import { saveSupplierResponse, supplierSignIn, supplierVerifyCode } from "./actions";

const css = `
.supplierAccess form{display:grid;gap:12px}
.supplierAccess label{display:grid;gap:5px;font-weight:700}
.supplierAccess input,.supplierAccess textarea,.supplierAccess select{font:inherit;padding:9px;border:1px solid #c5d3e3;border-radius:6px;background:#fbfdff;color:#102748}
.supplierAccess fieldset,.supplierAccess article{display:grid;gap:12px;border:1px solid #d2dee9;border-radius:10px;padding:14px;margin:8px 0;min-width:0}
.supplierAccess legend{font-weight:700}
.supplierAccess button{font:inherit;background:#315fe6;color:white;border:0;border-radius:6px;padding:9px 14px;justify-self:start;cursor:pointer}
.supplierAccess button:disabled{opacity:.55}
.supplierAccess .supplierFeedback{color:#84351f}
.supplierAccess .supplierSuccess{color:#087450}
.supplierAccess .supplierActions{display:flex;flex-wrap:wrap;gap:8px}
.supplierAccess .supplierCheck{display:flex;align-items:center}
`;
function Feedback({ feedback }) {
  return <p role="status" className={feedback?.error ? "supplierFeedback" : "supplierSuccess"}>{feedback?.error || feedback?.message}</p>;
}
export function SupplierSignIn({ token }) {
  const [email, setEmail] = useState("");
  const [sent, send, sending] = useActionState(supplierSignIn.bind(null, token), {});
  const [verified, verify, verifying] = useActionState(supplierVerifyCode.bind(null, token), {});

  return <>
    <form className="loginForm" action={send}>
      <label htmlFor="supplier-invite-email">Invitation email address
        <input id="supplier-invite-email" name="email" autoComplete="email" type="email"
          placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} required />
      </label>
      <button className="primaryButton" type="submit" disabled={sending}>
        {sending ? "Requesting sign-in…" : "Request sign-in link or code →"}
      </button>
    </form>
    {sent.error && <p className="loginMessage" role="alert">{sent.error}</p>}
    {sent.message && <>
      <p className="supplierSignInNotice" role="status">{sent.message}</p>
      <details className="supplierCodeEntry">
        <summary>Enter a verification code</summary>
        <form className="loginForm" action={verify}>
          <label htmlFor="supplier-verify-email">Invitation email address
            <input id="supplier-verify-email" name="email" type="email" autoComplete="email"
              defaultValue={email} required />
          </label>
          <label htmlFor="supplier-verification-code">Verification code
            <input id="supplier-verification-code" name="code" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6,8}" minLength={6} maxLength={8} required />
          </label>
          <button className="primaryButton" type="submit" disabled={verifying}>
            {verifying ? "Verifying email…" : "Verify email →"}
          </button>
        </form>
        {verified.error && <p className="loginMessage" role="alert">{verified.error}</p>}
        {verified.message && <p className="supplierSignInNotice" role="status">{verified.message}</p>}
      </details>
    </>}
  </>;
}
export function SupplierResponseForm({ token, invitation, document }) {
  const [state, action, pending] = useActionState(saveSupplierResponse.bind(null,token), {});
  const answers = invitation.answers;
  const [draft,setDraft] = useState({});
  const bind = (name,value) => ({ name, value:draft[name] ?? value ?? "", onChange:event=>setDraft(current=>({...current,[name]:event.target.value})) });
  const field = (name,label,value,area=false) => <label>{label}{area ? <textarea {...bind(name,value)} maxLength={2500} rows="3" /> : <input {...bind(name,value)} maxLength={2500} />}</label>;
  const sections=(Array.isArray(document.sections) ? document.sections : []);
  return <>
    <style>{css}</style>
    <form action={action}><input type="hidden" name="responseVersion" value={answers.responseVersion || 0} />
      <fieldset><legend>1. Supplier Profile</legend>
        {field("legalName","Legal supplier name",answers.profile?.legalName)}
        {field("registration","Company or registration number",answers.profile?.registration)}
        {field("address","Full registered address",answers.profile?.address,true)}
        {field("scope","Products, services or outsourced processes supplied",answers.profile?.scope,true)}
        {field("sites","Operating sites and the scope at each site",answers.profile?.sites,true)}
      </fieldset>
      <fieldset><legend>2. Contact Details</legend>
        {field("primaryName","Primary contact name",answers.contact?.primaryName)}
        {field("title","Business title and department",answers.contact?.title)}
        {field("telephone","Telephone",answers.contact?.telephone)}
        {field("escalation","Secondary contact and escalation route",answers.contact?.escalation,true)}
      </fieldset>
      <fieldset><legend>3. Standards &amp; Scope</legend>
        {field("certifications","Applicable standards, certificate numbers, certification bodies and expiry dates",answers.standards?.certifications,true)}
        {field("subtiers","Sub-tier suppliers, their scope and certifications",answers.standards?.subtiers,true)}
      </fieldset>
      <fieldset><legend>4. Risk information</legend>
        {field("disruption","Disruption history and controls",answers.risk?.disruption,true)}
        {field("dependencies","Business dependencies and continuity arrangements",answers.risk?.dependencies,true)}
      </fieldset>
      <fieldset><legend>5. Due Diligence</legend>
        {invitation.questionnaire.map(question => <article key={question.id}>
          <strong>{question.id} · {question.question}</strong>
          <label>Response<select {...bind(question.id+"_response",answers.controls?.[question.id]?.response)}>
            <option value="">Select response</option><option value="yes">Yes</option><option value="partial">Partial</option><option value="no">No</option><option value="na">N/A</option>
          </select></label>
          {field(question.id+"_evidence","Evidence expected: "+question.evidence,answers.controls?.[question.id]?.evidence,true)}
        </article>)}
        {invitation.evidenceNames.length > 0 && <ul>{invitation.evidenceNames.map(({id,name}) => <li key={id}>{name}</li>)}</ul>}
        <label>Add supporting evidence (PDF, PNG or JPEG, up to 4 MB)<input name="evidence" type="file" accept=".pdf,.png,.jpg,.jpeg" /></label>
      </fieldset>
      <fieldset><legend>6. Approval &amp; Monitoring</legend>
        {field("monitoringContact","Monitoring contact and availability",answers.monitoring?.contact,true)}
        {field("changes","Restrictions or changes to declare",answers.monitoring?.changes,true)}
        <p>RPG Excellence records the approval decision after evaluating your submission.</p>
      </fieldset>
      <fieldset><legend>7. Code of Conduct</legend>
        <p>{document.document_reference} · Version {document.version}</p>
        <details><summary>Read the issued Code of Conduct</summary>
          {sections.map(section => <article key={section.id}>
            <h3>{section.title}</h3>
            {(section.paragraphs || []).map((paragraph,index) => <p key={index}>{paragraph}</p>)}
            <ul>{(section.requirements || []).map((requirement,index) => <li key={index}>{requirement}</li>)}</ul>
          </article>)}
        </details>
        <p>{document.declaration?.acknowledgement}</p>
        {field("signatory","Authorised supplier representative",answers.acknowledgement?.signatory)}
        <label className="supplierCheck"><input type="checkbox" name="acknowledged" checked={draft.acknowledged ?? Boolean(answers.acknowledgement)} onChange={event=>setDraft(current=>({...current,acknowledged:event.target.checked}))} /> I acknowledge this issued version on behalf of the supplier.</label>
      </fieldset>
      <Feedback feedback={state} />
      <div className="supplierActions">
        <button name="intent" value="save" disabled={pending}>Save draft</button>
        <button name="intent" value="submit" disabled={pending}>Submit for RPG review</button>
      </div>
    </form>
  </>;
}
