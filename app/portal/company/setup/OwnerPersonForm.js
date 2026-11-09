"use client";
import { useActionState } from "react";
import { addOwnerPerson } from "./actions";
export default function OwnerPersonForm({firstName = "", lastName = "", email}) {
  const [state, action, pending] = useActionState(addOwnerPerson, null);
  return <form action={action} style={{marginBottom: 24}}><h3>Add yourself to your company directory</h3><p>Use your existing login ({email}) for site and asset responsibilities. No invitation or additional login is created.</p>
    <label>First name<input name="first_name" required maxLength={100} defaultValue={firstName}/></label>
    <label>Last name<input name="last_name" required maxLength={100} defaultValue={lastName}/></label>
    {state?.error && <p role="alert">{state.error}</p>}{state?.success && <p role="status">{state.success}</p>}
    <button disabled={pending || Boolean(state?.success)}>{pending ? "Saving…" : "Add my details"}</button>
  </form>;
}
