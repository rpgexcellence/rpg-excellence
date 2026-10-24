"use client";
import { INCIDENT_UPGRADE_URL } from "../lib/incident-policy.mjs";
import { useActionState, useState, useRef, useEffect } from "react";
import { EVENT_CATEGORIES, EVENT_OUTCOMES, BODY_PARTS, contextualReportTypes, incidentStages } from "../lib/incident-reporting.mjs";
import { INCIDENT_DOMAINS, INCIDENT_TYPES } from "../lib/incident-policy.mjs";
// Keep entered evidence in memory when an action returns a validation error.
// No drafts or personal details are written to browser storage.
function usePreservedForm(state) {
  const ref = useRef(null),
    snapshot = useRef([]);
  useEffect(() => {
    if (state?.reference || state?.success) {
      snapshot.current = [];
      return;
    }
    if (!state?.error || !ref.current) return;
    const entries = snapshot.current;
    for (const el of ref.current.elements) {
      if (!el.name) continue;
      if (el.type === "file") {
        const files = entries
          .filter(
            ([k, v]) => k === el.name && typeof v !== "string" && v.size > 0,
          )
          .map(([, v]) => v);
        if (files.length && typeof DataTransfer !== "undefined") {
          try {
            const transfer = new DataTransfer();
            files.forEach((file) => transfer.items.add(file));
            el.files = transfer.files;
          } catch {}
        }
        continue;
      }
      const values = entries.filter(([k]) => k === el.name).map(([, v]) => v);
      if (el.type === "checkbox" || el.type === "radio")
        el.checked = values.includes(el.value);
      else if (el.multiple)
        for (const option of el.options)
          option.selected = values.includes(option.value);
      else if (values.length) el.value = values[values.length - 1];
    }
  }, [state]);
  return {
    ref,
    onSubmit: (event) => {
      snapshot.current = [...new FormData(event.currentTarget)];
    },
  };
}
export function IncidentActionForm({
  action,
  children,
  label = "Save",
  className = "",
  planAllowed = true,
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const preserved = usePreservedForm(state);
  return (
    <form
      {...preserved}
      action={formAction}
      className={"incidentForm " + className}
    >
      {!planAllowed && <p className="incidentNotice">
        Professional or Consultant access is required for this workflow. Existing case history remains available.
        {" "}<a href={INCIDENT_UPGRADE_URL}>View plans →</a>
      </p>}
      {planAllowed ? children : <fieldset disabled aria-label="Professional incident workflow" style={{minWidth:0,margin:0,padding:0,border:0}}>{children}</fieldset>}
      {state?.progress && <IncidentProgress report={state.progress} />}
      {state?.error && (
        <p className="incidentError" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="incidentNotice" role="status">
          {state.success}
        </p>
      )}
      <button disabled={pending || !planAllowed}>{pending ? "Saving…" : label}</button>
    </form>
  );
}
export default function IncidentIntakeForm({
  action,
  token,
  ticket,
  sites = [],
  zones = [],
}) {
  const [domains,setDomains] = useState([]);
  const [categoryChoices,setCategoryChoices] = useState({});
  const [reportType,setReportType] = useState("concern");
  const [stopWork,setStopWork] = useState("unknown");
  const [named, setNamed] = useState(false),
    [site, setSite] = useState(sites[0]?.id || ""),
    [state, formAction, pending] = useActionState(action, null);
  const preserved = usePreservedForm(state);
  useEffect(()=>{if(!contextualReportTypes(domains,INCIDENT_TYPES).some(([key])=>key===reportType)) setReportType("concern");},[domains,reportType]);
  if (state?.reference)
    return (
      <section className="incidentCard" aria-live="polite">
        <span className="incidentEyebrow">REPORT RECEIVED</span>
        <h2>{state.reference}</h2>
        <p>
          Your report is waiting for review. This service is not an emergency
          dispatch channel.
        </p>
        {state.photo_attached && (
          <p className="incidentMuted">
            Your photo has been attached privately to this report.
          </p>
        )}
        {state.photo_warning && (
          <p className="incidentNotice" role="alert">
            {state.photo_warning}
          </p>
        )}
        {state.receipt ? (
          <>
            <p>
              Save your private access key. Anyone with this reference and key
              can see the public progress update. It cannot be recovered.
            </p>
            <p className="incidentSecret">{state.receipt}</p>
            <a href={`/area/${token}/concerns/status`}>Check progress →</a>
          </>
        ) : (
          <a href="/portal/incidents">Return to incident dashboard →</a>
        )}
      </section>
    );
  return (
    <form {...preserved} action={formAction} className="incidentForm">
      <input type="hidden" name="token" value={token || ""} />
      <input type="hidden" name="ticket" value={ticket || ""} />
      <label className="incidentTrap" aria-hidden="true">
        Leave this blank
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {sites.length > 0 && (
        <div className="incidentGrid">
          <label>
            Site
            <select
              name="site_id"
              required
              value={site}
              onChange={(e) => setSite(e.target.value)}
            >
              {sites.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Building / zone
            <select name="zone_id" key={site}>
              <option value="">Site-wide / digital service</option>
              {zones
                .filter((z) => z.site_id === site)
                .map((z) => (
                  <option value={z.id} key={z.id}>
                    {z.reference} · {z.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      <fieldset>
        <legend>What does this relate to? Select all that apply.</legend>
        <div className="incidentChoices">
          {INCIDENT_DOMAINS.map(([k, v]) => (
            <label key={k}>
              <input type="checkbox" name="domains" value={k} checked={domains.includes(k)}
                onChange={e=>setDomains(current=>e.target.checked?[...current,k]:current.filter(x=>x!==k))} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      {domains.length>0 && <div className="incidentGrid">
        {domains.map(domain=><label key={domain}>
          {INCIDENT_DOMAINS.find(([k])=>k===domain)?.[1]} — event category
          <select name={"category_"+domain} required value={categoryChoices[domain]||""}
            onChange={e=>setCategoryChoices(c=>({...c,[domain]:e.target.value}))}>
            <option value="">Choose the closest match</option>
            {EVENT_CATEGORIES[domain].map(([k,label])=><option key={k} value={k}>{label}</option>)}
          </select>
          {categoryChoices[domain]==="other" && <input name={"other_"+domain} required minLength={3} maxLength={180} placeholder="Describe the event category" />}
        </label>)}
      </div>}
      <div className="incidentGrid">
        <label>
          Report type
          <select name="report_type" value={reportType} onChange={e=>setReportType(e.target.value)}>
            {contextualReportTypes(domains,INCIDENT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          How urgent does it appear?
          <select name="reported_criticality" defaultValue="medium">
            <option value="low">Low — routine attention</option>
            <option value="medium">Medium — prompt review</option>
            <option value="high">High — serious potential impact</option>
            <option value="critical">
              Critical — immediate response needed
            </option>
          </select>
        </label>
      </div>
      {reportType==="other" && <label>Other report type
        <input name="report_type_other" required minLength={3} maxLength={180} />
      </label>}
      <label className="incidentCheck">
        <input name="immediate_danger" type="checkbox" />
        There is immediate danger, active compromise or a major disruption
      </label>
      <fieldset>
        <legend>Safety now & stop-work authority</legend>
        <p className="incidentMuted">Everyone has the right to stop work they believe is unsafe. Move to safety and inform the responsible person. This form does not authorise restarting work.</p>
        <div className="incidentGrid">
          <label>Is the situation now safe / contained?
            <select name="situation_safe" defaultValue="unknown"><option value="unknown">Not known</option><option value="yes">Yes</option><option value="no">No — unsafe / not contained</option></select>
          </label>
          <label>Was stop-work authority exercised?
            <select name="stop_work" value={stopWork} onChange={e=>setStopWork(e.target.value)}>
              <option value="unknown">Not known</option><option value="yes">Yes — work stopped</option><option value="no">No</option><option value="not_applicable">Not applicable</option>
            </select>
          </label>
        </div>
        {stopWork==="yes" && <label>What was stopped, when and what remains unsafe? (optional)
          <textarea name="stop_work_details" maxLength={1000} rows={2} />
        </label>}
      </fieldset>
      <label>
        Short title
        <input
          name="title"
          required
          minLength={5}
          maxLength={180}
          placeholder="What happened, or what could happen?"
        />
      </label>
      <div className="incidentGrid">
        <label>
          When did it happen? (UTC)
          <input name="occurred_at" type="datetime-local" required />
        </label>
        <label>
          Has a manager / responsible person been informed?
          <select name="manager_notified" defaultValue="unknown">
            <option value="unknown">Not known / not applicable</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
      <label>
        What happened?
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={6000}
          rows={6}
          placeholder="Describe the event, exact location, consequences and what might happen next. Do not enter passwords, access codes, payment details or unnecessary personal information."
        />
      </label>
      {domains.length>0 && <details className="incidentOptional">
        <summary>What happened / consequences observed (optional)</summary>
        <p className="incidentMuted">Select what actually happened, not what might have happened. Leave unknown details for the investigator.</p>
        {domains.map(domain=><fieldset key={domain}><legend>{INCIDENT_DOMAINS.find(([k])=>k===domain)?.[1]}</legend>
          <div className="incidentChoices">{EVENT_OUTCOMES[domain].map(([key,label])=><label key={key}><input type="checkbox" name="outcomes" value={domain+":"+key} />{label}</label>)}</div>
        </fieldset>)}
        {domains.includes("health_safety") && <fieldset><legend>Part of body affected (optional)</legend>
          <div className="incidentChoices">{BODY_PARTS.map(([key,label])=><label key={key}><input type="checkbox" name="body_parts" value={key} />{label}</label>)}</div>
          <label>Other body part — describe if selected<input name="body_part_other" maxLength={180} /></label>
        </fieldset>}
        <label>Other consequence — describe if selected<input name="outcome_other" maxLength={500} /></label>
      </details>}
      <label>
        Who was informed and when? If nobody, explain why (optional)
        <input name="manager_details" maxLength={500} />
      </label>
      <label>
        Immediate action taken (optional)
        <textarea name="immediate_action" maxLength={2000} rows={3} />
      </label>
      <details className="incidentOptional">
        <summary>Additional context & follow-up (optional)</summary>
        <div className="incidentForm">
          <label>Activity underway<input name="activity" maxLength={500} /></label>
          <label>Equipment, asset or affected service<input name="asset" maxLength={500} /></label>
          <label>Other useful details<textarea name="additional_details" maxLength={2000} rows={3}
            placeholder={domains.includes("information_security")?"Suspected or confirmed? Affected systems, confidentiality, integrity or availability. Do not enter credentials or sensitive data.":domains.includes("business_continuity")?"Affected service, interruption and current recovery position.":"Injury or first aid, damaged equipment, witnesses or unusual conditions. Avoid unnecessary personal or medical information."} /></label>
          <fieldset><legend>Suggest follow-up for administrator review</legend>
            <div className="incidentChoices"><label><input type="checkbox" name="requested_workflows" value="capa_8d" />CAPA-8D</label><label><input type="checkbox" name="requested_workflows" value="moc" />Management of Change (MOC)</label></div>
          </fieldset>
          <label>Related assessment, permit, inspection or other reference<textarea name="reference_notes" maxLength={1000} rows={2} placeholder="Enter any reference you know. The administrator will confirm and link the record." /></label>
          <p className="incidentMuted">These are requests for review. They do not create or approve changes automatically.</p>
        </div>
      </details>
      <fieldset>
        <legend>Photo evidence (optional)</legend>
        <label>
          Attach one photo
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="incident-photo-help"
          />
        </label>
        <p id="incident-photo-help" className="incidentMuted">
          JPEG, PNG or WebP, up to 3 MB and 24 megapixels. Choose an existing
          photo or use your device's camera where available. The photo is stored
          privately for authorised case users. A resized copy is saved with
          image metadata removed; the original file is not retained. The picture
          itself may identify people or locations. Do not take a photo if it
          puts you at risk.
        </p>
      </fieldset>
      <fieldset>
        <legend>Your choice</legend>
        <label className="incidentCheck">
          <input
            type="checkbox"
            checked={named}
            onChange={(e) => setNamed(e.target.checked)}
          />
          I want to leave contact details
        </label>
        <input
          type="hidden"
          name="anonymous"
          value={named ? "false" : "true"}
        />
        {named ? (
          <div className="incidentGrid">
            <label>
              Name
              <input name="contact_name" required maxLength={120} />
            </label>
            <label>
              Email
              <input name="contact_email" type="email" maxLength={254} />
            </label>
            <label>
              Telephone
              <input name="contact_phone" type="tel" maxLength={60} />
            </label>
            <label className="incidentCheck">
              <input type="checkbox" name="contact_consent" required />I agree
              that authorised incident administrators may use these details to
              follow up this report.
            </label>
          </div>
        ) : (
          <p>
            No name, contact details or account identity will be attached to
            this report. Information you write can still identify you. Normal
            service security logs may exist; this is not a guarantee of
            untraceability.
          </p>
        )}
      </fieldset>
      <p className="incidentMuted">
        Reports are reviewed by authorised company personnel. Contacts are
        stored separately and available to incident administrators. Use site
        emergency procedures for immediate danger and established security
        response channels for active attacks. Do not wait for this form to be
        read.
      </p>
      {state?.error && (
        <p className="incidentError" role="alert">
          {state.error}
        </p>
      )}
      <button disabled={pending}>
        {pending ? "Submitting…" : "Submit report securely"}
      </button>
    </form>
  );
}

export function IncidentProgress({report}) {
 const {steps,current,exception}=incidentStages(report);
 if(exception) return <p className="incidentNotice">Report {exception}. See the authorised progress update for the next step.</p>;
 return <nav className="incidentProgress" aria-label="Report progress"><ol>
   {steps.map(([key,label],i)=><li key={key} className={i<current?"done":i===current?"current":""} aria-current={i===current?"step":undefined}>
     <span>{i<current?"✓":i+1}</span><strong>{label}</strong>
   </li>)}
 </ol><p className="incidentMuted">Current stage: {steps[current][1]}. Stages show the workflow position; completion evidence is checked before closure.</p></nav>;
}
