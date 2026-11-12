"use client";
import {useActionState} from "react";
import {saveSoaControlWithFeedback} from "./actions";
export default function SoaControlForm({children}){
 const [state,action,pending]=useActionState(saveSoaControlWithFeedback,null);
 return <form action={action} encType="multipart/form-data" aria-busy={pending}>{state?.error&&<div role="alert" className="soaWorkflowNotice">{state.error}</div>}<fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0}}>{children}</fieldset>{pending&&<p role="status">Saving control, assignments, links and evidence…</p>}</form>;
}
