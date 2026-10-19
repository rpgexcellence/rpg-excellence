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
  zones = [],
  people = [],
  templates = [],
  profileFields = [],
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [siteId, setSiteId] = useState(programme?.administration_location_id || "");
  const [zoneId, setZoneId] = useState(programme?.zone_id || "");
  const [profile, setProfile] = useState(() => programme?.area_profile || {});

  const selectedCount = useMemo(
    () => Object.values(profile).filter(Boolean).length,
    [profile],
  );

  function toggleProfile(key, checked) {
    setProfile((current) => ({ ...current, [key]: checked }));
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .wpiProgrammeForm {
          width: 100%;
          display: grid;
          gap: 18px;
          color: #0a2645;
        }

        .wpiPanel {
          width: 100%;
          overflow: hidden;
          padding: 24px;
          border: 1px solid #cfdeea;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(11, 46, 79, 0.045);
        }

        .wpiSectionHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid #e1eaf1;
        }

        .wpiSectionHead > div {
          min-width: 0;
        }

        .wpiSectionHead small {
          display: block;
          margin-bottom: 5px;
          color: #3161e8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .wpiSectionHead h2 {
          margin: 0;
          color: #071f3d;
          font-size: clamp(21px, 2vw, 27px);
          line-height: 1.15;
        }

        .wpiSectionHead p {
          max-width: 820px;
          margin: 7px 0 0;
          color: #60778f;
          font-size: 14px;
          line-height: 1.55;
        }

        .wpiSectionHead > span,
        .wpiSectionHead > strong {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 8px 12px;
          border: 1px solid #c8ddd9;
          border-radius: 999px;
          background: #eef9f6;
          color: #087a68;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .wpiFormGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: start;
        }

        .wpiFormGrid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .wpiField {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .wpiField > span {
          color: #102f50;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.3;
        }

        .wpiField input,
        .wpiField select,
        .wpiField textarea {
          width: 100%;
          min-width: 0;
          height: 46px;
          padding: 0 13px;
          border: 1px solid #b9cddd;
          border-radius: 9px;
          outline: none;
          background: #fbfdff;
          color: #0b2949;
          font: inherit;
          font-size: 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .wpiField select {
          cursor: pointer;
        }

        .wpiField input:hover,
        .wpiField select:hover,
        .wpiField textarea:hover {
          border-color: #7fa2bd;
          background: #ffffff;
        }

        .wpiField input:focus,
        .wpiField select:focus,
        .wpiField textarea:focus {
          border-color: #3161e8;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(49, 97, 232, 0.13);
        }

        .wpiField small {
          display: block;
          min-height: 32px;
          color: #6b8094;
          font-size: 11px;
          line-height: 1.45;
        }

        .wpiProfileGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .wpiProfileCard {
          min-width: 0;
          min-height: 86px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          border: 1px solid #d3e0e9;
          border-radius: 12px;
          background: #f8fbfd;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease,
            background 0.15s ease, box-shadow 0.15s ease;
        }

        .wpiProfileCard:hover {
          transform: translateY(-1px);
          border-color: #83a9c4;
          background: #ffffff;
          box-shadow: 0 7px 18px rgba(9, 43, 75, 0.07);
        }

        .wpiProfileCard.selected {
          border-color: #16a38a;
          background: #edf9f6;
          box-shadow: inset 4px 0 0 #16a38a;
        }

        .wpiProfileCard input {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          margin: 2px 0 0;
          accent-color: #0c927c;
        }

        .wpiProfileCard > span {
          min-width: 0;
          display: block;
        }

        .wpiProfileCard strong,
        .wpiProfileCard small {
          display: block;
        }

        .wpiProfileCard strong {
          overflow-wrap: anywhere;
          color: #102f50;
          font-size: 13px;
          line-height: 1.35;
        }

        .wpiProfileCard small {
          margin-top: 6px;
          color: #6b8094;
          font-size: 11px;
          line-height: 1.35;
        }

        .wpiProfileCard.selected small {
          color: #087662;
          font-weight: 700;
        }

        .wpiGuidance {
          margin-top: 16px;
          padding: 16px 18px;
          border: 1px solid #bdd9e9;
          border-radius: 11px;
          background: #eff7fb;
        }

        .wpiGuidance strong {
          display: block;
          color: #123f65;
          font-size: 13px;
        }

        .wpiGuidance p {
          margin: 6px 0 0;
          color: #56738b;
          font-size: 12px;
          line-height: 1.55;
        }

        .wpiMessage {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 15px 17px;
          border: 1px solid;
          border-radius: 11px;
          font-size: 13px;
        }

        .wpiMessage.error {
          border-color: #efaaa5;
          background: #fff2f1;
          color: #9b2823;
        }

        .wpiMessage.success {
          border-color: #94d3c3;
          background: #eefaf6;
          color: #08725e;
        }

        .wpiPlanResult {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 20px;
          border: 1px solid #b9d7d2;
          border-radius: 14px;
          background: linear-gradient(120deg, #07335e, #087f70);
          color: #ffffff;
        }

        .wpiPlanResult div {
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.19);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
        }

        .wpiPlanResult span,
        .wpiPlanResult strong {
          display: block;
        }

        .wpiPlanResult span {
          color: #cce7e4;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .wpiPlanResult strong {
          margin-top: 5px;
          font-size: 21px;
        }

        .wpiPlanResult p {
          grid-column: 1 / -1;
          margin: 2px 0 0;
          color: #dceceb;
          font-size: 12px;
          line-height: 1.5;
        }

        .wpiFormFooter {
          position: sticky;
          bottom: 12px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 15px 17px;
          border: 1px solid #c9d9e5;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 12px 32px rgba(8, 41, 72, 0.13);
          backdrop-filter: blur(10px);
        }

        .wpiFormFooter p {
          margin: 0;
          color: #62798f;
          font-size: 11px;
          line-height: 1.45;
        }

        .wpiFormFooter button {
          flex: 0 0 auto;
          min-width: 180px;
          min-height: 45px;
          padding: 11px 18px;
          border: 0;
          border-radius: 9px;
          background: #315fe6;
          color: #ffffff;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 7px 16px rgba(49, 95, 230, 0.2);
        }

        .wpiFormFooter button:hover:not(:disabled) {
          background: #214fd3;
        }

        .wpiFormFooter button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        @media (max-width: 1050px) {
          .wpiFormGrid.three,
          .wpiProfileGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .wpiPanel {
            padding: 18px;
            border-radius: 13px;
          }

          .wpiSectionHead {
            flex-direction: column;
            gap: 12px;
          }

          .wpiFormGrid,
          .wpiFormGrid.three,
          .wpiProfileGrid,
          .wpiPlanResult {
            grid-template-columns: 1fr;
          }

          .wpiPlanResult p {
            grid-column: auto;
          }

          .wpiField small {
            min-height: 0;
          }

          .wpiFormFooter {
            position: static;
            align-items: stretch;
            flex-direction: column;
          }

          .wpiFormFooter button {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .wpiPanel {
            padding: 15px;
          }

          .wpiProfileCard {
            min-height: 76px;
          }
        }
      `}</style>

      <form action={formAction} className="wpiProgrammeForm">
        {programme?.id ? (
          <input type="hidden" name="programme_id" value={programme.id} />
        ) : null}

        {state?.error ? (
          <div className="wpiMessage error" role="alert">
            <strong>Programme was not saved</strong>
            <span>{state.error}</span>
          </div>
        ) : null}

        {state?.success ? (
          <div className="wpiMessage success" role="status">
            <strong>Programme saved</strong>
            <span>{state.success}</span>
          </div>
        ) : null}

        <section className="wpiPanel">
          <div className="wpiSectionHead">
            <div>
              <small>STEP 1</small>
              <h2>Programme and location</h2>
              <p>
                Create one controlled programme for each area requiring recurring
                inspection.
              </p>
            </div>
            <span>Administration source</span>
          </div>

          <div className="wpiFormGrid">
            <label className="wpiField">
              <span>Programme title *</span>
              <input
                name="title"
                required
                maxLength="180"
                defaultValue={programme?.title || ""}
                placeholder="For example: Cambridge Laboratory Workplace Inspection"
              />
            </label>

            <label className="wpiField">
              <span>Inspection template *</span>
              <select
                name="template_id"
                required
                defaultValue={programme?.template_id || templates[0]?.id || ""}
              >
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} · v{template.version}
                  </option>
                ))}
              </select>
              <small>
                The controlled question bank used as the inspection baseline.
              </small>
            </label>

            <label className="wpiField">
              <span>Site Profile location *</span>
              <select
                name="administration_location_id"
                required
                value={siteId}
                onChange={e => {setSiteId(e.target.value);setZoneId("");}}
              >
                <option value="">Select current site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.label}
                  </option>
                ))}
              </select>
              <small>
                Loaded from Administration → Site Profile. BCP locations are not
                used.
              </small>
            </label>

            <label className="wpiField">
              <span>Controlled zone</span>
              <select name="zone_id" value={zoneId} onChange={e=>setZoneId(e.target.value)}>
                <option value="">Site-wide / zone not assigned</option>
                {zones.filter(z=>z.site_id===siteId).map(z=><option key={z.id} value={z.id}>{z.reference} · {z.name}</option>)}
              </select>
              <small>Future inspections inherit this zone. Existing inspections keep their recorded zone.</small>
            </label>
            <label className="wpiField">
              <span>Area or department</span>
              <input
                name="area_department"
                maxLength="180"
                defaultValue={programme?.area_department || ""}
                placeholder="Laboratory, workshop, warehouse or office"
              />
            </label>
          </div>
        </section>

        <section className="wpiPanel">
          <div className="wpiSectionHead">
            <div>
              <small>STEP 2</small>
              <h2>Accountability and independence</h2>
              <p>
                Selections are restricted to active Company Users in this
                organisation.
              </p>
            </div>
            <span>Controlled people</span>
          </div>

          <div className="wpiFormGrid three">
            <PersonSelect
              name="accountable_person_id"
              label="Accountable owner *"
              guidance="Owns delivery, resources and escalation."
              people={people}
              value={programme?.accountable_person_id}
            />
            <PersonSelect
              name="lead_inspector_person_id"
              label="Lead inspector *"
              guidance="Plans and conducts the inspection."
              people={people}
              value={programme?.lead_inspector_person_id}
            />
            <PersonSelect
              name="reviewer_person_id"
              label="Independent reviewer *"
              guidance="Must not be the selected lead inspector."
              people={people}
              value={programme?.reviewer_person_id}
            />
          </div>
        </section>

        <section className="wpiPanel">
          <div className="wpiSectionHead">
            <div>
              <small>STEP 3</small>
              <h2>Inspection frequency</h2>
              <p>
                The engine may bring the next date forward when connected risk
                signals indicate increased exposure.
              </p>
            </div>
            <span>Risk adjusted</span>
          </div>

          <div className="wpiFormGrid three">
            <label className="wpiField">
              <span>Frequency amount *</span>
              <input
                name="frequency_amount"
                type="number"
                min="1"
                max="365"
                required
                defaultValue={programme?.frequency_amount || 1}
              />
            </label>

            <label className="wpiField">
              <span>Frequency unit *</span>
              <select
                name="frequency_unit"
                required
                defaultValue={programme?.frequency_unit || "months"}
              >
                {FREQUENCY_UNITS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="wpiField">
              <span>Last inspection date</span>
              <input
                name="last_inspection_date"
                type="date"
                defaultValue={programme?.last_inspection_date || ""}
              />
              <small>Leave blank for a new programme.</small>
            </label>
          </div>
        </section>

        <section className="wpiPanel">
          <div className="wpiSectionHead">
            <div>
              <small>STEP 4</small>
              <h2>Area characteristics</h2>
              <p>
                Select everything present or reasonably foreseeable. The engine
                adds the relevant checklist packs and guidance.
              </p>
            </div>
            <strong>
              {selectedCount} specialist pack{selectedCount === 1 ? "" : "s"}
            </strong>
          </div>

          <div className="wpiProfileGrid">
            {profileFields.map(([key, label]) => (
              <label
                className={`wpiProfileCard ${profile[key] ? "selected" : ""}`}
                key={key}
              >
                <input
                  type="checkbox"
                  name={key}
                  value="true"
                  checked={Boolean(profile[key])}
                  onChange={(event) =>
                    toggleProfile(key, event.target.checked)
                  }
                />
                <span>
                  <strong>{label}</strong>
                  <small>
                    {profile[key]
                      ? "Included in the generated inspection"
                      : "Select if applicable"}
                  </small>
                </span>
              </label>
            ))}
          </div>

          <div className="wpiGuidance">
            <strong>Dynamic checklist rule</strong>
            <p>
              The core workplace pack always applies. These selections add
              specialist questions. Previous inspections, audit findings,
              accidents, incidents, risk assessments, permits, POWRA, MOC and
              assets may add further questions or accelerate the inspection date.
            </p>
          </div>
        </section>

        {state?.plan ? (
          <section className="wpiPlanResult">
            <div>
              <span>Risk score</span>
              <strong>{state.plan.riskScore}/100</strong>
            </div>
            <div>
              <span>Priority</span>
              <strong>{state.plan.riskBand}</strong>
            </div>
            <div>
              <span>Next inspection</span>
              <strong>{state.plan.nextInspectionDate}</strong>
            </div>
            <p>{state.plan.planningBasis}</p>
          </section>
        ) : null}

        <footer className="wpiFormFooter">
          <p>
            Saving recalculates the checklist, priority and next inspection date.
            Existing administrator access is not changed.
          </p>
          <button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : programme?.id
                ? "Save and recalculate"
                : "Create programme"}
          </button>
        </footer>
      </form>
    </>
  );
}

function PersonSelect({ name, label, guidance, people, value }) {
  return (
    <label className="wpiField">
      <span>{label}</span>
      <select name={name} required defaultValue={value || ""}>
        <option value="">Select Company User</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.label}
            {person.position ? ` · ${person.position}` : ""}
          </option>
        ))}
      </select>
      <small>{guidance}</small>
    </label>
  );
}
