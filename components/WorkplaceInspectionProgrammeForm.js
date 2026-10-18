"use client";

import { useActionState, useMemo, useState } from "react";

const FREQUENCY_UNITS = [
  ["days", "Days"],
  ["weeks", "Weeks"],
  ["months", "Months"],
  ["years", "Years"],
];

export default function WorkplaceInspectionProgrammeForm({
  action,
  programme = null,
  sites = [],
  people = [],
  templates = [],
  profileFields = [],
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [profile, setProfile] = useState(() => programme?.area_profile || {});
  const selectedCount = useMemo(
    () => Object.values(profile).filter(Boolean).length,
    [profile],
  );

  function toggleProfile(key, checked) {
    setProfile((current) => ({ ...current, [key]: checked }));
  }

  return <form action={formAction} className="wpiProgrammeForm">
    {programme?.id ? <input type="hidden" name="programme_id" value={programme.id} /> : null}

    {state?.error ? <div className="wpiMessage error" role="alert"><strong>Programme was not saved</strong><span>{state.error}</span></div> : null}
    {state?.success ? <div className="wpiMessage success" role="status"><strong>Programme saved</strong><span>{state.success}</span></div> : null}

    <section className="wpiPanel">
      <div className="wpiSectionHead"><div><small>STEP 1</small><h2>Programme and location</h2><p>Create one controlled programme for each area requiring recurring inspection.</p></div><span>Administration source</span></div>
      <div className="wpiFormGrid">
        <label className="wpiField"><span>Programme title *</span><input name="title" required maxLength="180" defaultValue={programme?.title || ""} placeholder="For example: Cambridge Laboratory Workplace Inspection" /></label>
        <label className="wpiField"><span>Inspection template *</span><select name="template_id" required defaultValue={programme?.template_id || templates[0]?.id || ""}><option value="">Select template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.title} · v{template.version}</option>)}</select><small>The controlled question bank used as the inspection baseline.</small></label>
        <label className="wpiField"><span>Site Profile location *</span><select name="administration_location_id" required defaultValue={programme?.administration_location_id || ""}><option value="">Select current site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}</select><small>Loaded from Administration → Site Profile. BCP locations are not used.</small></label>
        <label className="wpiField"><span>Area or department</span><input name="area_department" maxLength="180" defaultValue={programme?.area_department || ""} placeholder="Laboratory, workshop, warehouse or office" /></label>
      </div>
    </section>

    <section className="wpiPanel">
      <div className="wpiSectionHead"><div><small>STEP 2</small><h2>Accountability and independence</h2><p>Selections are restricted to active Company Users in this organisation.</p></div><span>Controlled people</span></div>
      <div className="wpiFormGrid three">
        <PersonSelect name="accountable_person_id" label="Accountable owner *" guidance="Owns delivery, resources and escalation." people={people} value={programme?.accountable_person_id} />
        <PersonSelect name="lead_inspector_person_id" label="Lead inspector *" guidance="Plans and conducts the inspection." people={people} value={programme?.lead_inspector_person_id} />
        <PersonSelect name="reviewer_person_id" label="Independent reviewer *" guidance="Must not be the selected lead inspector." people={people} value={programme?.reviewer_person_id} />
      </div>
    </section>

    <section className="wpiPanel">
      <div className="wpiSectionHead"><div><small>STEP 3</small><h2>Inspection frequency</h2><p>The engine may bring the next date forward when connected risk signals indicate increased exposure.</p></div><span>Risk adjusted</span></div>
      <div className="wpiFormGrid three">
        <label className="wpiField"><span>Frequency amount *</span><input name="frequency_amount" type="number" min="1" max="365" required defaultValue={programme?.frequency_amount || 1} /></label>
        <label className="wpiField"><span>Frequency unit *</span><select name="frequency_unit" required defaultValue={programme?.frequency_unit || "months"}>{FREQUENCY_UNITS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="wpiField"><span>Last inspection date</span><input name="last_inspection_date" type="date" defaultValue={programme?.last_inspection_date || ""} /><small>Leave blank for a new programme.</small></label>
      </div>
    </section>

    <section className="wpiPanel">
      <div className="wpiSectionHead"><div><small>STEP 4</small><h2>Area characteristics</h2><p>Select everything present or reasonably foreseeable. The engine adds the relevant checklist packs and guidance.</p></div><strong>{selectedCount} specialist pack{selectedCount === 1 ? "" : "s"}</strong></div>
      <div className="wpiProfileGrid">{profileFields.map(([key, label]) => <label className={"wpiProfileCard " + (profile[key] ? "selected" : "")} key={key}><input type="checkbox" name={key} value="true" checked={Boolean(profile[key])} onChange={(event) => toggleProfile(key, event.target.checked)} /><span><strong>{label}</strong><small>{profile[key] ? "Included in the generated inspection" : "Select if applicable"}</small></span></label>)}</div>
      <div className="wpiGuidance"><strong>Dynamic checklist rule</strong><p>The core workplace pack always applies. These selections add specialist questions. Previous inspections, audit findings, accidents, incidents, risk assessments, permits, POWRA, MOC and assets may add further questions or accelerate the inspection date.</p></div>
    </section>

    {state?.plan ? <section className="wpiPlanResult"><div><span>Risk score</span><strong>{state.plan.riskScore}/100</strong></div><div><span>Priority</span><strong>{state.plan.riskBand}</strong></div><div><span>Next inspection</span><strong>{state.plan.nextInspectionDate}</strong></div><p>{state.plan.planningBasis}</p></section> : null}

    <footer className="wpiFormFooter"><p>Saving recalculates the checklist, priority and next inspection date. Existing administrator access is not changed.</p><button type="submit" disabled={pending}>{pending ? "Saving…" : programme?.id ? "Save and recalculate" : "Create programme"}</button></footer>
  </form>;
}

function PersonSelect({ name, label, guidance, people, value }) {
  return <label className="wpiField"><span>{label}</span><select name={name} required defaultValue={value || ""}><option value="">Select Company User</option>{people.map((person) => <option key={person.id} value={person.id}>{person.label}{person.position ? " · " + person.position : ""}</option>)}</select><small>{guidance}</small></label>;
}
