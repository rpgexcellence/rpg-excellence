"use client";

import Link from "next/link";
import { useState } from "react";
import { RecordIcon } from "../../../../components/DocumentRecordTabs";
import { active, areas, emptyFilters, filteredChanges, filterValues, inView, optionLabel, overdue, stages, statusLabels, views, words } from "./register-filters.mjs";
import p from "../powra/powra.module.css";
import shared from "../permits/permit-register.module.css";
import s from "./moc-register.module.css";

const root = "/portal/health-safety/moc";
const dates = new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeZone:"UTC"});
const names = {type:["Type","All types"],pathway:["Pathway","All pathways"],area:["Location / area","All areas"],status:["Status","All statuses"]};
const columns = ["Change reference","Title / area","Linked asset","Type","Pathway","Target date","Status","Action"];
const date = value => value && Number.isFinite(Date.parse(value)) ? dates.format(new Date(value)) : "Not recorded";
const compareTargets = (a,b,direction=1) => !a.target_date ? Number(Boolean(b.target_date)) : !b.target_date ? -1 : direction*a.target_date.localeCompare(b.target_date);
const assetName = row => row.asset ? [row.asset.asset_reference,row.asset.asset_name].filter(Boolean).join(" — ") : row.assetUnavailable ? "Asset details unavailable" : "Not linked";
const badge = (text,tone) => <span className={shared.badge+" "+(shared[tone] || s[tone])}>{text}</span>;

function CheckboxFilter({name,label,placeholder,options,selected,onChange}){
  return <div className={s.filter}>
    <span id={"filter-label-"+name}>{label}</span>
    <details name="moc-register-filters" className={s.dropdown}>
      <summary aria-labelledby={"filter-label-"+name+" filter-value-"+name}>
        <span id={"filter-value-"+name}>{selected.length ? selected.length+" selected" : placeholder}</span>
      </summary>
      <fieldset className={s.options} aria-labelledby={"filter-label-"+name}>
        {options.length ? options.map(value=><label className={s.option} key={value}>
          <input type="checkbox" checked={selected.includes(value)}
            onChange={event=>onChange(event.target.checked ? [...selected,value] : selected.filter(item=>item!==value))}/>
          <span>{optionLabel(name,value)}</span>
        </label>) : <p>No options available.</p>}
        {selected.length>0 && <button type="button" className={s.clearGroup} onClick={()=>onChange([])}>Clear {label.toLowerCase()}</button>}
      </fieldset>
    </details>
  </div>;
}

function exportCsv(rows,today){
  const quote = value => {
    const text = String(value ?? "");
    const safe = /^[=+@-]/.test(text.trimStart()) || /^[\t\r\n]/.test(text) ? "'"+text : text;
    return '"'+safe.replaceAll('"','""')+'"';
  };
  const data = [["Reference","Title","Location / area","Linked asset","Type","Pathway","Target date","Status","Overdue"],
    ...rows.map(row=>[row.moc_reference,row.title,areas(row).join(" · "),assetName(row),words(row.change_type),words(row.pathway),
      row.target_date,statusLabels[row.status]||words(row.status),overdue(row,today)?"Yes":"No"])];
  const url = URL.createObjectURL(new Blob([data.map(row=>row.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href=url; link.download="management-of-change-register.csv";
  document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function MocRegister({rows,today,canCreate}){
  const [view,setView] = useState("all");
  const [search,setSearch] = useState("");
  const [filters,setFilters] = useState(emptyFilters);
  const [sort,setSort] = useState(0);
  const count = key=>rows.filter(row=>inView(row,key,today)).length;
  const shown = filteredChanges(rows,{view,today,search,filters});
  if(sort)shown.sort((a,b)=>compareTargets(a,b,sort));
  const targets = rows.filter(row=>active(row)&&row.target_date).sort(compareTargets).slice(0,5);

  return <main className={p.page}>
    <p className={p.crumb}><Link href="/portal/health-safety">Health &amp; Safety Hub</Link> / Management of Change</p>
    <header className={p.hero}>
      <div className={p.identity}><span className={p.iconBox}><RecordIcon name="handover"/></span><div>
        <h1>Management of Change Register</h1><p>Track screening, risk review, approval, implementation and closure.</p>
      </div></div>
      <div className={p.actions}>
        <a className={p.button} href="#change-dashboard"><RecordIcon name="matrix"/>Change dashboard</a>
        <button className={p.button} disabled={!shown.length} onClick={()=>exportCsv(shown,today)}><RecordIcon name="download"/>Export CSV</button>
        {canCreate && <Link className={p.primary} href={root+"/new"}><RecordIcon name="documents"/>New change</Link>}
      </div>
    </header>
    <section className={shared.tiles} aria-label="Change register indicators">
      {views.map(([key,label,tone,icon])=><button key={key} className={p.metric+" "+shared.tile+" "+shared[tone]}
        aria-pressed={view===key} onClick={()=>setView(key)}>
        <span className={p.metricIcon}><RecordIcon name={icon}/></span><span className={p.metricContent}>
          <strong>{count(key)}</strong>{key==="all"?"Total changes":label}</span>
      </button>)}
    </section>
    <section className={p.panel}><h2><RecordIcon name="handover"/>Change pathway</h2>
      <p className={shared.muted}>Select a stage to filter the register.</p>
      <div className={s.path} role="group" aria-label="Change stages">
        {stages.map(([key,label,tone,icon])=><button key={key} className={p.button+" "+s.stage+" "+(shared[tone] || s[tone])}
          aria-pressed={view===key} onClick={()=>setView(view===key?"all":key)}>
          <RecordIcon name={icon}/><span>{label}</span><strong>{count(key)}</strong>
        </button>)}
      </div>
    </section>
    <section className={p.panel} id="controlled-changes">
      <h2><RecordIcon name="clipboard"/>Controlled changes</h2>
      <div className={p.tabs} role="group" aria-label="Register views">
        {views.map(([key,label])=><button key={key} aria-current={view===key?"page":undefined} onClick={()=>setView(key)}>{label} ({count(key)})</button>)}
      </div>
      <div className={s.filters}>
        <label className={s.filter}>Search<input type="search" placeholder="Reference, title, asset or area" value={search} onChange={event=>setSearch(event.target.value)}/></label>
        {Object.entries(names).map(([key,[label,placeholder]])=>{
          const options = [...new Set(rows.flatMap(filterValues[key]).filter(Boolean))].sort((a,b)=>optionLabel(key,a).localeCompare(optionLabel(key,b)));
          return <CheckboxFilter key={key} name={key} label={label} placeholder={placeholder} options={options} selected={filters[key]}
            onChange={values=>setFilters(previous=>({...previous,[key]:values}))}/>;
        })}
        <button className={p.button} onClick={()=>{setSearch("");setFilters(emptyFilters);setView("all");setSort(0);}}>Clear filters</button>
      </div>
      <div className={shared.results}><span role="status">{shown.length} of {rows.length} changes</span>
        <button className={p.button} onClick={()=>setSort(sort===1?-1:1)}><RecordIcon name="calendar"/>
          {sort===1?"Target date · oldest first":sort===-1?"Target date · newest first":"Sort by target date"}</button></div>
      {shown.length ? <div className={p.tableWrap}><table className={p.table}>
        <thead><tr>{columns.map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{shown.map(row=><tr key={row.id}>
          <td data-label={columns[0]}><Link href={root+"/"+row.id}>{row.moc_reference}</Link></td>
          <td data-label={columns[1]}><strong>{row.title}</strong><small>{[row.department,row.affected_area].filter(Boolean).join(" · ")}</small></td>
          <td data-label={columns[2]}>{assetName(row)}{row.asset?.site_location_label && <small>{row.asset.site_location_label}</small>}</td>
          <td data-label={columns[3]}>{words(row.change_type)}</td>
          <td data-label={columns[4]}>{row.pathway ? badge(words(row.pathway),row.pathway==="lite"?"amber":"violet") : "Not recorded"}</td>
          <td data-label={columns[5]}>{date(row.target_date)}{overdue(row,today)&&<small>{badge("Overdue","red")}</small>}</td>
          <td data-label={columns[6]}>{badge(statusLabels[row.status]||words(row.status)||"Not recorded",row.status==="closed"?"closed":"blue")}</td>
          <td data-label={columns[7]}><Link className={p.button} href={root+"/"+row.id}><RecordIcon name="open"/>Open</Link></td>
        </tr>)}</tbody>
      </table></div> : <p className={shared.notice}>{rows.length?"No changes match these filters.":"No controlled changes have been created."}</p>}
    </section>
    <div className={shared.insights} id="change-dashboard">
      <section className={p.panel}><h2><RecordIcon name="matrix"/>Change workload</h2>
        {["lite","full"].map(pathway=>{
          const value = rows.filter(row=>row.pathway===pathway).length;
          return <div className={s.workload} key={pathway}><span>{words(pathway)}</span>
            <div aria-hidden="true" className={s.track}><span className={pathway==="lite"?shared.amber:s.violet} style={{width:(rows.length?value/rows.length*100:0)+"%"}}/></div><strong>{value}</strong></div>;
        })}
      </section>
      <section className={p.panel}><h2><RecordIcon name="calendar"/>Open targets</h2>
        {targets.length ? <ul className={s.links}>{targets.map(row=><li key={row.id}>
          <Link href={root+"/"+row.id}>{row.moc_reference}</Link> · {date(row.target_date)} {overdue(row,today)&&badge("Overdue","red")}
        </li>)}</ul> : <p>No target dates recorded for open changes.</p>}
      </section>
      <section className={p.panel}><h2><RecordIcon name="scope"/>Key actions</h2>
        <button className={shared.queue+" "+shared.red} onClick={()=>setView("overdue")}>Review overdue changes <strong>{count("overdue")}</strong></button>
        <button className={shared.queue+" "+shared.amber} onClick={()=>setView("gate")}>Review changes at the H&amp;S gate <strong>{count("gate")}</strong></button>
        <p><Link href="/portal/tasks?module=moc">My Tasks &amp; Approvals</Link></p>
      </section>
    </div>
  </main>;
}
