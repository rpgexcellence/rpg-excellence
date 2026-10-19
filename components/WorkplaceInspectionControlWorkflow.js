"use client";

import { useActionState } from "react";

const INITIAL = { error: "", success: "" };

function Message({ state }) {
  if (state?.error) {
    return (
      <div className="wpiMessage error" role="alert">
        <strong>Decision not saved</strong>
        <span>{state.error}</span>
      </div>
    );
  }
  if (state?.success) {
    return (
      <div className="wpiMessage success" role="status">
        <strong>Record updated</strong>
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

function ReviewControl({ inspection, action, enabled }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  if (inspection.status !== "awaiting_review") return null;

  return (
    <section className="wpiPanel wpiWorkflowPanel">
      <div className="wpiSectionHead">
        <div>
          <small>INDEPENDENT REVIEW</small>
          <h2>Fieldwork decision</h2>
          <p>
            Confirm that the scope was completed, evidence is adequate and every
            applicable finding has a controlled action.
          </p>
        </div>
        <span className="wpiTag amber">Awaiting review</span>
      </div>

      {enabled ? (
        <form action={formAction} className="wpiWorkflowForm">
          <input type="hidden" name="inspection_id" value={inspection.id} />
          <label className="wpiField">
            <span>Review decision *</span>
            <select name="review_decision" required defaultValue="">
              <option value="">Select decision</option>
              <option value="approved">Approve fieldwork</option>
              <option value="returned">Return for correction</option>
            </select>
          </label>
          <label className="wpiField wide">
            <span>Reviewer comment</span>
            <textarea
              name="review_comment"
              rows="4"
              maxLength="3000"
              placeholder="Record the evidence reviewed, conclusion, or corrections required. A comment is mandatory when returning the inspection."
            />
          </label>
          <Message state={state} />
          <div className="wpiWorkflowActions">
            <button className="wpiButton primary" disabled={pending}>
              {pending ? "Saving decision…" : "Save review decision"}
            </button>
          </div>
        </form>
      ) : (
        <div className="wpiMessage">
          <strong>Assigned reviewer action</strong>
          <span>
            The review decision is available only to the Company User assigned
            as Independent Reviewer.
          </span>
        </div>
      )}
    </section>
  );
}

function CompletionControl({ inspectionId, item, action, enabled }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  if (!["open", "in_progress"].includes(item.status)) return null;

  return (
    <article className="wpiWorkflowCard">
      <header>
        <div>
          <strong>{item.action_reference}</strong>
          <small>Action-owner completion</small>
        </div>
        <span className="wpiTag amber">{item.status.replaceAll("_", " ")}</span>
      </header>
      <p>{item.action_text}</p>
      {enabled ? (
        <form action={formAction} className="wpiWorkflowForm compact">
          <input type="hidden" name="inspection_id" value={inspectionId} />
          <input type="hidden" name="action_id" value={item.id} />
          <label className="wpiField wide">
            <span>Completion evidence *</span>
            <textarea
              name="completion_evidence"
              rows="3"
              maxLength="3000"
              required
              placeholder="Describe the completed control and reference the uploaded evidence, document, photograph, record or secure link."
            />
          </label>
          <label className="wpiField wide">
            <span>Completion comment</span>
            <textarea
              name="completion_comment"
              rows="2"
              maxLength="3000"
              placeholder="Add relevant implementation details or residual limitations."
            />
          </label>
          <Message state={state} />
          <div className="wpiWorkflowActions">
            <button className="wpiButton primary" disabled={pending}>
              {pending ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      ) : (
        <small>Only the assigned Company User can submit this action.</small>
      )}
    </article>
  );
}

function VerificationControl({ inspectionId, item, action, enabled }) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  if (item.status !== "awaiting_verification") return null;

  return (
    <article className="wpiWorkflowCard">
      <header>
        <div>
          <strong>{item.action_reference}</strong>
          <small>Independent effectiveness verification</small>
        </div>
        <span className="wpiTag amber">Awaiting verification</span>
      </header>
      <p>{item.action_text}</p>
      {item.completion_evidence ? (
        <div className="wpiGuidance">
          <strong>Completion evidence</strong>
          <p>{item.completion_evidence}</p>
        </div>
      ) : null}
      {enabled ? (
        <form action={formAction} className="wpiWorkflowForm compact">
          <input type="hidden" name="inspection_id" value={inspectionId} />
          <input type="hidden" name="action_id" value={item.id} />
          <label className="wpiField">
            <span>Effectiveness result *</span>
            <select name="effectiveness_result" required defaultValue="">
              <option value="">Select result</option>
              <option value="effective">Effective</option>
              <option value="not_effective">Not effective — return to owner</option>
            </select>
          </label>
          <label className="wpiField wide">
            <span>Verification comment *</span>
            <textarea
              name="verification_comment"
              rows="3"
              maxLength="3000"
              required
              placeholder="Record what was checked, the evidence sampled and why the action is or is not effective."
            />
          </label>
          <Message state={state} />
          <div className="wpiWorkflowActions">
            <button className="wpiButton primary" disabled={pending}>
              {pending ? "Recording verification…" : "Save verification"}
            </button>
          </div>
        </form>
      ) : (
        <small>Only the assigned independent verifier can record this decision.</small>
      )}
    </article>
  );
}

export default function WorkplaceInspectionControlWorkflow({
  inspection,
  actions = [],
  currentPersonId = null,
  reviewAction,
  completeAction,
  verifyAction,
}) {
  const activeActions = actions.filter(
    (item) => !["closed", "cancelled"].includes(item.status),
  );
  const showWorkflow =
    inspection.status === "awaiting_review" || activeActions.length > 0;

  if (!showWorkflow) {
    return inspection.status === "completed" ? (
      <section className="wpiPanel wpiWorkflowPanel">
        <div className="wpiMessage success">
          <strong>Controlled inspection complete</strong>
          <span>
            Fieldwork was independently reviewed and all applicable actions were
            verified effective.
          </span>
        </div>
      </section>
    ) : null;
  }

  return (
    <div className="wpiWorkflowStack">
      <ReviewControl
        inspection={inspection}
        action={reviewAction}
        enabled={currentPersonId === inspection.reviewer_person_id}
      />

      {activeActions.length ? (
        <section className="wpiPanel wpiWorkflowPanel">
          <div className="wpiSectionHead">
            <div>
              <small>CONTROLLED ACTION WORKFLOW</small>
              <h2>Completion and effectiveness</h2>
              <p>
                Action owners submit evidence. A different assigned Company User
                verifies whether the control is effective.
              </p>
            </div>
            <span className="wpiTag amber">{activeActions.length} open</span>
          </div>
          <div className="wpiWorkflowList">
            {activeActions.map((item) =>
              item.status === "awaiting_verification" ? (
                <VerificationControl
                  key={item.id}
                  inspectionId={inspection.id}
                  item={item}
                  action={verifyAction}
                  enabled={currentPersonId === item.verifier_person_id}
                />
              ) : (
                <CompletionControl
                  key={item.id}
                  inspectionId={inspection.id}
                  item={item}
                  action={completeAction}
                  enabled={currentPersonId === item.responsible_person_id}
                />
              ),
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
