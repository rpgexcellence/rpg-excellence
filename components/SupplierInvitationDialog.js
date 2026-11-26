"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import SupplierSubmissionRevision, { formatInvitationDate as formatDate } from "./SupplierSubmissionRevision";
import "./supplier-invitation-history.css";

const api = "/api/portal/suppliers/invitations";
const statusLabel = { creating:"Creating draft", unknown:"Outlook outcome uncertain", draft:"Draft created", sent:"Sent", in_progress:"In progress", submitted:"Submitted", clarification:"Clarification requested", reviewed:"Reviewed", revoked:"Revoked" };
const css = `
.saRecordPage .saInviteDialog{width:min(685px,calc(100% - 28px));max-height:90vh;overflow:auto;padding:18px;border:1px solid #c8d5e2;border-radius:12px;background:white;color:#102748}
.saRecordPage .saInviteDialog::backdrop{background:#10274880}
.saInviteDialog form,.saInviteDialog label{display:grid;gap:7px}
.saInviteDialog form{gap:13px}
.saInviteDialog input,.saInviteDialog textarea{border:1px solid #c8d5e2;border-radius:7px;padding:9px;color:#102748;font:inherit}
.saInviteDialog header,.saInviteActions{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}
.saInviteDialog h2{margin:0 0 10px}
.saInviteDialog article,.saInviteDialog .saMailPreview{margin:10px 0;padding:12px;border:1px solid #cfdae5;border-radius:8px;background:#f8fbff;overflow-wrap:anywhere}
.saInviteDialog .saMailPreview{white-space:pre-wrap;font:inherit}
.saInviteDialog .saInviteError{color:#a72822}
.saRecordPage button.saInvitationPrimary{border:1px solid #315fe6;background:#315fe6;color:#fff}
.saInviteDialog details{margin-top:8px}
`;
const nextExpiry = () => new Date(Date.now() + 14*86400000).toISOString().slice(0,10);

export default function SupplierInvitationDialog({ ready, supplierId, supplierName, supplierReference, contacts, onStatus, historyRef }) {
  const primary=contacts.find(contact=>contact.is_primary && contact.is_active !== false);
  const [fields,setFields]=useState(()=>({recipient:primary?.email || "",contact:[primary?.first_name,primary?.last_name].filter(Boolean).join(" "),expiry:nextExpiry()}));
  const [mode,setMode]=useState("entry");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [items,setItems]=useState([]);
  const [clarification,setClarification]=useState({});
  const dialog=useRef(null);
  useEffect(()=>{
    const latestSubmissionInvitation = items.find(item => item.submissions?.length);
  if(!ready)return;
    const controller=new AbortController();
    fetch(api + "?" + new URLSearchParams({supplierId,summary:"1"}), {cache:"no-store",signal:controller.signal})
      .then(response=>response.ok ? response.json() : null)
      .then(data=>{if(data?.summary) onStatus?.({...data.summary,label:statusLabel[data.summary.status]});})
      .catch(()=>{});
    return ()=>controller.abort();
  },[ready,supplierId,onStatus]);
  async function loadHistory(){
    const response=await fetch(api + "?" + new URLSearchParams({supplierId}),{cache:"no-store"});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || "Invitation history is unavailable.");
    setItems(data.invitations);
    if(data.summary) onStatus?.({...data.summary,label:statusLabel[data.summary.status]});
  }
  async function open(next) {
    setMode(next);setError("");dialog.current.showModal();
    if(next==="history"){
      setBusy(true);
      try{ await loadHistory(); }catch(cause){setError(cause.message);}
      finally{setBusy(false);}
    }
  }
  useImperativeHandle(historyRef, () => ({ openHistory: () => open("history") }));
  async function operate(operation, invitationId, note) {
    if(busy)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        operation,supplierId,invitationId,note,...(operation==="create"?fields:{})
      })});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || "The invitation action could not be completed.");

      setMode("history");
      await loadHistory();
    }catch(cause){setError(cause.message);}
    finally{setBusy(false);}
  }
  const change=event=>setFields(current=>({...current,[event.target.name]:event.target.value}));
  const button=(label,callback,primaryStyle=false)=><button type="button" className={"saSecondary"+(primaryStyle?" saInvitationPrimary":"")} onClick={callback} disabled={busy}>{label}</button>;
  const latestSubmissionInvitation = items.find(item => item.submissions?.length);
  if(!ready)return <span className="saSecondary">Supplier invitations · setup pending</span>;
  return <>
    <style>{css}</style>
    {button("Invitation history",()=>open("history"))}
    {button("Invite supplier",()=>open("entry"),true)}
    <dialog data-device-draft-exclude="true" ref={dialog} className={mode === "history" ? "saInviteDialog saInviteHistory" : "saInviteDialog"} aria-labelledby="saInvitationTitle">
      <header className="saInviteDialogHeader">
        <div>
          <h2 id="saInvitationTitle">{mode==="history"?"Supplier submissions and invitation history":mode==="preview"?"Preview Outlook email":"Invite supplier"}</h2>
          {mode === "history" && <p>{supplierName} · {supplierReference}</p>}
        </div>
        <button type="button" className="saSecondary" onClick={() => dialog.current.close()}>Close</button>
      </header>
      {error && <p role="alert" className="saInviteError">{error}</p>}
      {mode==="entry" && <form onSubmit={event=>{event.preventDefault();setError("");setMode("preview");}}>
        <label>Supplier contact email<input name="recipient" type="email" value={fields.recipient} onChange={change} required maxLength={254} /></label>
        <label>Contact name<input name="contact" value={fields.contact} onChange={change} required maxLength={150} /></label>
        <label>Invitation expiry<input name="expiry" type="date" value={fields.expiry} min={new Date().toISOString().slice(0,10)} onChange={change} required /></label>
        <p>Only the verified recipient can access this supplier assessment.</p>
        <div><button type="submit" className="saSecondary saInvitationPrimary">Preview Outlook email</button></div>
      </form>}
      {mode==="preview" && <>
        <p><b>From</b> · info@rpgexcellence.com</p>
        <p><b>To</b> · {fields.recipient}</p>
        <p><b>Subject</b> · Welcome to RPG Excellence · Supplier onboarding for {supplierName}</p>
        <div className="saMailPreview">{"Hello "+fields.contact+",\n\nWelcome to RPG Excellence. Please complete the supplier assurance assessment for "+supplierName+" ("+supplierReference+"). Sign in using "+fields.recipient+", complete the requested sections, attach evidence and acknowledge the issued Code of Conduct. Submit your responses for RPG review.\n\nSecure access: [generated when the Outlook draft is created]\n\nInvitation expires "+fields.expiry+" (UTC).\n\nRPG Excellence Supplier Assurance"}</div>
        <p>Review and send the draft from Outlook when ready.</p>
        <div className="saInviteActions">{button("Edit recipient",()=>setMode("entry"))}{button("Create Outlook draft",()=>operate("create"),true)}</div>
      </>}
      {mode==="history" && <>
        {busy && <p role="status">Loading invitation details…</p>}
        {!items.length && !busy && <p>No invitations recorded for this supplier.</p>}
        {items.map(item=><article key={item.id}>
          <div className="saInviteHistoryContact">
            <h3>{item.contact_name}</h3>
            <span>{Date.parse(item.expires_at)<=Date.now() && !["reviewed","submitted","revoked"].includes(item.status) ? "Expired" : statusLabel[item.status]}</span>
          </div>
          <p className="saSubmissionMeta">{item.recipient}</p>
          <p className="saSubmissionMeta">Created {formatDate(item.created_at)} · Expires {formatDate(item.expires_at)}</p>
          <div className="saInviteActions">
            {item.outlook_url && <a href={item.outlook_url} target="_blank" rel="noopener noreferrer">Open in Outlook ↗</a>}
            {["draft","in_progress","submitted","reviewed","clarification"].includes(item.status) && !item.sent_at && button("Check Outlook send status",()=>operate("refresh",item.id))}
            {item.status==="submitted" && button("Mark evidence reviewed",()=>operate("review",item.id))}
            {(!["revoked","reviewed","creating"].includes(item.status) || item.status==="creating" && Date.now()-Date.parse(item.created_at)>120000) && button("Revoke invitation",()=>{if(window.confirm("Revoke this supplier’s access?"))operate("revoke",item.id);})}
          </div>
          {["submitted","reviewed"].includes(item.status) && Date.parse(item.expires_at)>Date.now() && <details>
            <summary>Request clarification</summary>
            <label>Clarification required<textarea value={clarification[item.id] || ""} maxLength={2000} onChange={event=>setClarification({...clarification,[item.id]:event.target.value})} /></label>
            {button("Record clarification request",()=>operate("clarify",item.id,clarification[item.id]))}
          </details>}
          {item.submissions?.slice().reverse().map((submission, index) =>
            <SupplierSubmissionRevision
              key={submission.submittedAt}
              submission={submission}
              questionnaire={item.questionnaire}
              revision={item.submissions.length - index}
              initiallyOpen={item === latestSubmissionInvitation && index === 0}
              evidenceUrl={file => api + "?" + new URLSearchParams({ supplierId, invitationId: item.id, file })}
            />
          )}
          <details className="saSubmissionPanel">
            <summary><strong>Invitation audit trail</strong> <span className="saSubmissionMeta">({item.history.length})</span></summary>
            <ol className="saInviteAuditTrail">
              {item.history.map((entry, index) => <li key={index}>
                <strong>{entry.action}</strong>
                <span className="saSubmissionMeta"><time dateTime={entry.at}>{formatDate(entry.at)}</time> · {entry.actor}</span>
                {entry.details && <p>{entry.details}</p>}
              </li>)}
            </ol>
          </details>
        </article>)}
      </>}
    </dialog>
  </>;
}
