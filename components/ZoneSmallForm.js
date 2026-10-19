'use client';
import { useActionState } from 'react';
export default function ZoneSmallForm({action,children,label='Save'}) {
 const [state,formAction,pending]=useActionState(action,null);
 return <form action={formAction} className="zone-form">{children}{state?.error&&<p className="zone-error" role="alert">{state.error}</p>}{state?.success&&<p role="status">{state.success}</p>}<button className="zone-button" disabled={pending}>{pending?'Saving…':label}</button></form>;
}
