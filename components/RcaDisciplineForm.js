"use client";

import { useActionState, startTransition } from "react";

export default function RcaDisciplineForm({ action, children }) {
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
