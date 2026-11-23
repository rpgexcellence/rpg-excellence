"use server";

import { redirect } from "next/navigation";
import { startInspection } from "./[id]/actions";

export async function startDashboardInspection(previousState,formData){
  const result=await startInspection(previousState,formData);
  if(result.success){
    const id=encodeURIComponent(String(formData.get("inspection_id")||"").trim());
    redirect("/portal/health-safety/workplace-inspections/"+id+"#inspection-checklist");
  }
  return result;
}
