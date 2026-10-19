"use client";

import { useActionState } from "react";

export default function ProgrammeActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="wpiProgrammeForm"
      aria-busy={pending}
    >
      {children}

      {state?.error ? (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            border: "1px solid #f0b6b6",
            borderRadius: 8,
            background: "#fff2f2",
            color: "#922525",
            lineHeight: 1.6,
            overflowWrap: "anywhere",
          }}
        >
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div
          role="status"
          style={{
            padding: "12px 14px",
            border: "1px solid #acd7bd",
            borderRadius: 8,
            background: "#effaf3",
            color: "#195c36",
            lineHeight: 1.6,
          }}
        >
          {state.success}
        </div>
      ) : null}

      <button
        className="wpiButton primary"
        type="submit"
        disabled={pending}
        style={pending ? { opacity: 0.7, cursor: "wait" } : undefined}
      >
        <span role="status" aria-live="polite">
          {pending ? pendingLabel : submitLabel}
        </span>
      </button>
    </form>
  );
}
