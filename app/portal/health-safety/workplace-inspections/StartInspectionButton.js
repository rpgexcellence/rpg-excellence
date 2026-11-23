"use client";

import { useActionState } from "react";
import { startDashboardInspection } from "./start-fieldwork";
import p from "../powra/powra.module.css";

export default function StartInspectionButton({inspectionId}){
  const [result,action,pending]=useActionState(startDashboardInspection,null);
  return <form action={action}>
    <input type="hidden" name="inspection_id" value={inspectionId}/>
    <button className={p.primary} disabled={pending}>{pending?"Starting…":"Start inspection"}</button>
    {result?.error&&<p role="alert">{result.error}</p>}
  </form>;
}
