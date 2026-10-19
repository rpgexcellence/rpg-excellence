'use client';
import {useState} from 'react';
export default function ZoneConnectionPanel({name,reference,url,qr,posterHref,employeeHref,blockedReason,revision}) {
 const [size,setSize]=useState('A4'),[copyState,setCopyState]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(url);setCopyState('Link copied.');}catch{setCopyState('Select the link below and copy it.');}}
 return <section className="zone-connection-panel" aria-labelledby="zone-poster-title">
  <header><div><small>PERMANENT ZONE CONNECTION</small><h2 id="zone-poster-title">{reference} poster</h2></div><span className="zr-badge">Rev {revision}</span></header>
  {posterHref?<object className="zr-pdf" data={`${posterHref}?size=${size}&inline=1#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" aria-label={`${size} poster preview for ${name}`}><div className="zr-pdf-fallback"><p>Your browser cannot embed this PDF.</p><a href={`${posterHref}?size=${size}&inline=1`} target="_blank" rel="noreferrer">Open the actual poster preview</a></div></object>:<div className="zr-blocked-preview"><strong>{reference}</strong><h3>{name}</h3>{qr&&<img src={qr} width="164" height="164" alt={`Permanent QR code for ${name}`}/>}<p>{blockedReason}</p></div>}
  {url&&<div className="zr-permalink"><label htmlFor="zone-permalink">Permanent zone link</label><div><input id="zone-permalink" value={url} readOnly onFocus={e=>e.target.select()}/><button type="button" onClick={copy} aria-label="Copy permanent zone link">Copy</button></div><p>Updates appear online. The printed code stays the same.</p><span role="status">{copyState}</span></div>}
  <div className="zr-size"><span>Paper size</span>{['A4','A3'].map(value=><button key={value} type="button" aria-pressed={size===value} onClick={()=>setSize(value)}>{value}</button>)}</div>
  <div className="zone-buttons zr-downloads">{employeeHref&&<a className="zone-link" href={employeeHref}>View employee page ↗</a>}{posterHref&&<><a className="zone-button" href={`${posterHref}?size=${size}`}>Download {size} poster ↓</a><a className="zr-open-preview" href={`${posterHref}?size=${size}&inline=1`} target="_blank" rel="noreferrer">Open PDF preview ↗</a></>}</div>
  <p className="zr-print-note">Downloading does not confirm physical display. Replace old copies, then confirm the displayed revision in Manage zone.</p>
 </section>;
}
