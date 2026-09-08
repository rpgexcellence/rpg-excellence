"use client";
import { useState } from "react";
const standards = [
  ["ISO 9001:2015/Amd 1:2024", "ISO 9001 — Quality Management"],
  ["ISO 14001:2026", "ISO 14001 — Environmental Management"],
  ["ISO 45001:2018", "ISO 45001 — Occupational Health & Safety"],
  ["ISO/IEC 17024:2026", "ISO/IEC 17024 — Certification of Persons"],
];
export default function SingleAssessmentButton() {
  const [standard,setStandard]=useState(standards[0][0]);
  const [loading,setLoading]=useState(false);
  async function purchase(){if(loading)return;try{setLoading(true);const response=await fetch("/api/stripe/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({purchaseType:"single_assessment",standard})});const data=await response.json().catch(()=>null);if(response.status===401){const login=new URL("/portal/login",window.location.origin);login.searchParams.set("next",`${window.location.pathname}${window.location.search}`);login.searchParams.set("purchase","single_assessment");login.searchParams.set("standard",standard);window.location.assign(login.toString());return}if(!response.ok||!data?.url)throw new Error(data?.error||"Unable to start checkout.");window.location.assign(data.url)}catch(error){alert(error instanceof Error?error.message:"Unable to start checkout.");setLoading(false)}}
  return <div style={{display:"grid",gap:12}}><label htmlFor="single-assessment-standard" style={{fontWeight:800}}>Choose your assessment</label><select id="single-assessment-standard" value={standard} onChange={(e)=>setStandard(e.target.value)} style={{padding:13,border:"1px solid #cbd7e6",borderRadius:9,background:"white"}}>{standards.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button type="button" className="button" onClick={purchase} disabled={loading} aria-busy={loading} style={{border:0,cursor:loading?"wait":"pointer"}}>{loading?"Opening secure checkout…":"Purchase assessment — £129"}</button></div>;
}
