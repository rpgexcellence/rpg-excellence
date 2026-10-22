"use client";
import { useActionState, useState, useRef, useEffect } from "react";
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
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const preserved = usePreservedForm(state);
  return (
    <form
      {...preserved}
      action={formAction}
      className={"incidentForm " + className}
    >
      {children}
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
      <button disabled={pending}>{pending ? "Saving…" : label}</button>
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
  const [named, setNamed] = useState(false),
    [site, setSite] = useState(sites[0]?.id || ""),
    [state, formAction, pending] = useActionState(action, null);
  const preserved = usePreservedForm(state);
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
              <input type="checkbox" name="domains" value={k} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="incidentGrid">
        <label>
          Report type
          <select name="report_type" defaultValue="concern">
            {INCIDENT_TYPES.map(([k, v]) => (
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
      <label className="incidentCheck">
        <input name="immediate_danger" type="checkbox" />
        There is immediate danger, active compromise or a major disruption
      </label>
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
      <label>
        Who was informed and when? (optional)
        <input name="manager_details" maxLength={500} />
      </label>
      <label>
        Immediate action taken (optional)
        <textarea name="immediate_action" maxLength={2000} rows={3} />
      </label>
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
