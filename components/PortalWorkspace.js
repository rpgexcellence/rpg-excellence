"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navigationForAccess, portalGroupActive, portalActiveChild, portalStandalone } from "../lib/portalNavigation";
function Sidebar({path,search="",onNavigate,navigation}) {
  const [expanded,setExpanded]=useState(()=>Object.fromEntries(navigation.map((group)=>[group.id,Boolean(group.expanded||portalGroupActive(group,path))])));
  const currentLink=useRef(null);
  useEffect(()=>{setExpanded((old)=>({...old,...Object.fromEntries(navigation.filter((g)=>portalGroupActive(g,path)).map((g)=>[g.id,true]))}));},[path,search,navigation]);
  useEffect(()=>{const link=currentLink.current,scroller=link?.closest(".rpgPortalSidebar");if(!link||!scroller||link.closest("[hidden]"))return;const a=link.getBoundingClientRect(),b=scroller.getBoundingClientRect();if(a.top<b.top+70||a.bottom>b.bottom-20)scroller.scrollTop+=a.top-b.top-120;},[path,search,expanded]);
  return <><Link className="rpgPortalBrand" href="/portal" onClick={onNavigate}><b>RPG</b> Excellence</Link><small className="rpgPortalCaption">ASSURANCE WORKSPACE</small><nav className="rpgPortalNav" aria-label="Assurance workspace navigation">{navigation.map((group)=>{const active=portalGroupActive(group,path),child=portalActiveChild(group,path,search),open=expanded[group.id];return <div className="rpgPortalGroup" key={group.id}><div className={`rpgPortalGroupHeading ${active?"active":""}`}><Link className="rpgPortalMainLink" href={group.href} aria-current={active?"location":undefined} onClick={onNavigate}><i aria-hidden="true"/><span>{group.label}</span></Link>{group.children&&<button type="button" className="rpgPortalExpand" aria-expanded={Boolean(open)} aria-controls={`portal-group-${group.id}`} aria-label={`${open?"Collapse":"Expand"} ${group.label}`} onClick={()=>setExpanded((old)=>({...old,[group.id]:!old[group.id]}))}><span aria-hidden="true">{open?"−":"+"}</span></button>}</div>{group.children&&<div id={`portal-group-${group.id}`} className="rpgPortalSub" hidden={!open}>{group.children.map((entry)=><Link key={entry.href} href={entry.href} ref={child===entry.href&&active?currentLink:undefined} aria-current={child===entry.href&&active?"page":undefined} className={child===entry.href&&active?"current":""} onClick={onNavigate}>{entry.label}</Link>)}</div>}</div>;})}</nav><div className="rpgPortalSideFoot"><strong>RPG Excellence</strong><span>Connected assurance workspace</span><form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div></>;
}
function QuerySidebar(props){const search=useSearchParams();return <Sidebar {...props} search={search?.toString()||""}/>;}
export default function PortalWorkspace({children,access}) {
  const path=usePathname()||"/portal",[open,setOpen]=useState(false),toggle=useRef(null);
  const navigation=navigationForAccess(access);
  useEffect(()=>setOpen(false),[path]);
  if(portalStandalone(path))return <>{children}</>;
  const close=()=>{setOpen(false);toggle.current?.focus();};
  return <div className="rpgPortalShell"><a href="#rpg-portal-content" className="rpgPortalSkip">Skip to workspace</a><header className="rpgPortalMobile"><Link href="/portal"><b>RPG</b> Excellence</Link><button ref={toggle} type="button" aria-controls="rpg-portal-sidebar" aria-expanded={open} onClick={()=>setOpen((v)=>!v)}>{open?"Close navigation":"Menu"}<span aria-hidden="true">{open?" ×":" ☰"}</span></button></header><aside id="rpg-portal-sidebar" className={`rpgPortalSidebar ${open?"mobileOpen":""}`} onKeyDown={(e)=>{if(e.key==="Escape"){e.preventDefault();close();}}}><Suspense fallback={<Sidebar path={path} navigation={navigation} onNavigate={()=>setOpen(false)}/>}><QuerySidebar path={path} navigation={navigation} onNavigate={()=>setOpen(false)}/></Suspense></aside><div id="rpg-portal-content" tabIndex={-1} className="rpgPortalContent">{children}</div></div>;
}
