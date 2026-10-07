"use client";

import { useActionState, startTransition } from "react";
import {
  saveDiscipline,
  addCorrectiveAction,
  addCauseHypothesis,
  saveCauseProfile,
} from "../app/portal/rca/[id]/actions";

const formActions = { saveDiscipline, addCorrectiveAction, addCauseHypothesis, saveCauseProfile };

export default function RcaDisciplineForm({ actionName, children }) {
  const action = Object.prototype.hasOwnProperty.call(formActions, actionName) ? formActions[actionName] : null;
  if (typeof action !== "function") {
    return <div role="alert" style={{ padding: "12px 14px", borderRadius: 10, background: "#fff1f0", color: "#b42318", lineHeight: 1.5 }}>This form could not load its save action. Refresh the page after the deployment completes.</div>;
  }
  return <ConnectedForm action={action}>{children}</ConnectedForm>;
}

function ConnectedForm({ action, children }) {
  const [state, formAction, pending] = useActionState(action, null);
  return <form onSubmit={event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.set("intent", event.nativeEvent.submitter?.value || "save");
    startTransition(() => formAction(data));
  }} aria-busy={pending}>
    {state?.error && <p role="alert" style={{ padding: "12px 14px", border: "1px solid #fda29b", borderRadius: 10, background: "#fff1f0", color: "#b42318", lineHeight: 1.5 }}>{state.error}</p>}
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
    {pending && <p role="status" style={{ color: "#607089" }}>Saving…</p>}
  </form>;
}
