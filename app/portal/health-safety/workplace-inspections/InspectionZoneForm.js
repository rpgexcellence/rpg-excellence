"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UUID } from "../../../../lib/zone-policy.mjs";
import p from "../powra/powra.module.css";
import s from "./inspection-overview.module.css";

export default function InspectionZoneForm(){
  const router=useRouter();
  const [error,setError]=useState("");
  function openZone(event){
    event.preventDefault();
    const value=new FormData(event.currentTarget).get("code").trim();
    let token=value;
    if(!UUID.test(token)){
      try{
        const url=new URL(value);
        token=["https:","http:"].includes(url.protocol) &&
          ["www.rpgexcellence.com","rpgexcellence.com",window.location.hostname].includes(url.hostname)
          ? url.pathname.match(/^\/area\/([^/]+)\/?$/)?.[1]||"" : "";
      }catch{token="";}
    }
    if(!UUID.test(token)){setError("Enter a valid RPG Excellence zone QR link or code.");return;}
    setError("");
    router.push("/portal/health-safety/workplace-inspections?view=zones&zone="+encodeURIComponent(token));
  }
  return <>
    <form className={s.filters} onSubmit={openZone}>
      <label>Zone QR link or code<input name="code" required autoComplete="off"/></label>
      <button className={p.primary}>Find zone inspections</button>
    </form>
    {error&&<p role="alert">{error}</p>}
  </>;
}
