import Link from "next/link";
import {
  INCIDENT_DOMAINS,
  INCIDENT_TYPES,
} from "../../../../lib/incident-policy.mjs";
import {
  incidentCase,
  incidentPeople,
  checkResult,
} from "../../../../lib/incidents";
import {
  IncidentHeader,
  IncidentBadge,
  PersonSelect,
  CaseHidden,
  personName,
  dateTime,
  pretty,
} from "../../../../components/IncidentUI";
import { IncidentActionForm } from "../../../../components/IncidentForm";
import {
  incidentCommand,
  uploadIncidentEvidence,
  retryInspectionPlanning,
} from "../actions";
const local = (value) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";
function Text({
  name,
  label,
  value = "",
  rows = 3,
  required = false,
  minLength,
}) {
  return (
    <label>
      {label}
      <textarea
        name={name}
        defaultValue={value}
        rows={rows}
        maxLength={6000}
        required={required}
        minLength={minLength}
      />
    </label>
  );
}
function Choice({ name, label, value, values }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value}>
        {values.map((v) => (
          <option key={v} value={v}>
            {pretty(v)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Resources({ people, task = {} }) {
  return (
    <>
      <div className="incidentGrid">
        <PersonSelect
          people={people}
          name="owner_person_id"
          label="Accountable action owner"
          value={task.owner_person_id}
        />
        <PersonSelect
          people={people}
          name="verifier_person_id"
          label="Independent action verifier"
          value={task.verifier_person_id}
        />
        <label>
          Due date / time (UTC)
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={local(task.due_at)}
            required
          />
        </label>
        <Choice
          name="resource_decision"
          label="Resource allocation decision"
          value={task.resource_decision || "allocated"}
          values={["requested", "allocated", "unavailable"]}
        />
        <label>
          Approved budget
          <input
            type="number"
            name="budget_amount"
            min="0"
            step="0.01"
            defaultValue={task.budget_amount || 0}
          />
        </label>
        <label>
          Currency (ISO code)
          <input
            name="currency"
            pattern="[A-Z]{3}"
            maxLength={3}
            defaultValue={task.currency || "GBP"}
          />
        </label>
        <label>
          Allocated effort (hours)
          <input
            name="estimated_hours"
            type="number"
            min="0"
            step="0.25"
            defaultValue={task.estimated_hours || 0}
          />
        </label>
        <PersonSelect
          people={people}
          name="support_person_ids"
          label="Supporting resources (multiple selection)"
          value={task.support_person_ids}
          required={false}
          multiple
        />
      </div>
      <Text
        name="resources"
        label="People, equipment, specialist support and constraints"
        value={task.resources}
      />
    </>
  );
}
export default async function IncidentDetail({ params }) {
  const { id } = await params;
  const c = await incidentCase(id),
    r = c.report,
    people = await incidentPeople(c);
  c.person = c.person || people.find((p) => p.user_id === c.user.id) || null;
  const [tasks, events, evidence] = await Promise.all(
    ["incident_tasks", "incident_events", "incident_evidence"].map(
      async (table) =>
        checkResult(
          await c.admin
            .from(table)
            .select("*")
            .eq("organization_id", c.organization.id)
            .eq("incident_id", id)
            .order("created_at"),
        ) || [],
    ),
  );
  const contact = c.incidentAdministrator
    ? checkResult(
        await c.admin
          .from("incident_report_contacts")
          .select("name,email,phone,consent_at")
          .eq("incident_id", id)
          .eq("organization_id", c.organization.id)
          .maybeSingle(),
      )
    : null;
  const name = (id) => personName(people.find((p) => p.id === id));
  const terminal = ["closed", "rejected", "duplicate"].includes(r.status);
  let plans = [],
    packs = [],
    assessments = [];
  if (c.incidentAdministrator) {
    [plans, packs, assessments] = await Promise.all(
      [
        c.admin
          .from("bcp_plans")
          .select("id,plan_title")
          .eq("organization_id", c.organization.id)
          .order("plan_title"),
        c.admin
          .from("hs_inspection_question_packs")
          .select("pack_code,title")
          .eq("active", true)
          .or(
            "organization_id.is.null,organization_id.eq." + c.organization.id,
          ),
        c.admin
          .from("hs_risk_assessments")
          .select("id,title")
          .eq("organization_id", c.organization.id)
          .eq("administration_location_id", String(r.site_id)),
      ].map(async (q) => {
        const result = await q;
        return result.error ? [] : result.data || [];
      }),
    );
  }
  return (
    <>
      <IncidentHeader
        title={r.reference + " · " + r.title}
        description={r.location_label}
        admin={c.incidentAdministrator}
      />
      <p>
        <IncidentBadge value={r.status} />{" "}
        <IncidentBadge value={r.criticality || r.reported_criticality} /> ·{" "}
        {r.triaged_at ? "Reviewed priority" : "Unconfirmed reporter urgency"} ·
        Version {r.version} ·{" "}
        <Link href={"/portal/incidents/" + id}>Refresh case</Link>
      </p>
      <div className="incidentGrid">
        <section className="incidentCard">
          <h2>Original report</h2>
          <dl>
            <dt>Reporting areas</dt>
            <dd>{r.domains.map(pretty).join(" · ")}</dd>
            <dt>Event type</dt>
            <dd>{pretty(r.report_type)}</dd>
            <dt>Occurred</dt>
            <dd>{dateTime(r.occurred_at)}</dd>
            <dt>Received</dt>
            <dd>{dateTime(r.created_at)}</dd>
            <dt>Manager informed</dt>
            <dd>
              {pretty(r.manager_notified)}
              {r.manager_details ? " · " + r.manager_details : ""}
            </dd>
            <dt>Immediate danger</dt>
            <dd>
              {r.immediate_danger ? "Flagged by reporter" : "Not flagged"}
            </dd>
            <dt>Reporter</dt>
            <dd>
              {r.anonymous
                ? "Anonymous"
                : "Contact details provided / historic account report"}
            </dd>
          </dl>
          <p className="incidentPre">{r.description}</p>
          <h3>Immediate action</h3>
          <p className="incidentPre">{r.immediate_action || "None recorded"}</p>
          {contact && (
            <details>
              <summary>Restricted contact details</summary>
              <p>
                {contact.name}
                <br />
                {contact.email}
                <br />
                {contact.phone}
              </p>
              <small>
                Follow-up consent recorded {dateTime(contact.consent_at)}
              </small>
            </details>
          )}
        </section>
        <section className="incidentCard">
          <h2>Response & accountability</h2>
          {r.planning_sync_status !== "not_applicable" && (
            <p
              className={
                r.planning_sync_status === "failed" ||
                r.planning_sync_status === "pending"
                  ? "incidentNotice"
                  : "incidentMuted"
              }
            >
              Inspection planning: {pretty(r.planning_sync_status)}.{" "}
              {r.planning_sync_message}
            </p>
          )}
          <dl>
            <dt>Investigator</dt>
            <dd>{name(r.investigator_person_id)}</dd>
            <dt>Independent verifier</dt>
            <dd>{name(r.verifier_person_id)}</dd>
            <dt>Team</dt>
            <dd>{r.team_person_ids.map(name).join(", ") || "Not assigned"}</dd>
            <dt>Actual / potential</dt>
            <dd>
              {r.actual_severity || "—"} / {r.potential_severity || "—"} ·
              likelihood {r.likelihood || "—"} · score {r.risk_score || "—"}/25
            </dd>
            <dt>Regulatory assessment</dt>
            <dd>
              {pretty(r.regulatory_decision)} ·{" "}
              {r.regulatory_reason || "Pending"}
            </dd>
            <dt>Continuity</dt>
            <dd>{pretty(r.continuity_decision)}</dd>
          </dl>
          {r.linked_rca_case_id && (
            <p>
              <Link href={"/portal/rca/" + r.linked_rca_case_id}>
                Linked CAPA-8D case →
              </Link>
            </p>
          )}
          {r.linked_security_incident_id && (
            <p>
              <Link
                href={
                  "/portal/information-security/incidents/" +
                  r.linked_security_incident_id
                }
              >
                Linked security incident →
              </Link>
            </p>
          )}
          {r.linked_bcp_plan_id && (
            <p>
              <Link
                href={
                  "/portal/business-continuity/plans?id=" + r.linked_bcp_plan_id
                }
              >
                Linked continuity plan →
              </Link>
            </p>
          )}
          <p className="incidentMuted">
            Linked modules retain their own permissions and approval gates.
            Continuity activation and regulatory notifications require a
            competent human decision.
          </p>
        </section>
      </div>
      {!terminal && c.incidentAdministrator && (
        <details className="incidentCard" open={!r.triaged_at}>
          <summary>Triage, classification & escalation decisions</summary>
          <p className="incidentMuted">
            Actual and potential consequence: 1 negligible, 2 minor, 3 moderate,
            4 major, 5 catastrophic. Likelihood of recurrence: 1 rare to 5
            almost certain. Priority = higher consequence × likelihood;
            immediate danger overrides to critical. Apply the organisation's
            approved assessment criteria.
          </p>
          <IncidentActionForm
            action={incidentCommand}
            label="Save triage decision"
          >
            <CaseHidden report={r} command="triage" />
            <fieldset>
              <legend>Reviewed reporting areas</legend>
              <div className="incidentChoices">
                {INCIDENT_DOMAINS.map(([k, v]) => (
                  <label key={k}>
                    <input
                      name="domains"
                      type="checkbox"
                      value={k}
                      defaultChecked={r.domains.includes(k)}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Reviewed event classification
              <select name="report_type" defaultValue={r.report_type}>
                {INCIDENT_TYPES.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="incidentGrid">
              {[
                ["actual_severity", "Actual consequence"],
                ["potential_severity", "Potential consequence"],
                ["likelihood", "Likelihood of recurrence"],
              ].map(([k, label]) => (
                <label key={k}>
                  {label}
                  <select name={k} defaultValue={r[k] || ""} required>
                    <option value="">Select 1–5</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <Choice
                name="status"
                label="Workflow status"
                value={r.triaged_at ? r.status : "triaged"}
                values={[
                  "triaged",
                  "investigating",
                  "actions_open",
                  "awaiting_verification",
                  "rejected",
                  "duplicate",
                ]}
              />
              <PersonSelect
                people={people}
                name="investigator_person_id"
                label="Investigator"
                value={r.investigator_person_id}
              />
              <PersonSelect
                people={people}
                name="verifier_person_id"
                label="Independent case verifier"
                value={r.verifier_person_id}
              />
              <PersonSelect
                people={people}
                name="team_person_ids"
                label="Response team (include action owners / verifiers with assigned scope)"
                value={r.team_person_ids}
                required={false}
                multiple
              />
              <label>
                Duplicate of (report ID, if duplicate)
                <input
                  name="duplicate_of"
                  defaultValue={r.duplicate_of || ""}
                />
              </label>
            </div>
            <Text
              name="triage_notes"
              label="Triage decision and rationale"
              value={r.triage_notes}
              required
              minLength={10}
            />
            <div className="incidentGrid">
              <Choice
                name="regulatory_decision"
                label="External reporting assessment"
                value={r.regulatory_decision}
                values={["not_assessed", "not_required", "required"]}
              />
              <label>
                Authority / reporting channel
                <input
                  name="regulatory_authority"
                  defaultValue={r.regulatory_authority}
                />
              </label>
              <label>
                Reporting deadline (UTC)
                <input
                  type="datetime-local"
                  name="regulatory_due_at"
                  defaultValue={local(r.regulatory_due_at)}
                />
              </label>
              <label>
                Reported at (UTC)
                <input
                  type="datetime-local"
                  name="regulatory_reported_at"
                  defaultValue={local(r.regulatory_reported_at)}
                />
              </label>
              <label>
                External report reference
                <input
                  name="regulatory_reference"
                  defaultValue={r.regulatory_reference}
                />
              </label>
              <Choice
                name="continuity_decision"
                label="Continuity response decision"
                value={r.continuity_decision}
                values={[
                  "not_assessed",
                  "not_required",
                  "monitor",
                  "consider_activation",
                  "activated",
                ]}
              />
              <label>
                Linked continuity plan
                <select
                  name="linked_bcp_plan_id"
                  defaultValue={r.linked_bcp_plan_id || ""}
                >
                  <option value="">None</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Inspection question pack to reconsider
                <select name="pack_code" defaultValue={r.pack_code || ""}>
                  <option value="">Core / current programme packs</option>
                  {packs.map((p) => (
                    <option key={p.pack_code} value={p.pack_code}>
                      {p.title || p.pack_code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Text
              name="regulatory_reason"
              label="Reason, jurisdiction and assessment of reporting obligations"
              value={r.regulatory_reason}
            />
            <p className="incidentMuted">
              Deadlines are entered by the responsible professional; no
              automatic legal report is sent. A triaged QHSE event refreshes
              linked site / zone inspection risk signals and planning.
              Security-only reports never enter the wider inspection narrative.
            </p>
          </IncidentActionForm>
        </details>
      )}
      {!terminal &&
        (c.incidentAdministrator ||
          c.person?.id === r.investigator_person_id) && (
          <section className="incidentCard">
            <h2>Investigation & learning</h2>
            <IncidentActionForm
              action={incidentCommand}
              label="Save investigation"
            >
              <CaseHidden report={r} command="investigate" />
              <Text
                name="investigation_summary"
                label="Facts, timeline, impact, evidence and affected services / people"
                value={r.investigation_summary}
                rows={5}
              />
              <Text
                name="cause_summary"
                label="Immediate, underlying and systemic causes"
                value={r.cause_summary}
              />
              <Text
                name="lessons_learned"
                label="Lessons, control improvements and communication"
                value={r.lessons_learned}
              />
              <fieldset>
                <legend>
                  Assessed consequences (update as evidence develops)
                </legend>
                <div className="incidentGrid">
                  <label>
                    People injured (count)
                    <input
                      name="injured_count"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={r.injured_count || 0}
                    />
                  </label>
                  <label>
                    Lost working days (confirmed)
                    <input
                      name="lost_time_days"
                      type="number"
                      min="0"
                      step="0.5"
                      defaultValue={r.lost_time_days || 0}
                    />
                  </label>
                  <label>
                    Business interruption (minutes)
                    <input
                      name="disruption_minutes"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={r.disruption_minutes || 0}
                    />
                  </label>
                  <label className="incidentCheck">
                    <input
                      name="personal_data_suspected"
                      type="checkbox"
                      defaultChecked={r.personal_data_suspected}
                    />
                    Personal data involvement suspected
                  </label>
                </div>
                <p>Security impact</p>
                <div className="incidentChoices">
                  {["confidentiality", "integrity", "availability"].map((k) => (
                    <label key={k}>
                      <input
                        name="security_impacts"
                        type="checkbox"
                        value={k}
                        defaultChecked={r.security_impacts?.includes(k)}
                      />
                      {pretty(k)}
                    </label>
                  ))}
                </div>
                <label>
                  Affected services, assets, products or environmental receptors
                  <textarea
                    name="affected_services"
                    maxLength={2000}
                    defaultValue={r.affected_services || ""}
                  />
                </label>
              </fieldset>
            </IncidentActionForm>
          </section>
        )}
      {(terminal ||
        (!c.incidentAdministrator &&
          c.person?.id !== r.investigator_person_id)) && (
        <section className="incidentCard">
          <h2>Investigation & learning</h2>
          <p className="incidentPre">
            {r.investigation_summary || "Not yet recorded"}
          </p>
          <h3>Contributing causes</h3>
          <p className="incidentPre">{r.cause_summary || "Not yet recorded"}</p>
          <h3>Learning</h3>
          <p className="incidentPre">
            {r.lessons_learned || "Not yet recorded"}
          </p>
        </section>
      )}
      <section className="incidentCard">
        <h2>Actions, resources & independent verification</h2>
        {!tasks.length && <p>No actions allocated yet.</p>}
        {tasks.map((t) => (
          <article className="incidentTask" key={t.id}>
            <h3>{t.title}</h3>
            <p>
              <IncidentBadge value={t.status} /> · {pretty(t.task_type)} · Due{" "}
              {dateTime(t.due_at)}
            </p>
            <p>
              Owner: {name(t.owner_person_id)} · Verifier:{" "}
              {name(t.verifier_person_id)}
              <br />
              Resources: {t.resources || "None specified"}
              <br />
              {t.currency} {t.budget_amount} · {t.estimated_hours} hours ·{" "}
              {pretty(t.resource_decision)}
            </p>
            {t.completion_evidence && (
              <p className="incidentPre">
                <strong>Completion evidence:</strong> {t.completion_evidence}
              </p>
            )}
            {t.verification_note && (
              <p className="incidentPre">
                <strong>Verification:</strong> {t.verification_note}
              </p>
            )}
            {!terminal &&
              ["open", "in_progress"].includes(t.status) &&
              (c.incidentAdministrator ||
                c.person?.id === t.owner_person_id) && (
                <IncidentActionForm
                  action={incidentCommand}
                  label="Submit action evidence"
                >
                  <CaseHidden report={r} command="complete_task" />
                  <input type="hidden" name="task_id" value={t.id} />
                  <Text
                    name="note"
                    label="Completion evidence and outcome"
                    required
                    minLength={10}
                  />
                </IncidentActionForm>
              )}
            {!terminal &&
              t.status === "awaiting_verification" &&
              c.person?.id === t.verifier_person_id && (
                <IncidentActionForm
                  action={incidentCommand}
                  label="Record independent review"
                >
                  <CaseHidden report={r} command="verify_task" />
                  <input type="hidden" name="task_id" value={t.id} />
                  <Choice
                    name="command"
                    label="Decision"
                    value="verify_task"
                    values={["verify_task", "return_task"]}
                  />
                  <Text
                    name="note"
                    label="Effectiveness evidence and rationale"
                    required
                    minLength={10}
                  />
                </IncidentActionForm>
              )}
            {!terminal &&
              c.incidentAdministrator &&
              ["open", "in_progress"].includes(t.status) && (
                <details>
                  <summary>Reallocate people, budget or due date</summary>
                  <IncidentActionForm
                    action={incidentCommand}
                    label="Save resource allocation"
                  >
                    <CaseHidden report={r} command="reallocate_task" />
                    <input type="hidden" name="task_id" value={t.id} />
                    <Resources people={people} task={t} />
                    <Text
                      name="note"
                      label="Reason for reallocation"
                      required
                      minLength={10}
                    />
                  </IncidentActionForm>
                </details>
              )}
            {!terminal &&
              c.incidentAdministrator &&
              !["verified", "cancelled"].includes(t.status) && (
                <details>
                  <summary>Cancel action with rationale</summary>
                  <IncidentActionForm
                    action={incidentCommand}
                    label="Cancel action"
                  >
                    <CaseHidden report={r} command="cancel_task" />
                    <input type="hidden" name="task_id" value={t.id} />
                    <Text
                      name="note"
                      label="Why is this action no longer needed?"
                      required
                      minLength={10}
                    />
                  </IncidentActionForm>
                </details>
              )}
          </article>
        ))}
        {!terminal && c.incidentAdministrator && r.triaged_at && (
          <details>
            <summary>Allocate a new action & resources</summary>
            <IncidentActionForm
              action={incidentCommand}
              label="Allocate action"
            >
              <CaseHidden report={r} command="allocate_task" />
              <label>
                Action title
                <input name="title" minLength={5} maxLength={500} required />
              </label>
              <Choice
                name="task_type"
                label="Purpose"
                value="corrective"
                values={[
                  "containment",
                  "investigation",
                  "corrective",
                  "risk_review",
                  "security_review",
                  "continuity_review",
                ]}
              />
              <Resources people={people} />
              <label>
                Risk assessment to review
                <select name="related_assessment_id">
                  <option value="">None</option>
                  {assessments.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            </IncidentActionForm>
          </details>
        )}
      </section>
      {!terminal && c.incidentAdministrator && r.triaged_at && (
        <section className="incidentCard">
          <h2>Controlled handoffs</h2>
          <p>
            A report stays connected across response, investigation and
            prevention. Existing CAPA and ISMS cases retain their own
            verification workflows.
          </p>
          <div className="incidentGrid">
            {!r.linked_rca_case_id && (
              <IncidentActionForm
                action={incidentCommand}
                label="Create linked CAPA-8D case"
              >
                <CaseHidden report={r} command="create_rca" />
                <p>Escalate recurring, serious or systemic failures to 8D.</p>
              </IncidentActionForm>
            )}
            {!r.linked_security_incident_id &&
              r.domains.includes("information_security") && (
                <IncidentActionForm
                  action={incidentCommand}
                  label="Create linked ISMS incident"
                >
                  <CaseHidden report={r} command="create_security" />
                  <p>
                    Hand off specialist technical response to the security
                    incident module.
                  </p>
                </IncidentActionForm>
              )}
          </div>
          <details>
            <summary>Link an existing CAPA / ISMS case</summary>
            <IncidentActionForm
              action={incidentCommand}
              label="Link existing case"
            >
              <CaseHidden report={r} command="link_rca" />
              <Choice
                name="command"
                label="Case type"
                value="link_rca"
                values={
                  r.domains.includes("information_security")
                    ? ["link_rca", "link_security"]
                    : ["link_rca"]
                }
              />
              <label>
                Existing case ID
                <input name="target_id" required />
              </label>
            </IncidentActionForm>
          </details>
        </section>
      )}
      <section className="incidentCard">
        {c.incidentAdministrator && r.triaged_at && (
          <IncidentActionForm
            action={retryInspectionPlanning}
            label="Refresh inspection planning"
          >
            <input type="hidden" name="id" value={r.id} />
          </IncidentActionForm>
        )}
        <h2>Private evidence</h2>
        <p className="incidentMuted">
          Files are restricted to authorised case readers and downloaded as
          attachments. Avoid unnecessary personal data. Uploads are not
          malware-scanned; use your organisation's secure handling process.
        </p>
        {evidence.map((e) => (
          <p key={e.id}>
            <Link href={`/portal/incidents/${id}/evidence/${e.id}`}>
              {e.file_name} · {Math.ceil(e.size_bytes / 1024)} KB
            </Link>{" "}
            · {dateTime(e.created_at)}
          </p>
        ))}
        {!terminal && (
          <IncidentActionForm
            action={uploadIncidentEvidence}
            label="Upload private evidence"
          >
            <input type="hidden" name="id" value={id} />
            <label>
              JPEG / PNG / WebP / PDF, up to 5 MB
              <input
                type="file"
                name="evidence"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
              />
            </label>
          </IncidentActionForm>
        )}
      </section>
      {c.incidentAdministrator && !terminal && (
        <section className="incidentCard">
          <h2>Reporter progress update</h2>
          <p>
            Only this text and the workflow status are visible to someone with
            the report reference and private key. Exclude names, investigation
            details, vulnerabilities and confidential information.
          </p>
          <IncidentActionForm
            action={incidentCommand}
            label="Publish reporter update"
          >
            <CaseHidden report={r} command="publish_update" />
            <label>
              Public update
              <textarea
                name="public_update"
                defaultValue={r.public_update}
                maxLength={1000}
                rows={3}
              />
            </label>
          </IncidentActionForm>
        </section>
      )}
      <section className="incidentCard">
        <h2>Controlled closure</h2>
        {terminal ? (
          <>
            <p>
              {pretty(r.status)} · {dateTime(r.closed_at)}
            </p>
            {c.incidentAdministrator && (
              <IncidentActionForm action={incidentCommand} label="Reopen case">
                <CaseHidden report={r} command="reopen" />
                <Text
                  name="note"
                  label="Reason for reopening"
                  required
                  minLength={10}
                />
              </IncidentActionForm>
            )}
          </>
        ) : (
          <>
            <p>
              Before closure: complete investigation and causes, verify all
              actions, assess external reporting and continuity, and close
              linked CAPA / ISMS cases. Set the case to awaiting verification.
              Only the assigned independent case verifier with Review access or
              higher can close it.
            </p>
            {c.person?.id === r.verifier_person_id && (
              <IncidentActionForm
                action={incidentCommand}
                label="Independently verify & close"
              >
                <CaseHidden report={r} command="close" />
                <Text
                  name="note"
                  label="Verification evidence and closure rationale"
                  required
                  minLength={10}
                />
              </IncidentActionForm>
            )}
          </>
        )}
      </section>
      <section className="incidentCard">
        <h2>Audit trail</h2>
        <ol className="incidentTimeline">
          {events.map((e) => (
            <li key={e.id}>
              <strong>{pretty(e.event_type)}</strong> · {dateTime(e.created_at)}
              <br />
              <span className="incidentPre">{e.summary}</span>
              {e.event_data && Object.keys(e.event_data).length > 0 && (
                <details>
                  <summary>Decision / resource snapshot</summary>
                  <dl>
                    {Object.entries(e.event_data)
                      .filter(([, v]) => v !== null && v !== "")
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{pretty(key)}</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
