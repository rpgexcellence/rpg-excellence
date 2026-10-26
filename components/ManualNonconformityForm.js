"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { submitNonconformityDraft, confirmNonconformityEvidence } from "../app/portal/internal-audit-actions/actions";
import { nonconformityDate } from "../lib/nonconformity-reporting.mjs";
import {
  getNcDraft, saveNcDraft, prepareNcEvidence, startNcSubmission,
  recoverNcSubmission, recordNcSubmissionResult, restoreNcSubmissionAttempt,
  subscribeNcOffline, requestNcPersistentStorage,
} from "../lib/nonconformity-offline.mjs";

const SOURCES = [["operations","Operational activity"],["supplier","Supplier issue"],["customer_complaint","Customer complaint"],["product_service","Product or service failure"],["process_monitoring","Process monitoring / KPI"],["incident","Incident or near miss"],["management_review","Management review"],["external_audit","External audit"],["other","Other source"]];
const STEPS = ["Finding", "Requirement & evidence", "Owner & submission"];
const freshFields = supplierId => ({finding_type:"minor_nc",source_category:supplierId?"supplier":"operations",supplier_id:supplierId||"",supplier_contact_id:"",responsible_person_id:"",title:"",source_reference:"",detected_at:new Date().toISOString().slice(0,10),criteria:"",objective_evidence:"",failure_statement:"",process_area:"",risk_level:"medium",responsible_owner_name:"",responsible_owner_email:"",agreed_date:""});
const savedTime = value => value ? new Date(value).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "";
const CSS = `
.ncf{font-family:Arial,Helvetica,sans-serif;color:#17374d;font-size:13px;max-width:none;width:100%;box-sizing:border-box}.ncf *{box-sizing:border-box}.ncf button,.ncf input,.ncf select,.ncf textarea{font:inherit}.ncf button{cursor:pointer}.ncf button:disabled{opacity:.5;cursor:not-allowed}.ncf :focus-visible{outline:3px solid #1a9ca3;outline-offset:3px}.ncfConnection{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid #c4e1d7;background:#eff9f4;padding:13px 16px;border-radius:10px;margin-bottom:17px;color:#226556;font-size:12px}.ncfConnection.offline{background:#fff7e5;border-color:#e6ca84;color:#946112}.ncfConnection strong{display:flex;align-items:center;gap:8px}.ncfDot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#099782;flex-shrink:0}.ncfConnection.offline .ncfDot{background:#d69c29}.ncfConnection span:last-child{font-size:10px;color:#657d84}.ncfSteps{display:flex;gap:8px;margin:0 0 18px;border-bottom:1px solid #d7e3e9;padding-bottom:13px}.ncfSteps button{display:flex;align-items:center;gap:8px;flex:1;border:1px solid transparent;background:#f0f5f7;padding:11px;border-radius:8px;text-align:left;color:#758995;font-size:11px;line-height:1.4}.ncfSteps button[aria-selected=true]{background:#e8f2f2;border-color:#8cbdbe;color:#136d75}.ncfSteps i{display:grid;place-items:center;font-style:normal;background:#dce7eb;border-radius:50%;font-size:10px;min-width:23px;height:23px;color:#5c7c89}.ncfSteps button[aria-selected=true] i{background:#157d85;color:#fff}.ncfFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px;border:0;padding:0;margin:0;min-width:0}.ncfFields[hidden]{display:none}.ncf label{display:grid;gap:7px;align-content:start;font-size:11px;line-height:1.6;color:#486577;font-weight:700;min-width:0}.ncf input,.ncf select,.ncf textarea{width:100%;min-width:0;padding:11px 12px;border:1px solid #cfdfe7;border-radius:7px;background:#fff;color:#163b50;font-size:12px;font-weight:400;line-height:1.5}.ncf input:disabled,.ncf select:disabled,.ncf textarea:disabled{background:#f3f6f8;color:#526c7b;opacity:1}.ncf textarea{resize:vertical;min-height:100px}.ncf input[type=file]{font-size:11px;padding:10px}.ncf label small,.ncfNote{font-size:10px;color:#7e929e;font-weight:400;line-height:1.65}.ncfWide{grid-column:1/-1}.ncfIntro{margin:0;font-size:11px;color:#728b99;line-height:1.75}.ncfNotice{margin:15px 0;padding:13px 16px;background:#eff5f8;border:1px solid #d5e3eb;border-radius:8px;font-size:11px;line-height:1.7;color:#42677b;overflow-wrap:anywhere}.ncfNotice.error{background:#fff2ef;border-color:#eac5be;color:#a04c3c}.ncfNotice.warning{background:#fff8e9;border-color:#ecd6a4;color:#89651f}.ncfNotice.success{background:#edf8f3;border-color:#bfded0;color:#236b56}.ncfNotice strong{display:block;font-size:12px;margin-bottom:3px}.ncfNotice a{color:#126d80;font-weight:700}.ncfNotice .ncfButton{margin-top:9px}.ncfFile{display:flex;gap:13px;align-items:center;border:1px solid #d7e3e9;background:#f7fafb;padding:13px;border-radius:9px;margin-top:12px;min-width:0}.ncfFile img{width:65px;height:58px;object-fit:cover;border-radius:6px;background:#e2edf0;flex-shrink:0}.ncfFile>div{flex:1;min-width:0}.ncfFile strong{font-size:11px;display:block;overflow-wrap:anywhere}.ncfFile small{font-size:10px;color:#79909e;display:block;margin-top:4px;line-height:1.6}.ncfFile button{border:0;color:#7a5454;background:none;font-size:11px;padding:6px}.ncfActions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:21px;border-top:1px solid #dce6ec;padding-top:17px}.ncfButton{display:inline-flex;justify-content:center;align-items:center;gap:8px;border:1px solid #c5d7e1;border-radius:8px;background:#fff;color:#234b61;padding:11px 16px;font-size:11px!important;line-height:1.5;font-weight:700!important;text-decoration:none;min-height:40px;text-align:center}.ncfButton.primary{background:#137e87;color:#fff;border-color:#137e87}.ncfButton.navy{background:#11364e;color:#fff;border-color:#11364e}.ncfActions .ncfButton:last-child{margin-left:auto}.ncfFooter{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:10px;color:#748e9b;line-height:1.7}.ncfFooter .saved{color:#217c68}.ncfReview{display:flex!important;align-items:flex-start;gap:10px!important;padding:14px;border:1px solid #d7e4e8;border-radius:8px;background:#f4f8f9;font-weight:400!important;margin:18px 0 0}.ncfReview input{width:17px;height:17px;min-width:17px;margin:0;accent-color:#127f87}.ncfReview span{font-size:11px;line-height:1.65}.ncfSummary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 0}.ncfSummary>div{padding:12px;border:1px solid #dbe5eb;background:#f7fafb;border-radius:7px;min-width:0}.ncfSummary span{display:block;font-size:9px;color:#8095a1;text-transform:uppercase;letter-spacing:.08em}.ncfSummary strong{display:block;font-size:11px;margin-top:7px;overflow-wrap:anywhere}.ncfReceipt{padding:24px;border:1px solid #b8dccf;border-radius:12px;background:linear-gradient(125deg,#edf8f3,#f9fcfb);color:#1e6659}.ncfReceipt h3{margin:8px 0;font-size:21px}.ncfReceipt p{font-size:12px;line-height:1.8}.ncfReceipt small{font-size:10px;line-height:1.65;color:#6e8f86}.ncfReceipt .ncfButton{margin-top:10px}.ncfLoading{padding:22px;text-align:center;background:#f3f7f9;border-radius:9px;color:#728b9a;font-size:12px;line-height:1.7}.ncfUploadProgress{height:4px;background:#e2edef;border-radius:5px;overflow:hidden;margin:14px 0}.ncfUploadProgress i{height:100%;width:40%;display:block;background:#168690;animation:ncf-progress 1.5s ease-in-out infinite alternate}@keyframes ncf-progress{to{transform:translateX(150%)}}@media(prefers-reduced-motion:reduce){.ncfUploadProgress i{animation:none;width:100%}}@media(max-width:600px){.ncfSteps{gap:6px}.ncfSteps button{font-size:9px;padding:8px;gap:6px}.ncfSteps i{min-width:19px;height:19px;font-size:9px}.ncfFields{grid-template-columns:1fr;gap:15px}.ncf input,.ncf select,.ncf textarea{font-size:16px;padding:10px}.ncf textarea{min-height:110px}.ncfActions{gap:8px}.ncfActions .ncfButton{flex:1;padding:10px;font-size:10px!important}.ncfActions .ncfButton:last-child{margin-left:0}.ncfSummary{gap:8px}.ncfConnection{padding:12px}.ncfConnection strong{font-size:11px}.ncfFile{padding:11px;gap:10px}.ncfFile img{width:48px;height:48px}.ncfNotice{padding:12px}.ncfReceipt{padding:19px}}
`;
async function uploadEvidence(upload,file,evidence) {
  if (!upload || upload.bucket!=="internal-audit-evidence" || !file || !evidence) throw new Error("The evidence upload was not prepared. Keep the device draft and retry.");
  const client=createClient();
  const {error}=await client.storage.from(upload.bucket).uploadToSignedUrl(upload.path,upload.token,file.type===evidence.type?file:new File([file],evidence.name,{type:evidence.type}),{contentType:evidence.type,upsert:false});
  return {error};
}
export default function ManualNonconformityForm(props) {
  // The existing page can continue using its original form until the new
  // workspace is connected. No interim upload breaks the established route.
  if (!props.scope?.userId || !props.scope?.organizationId) return <LegacyManualNonconformityForm {...props}/>;
  return <OfflineNonconformityForm key={`${props.scope.userId}:${props.scope.organizationId}:${props.draftId || "new"}`} {...props}/>;
}
function OfflineNonconformityForm({ scope,suppliers=[],contacts=[],people=[],initialSupplierId="",draftId=null,onCreated,onDraftChange,registerCloseGuard,showConnection=true,submitDraftAction=submitNonconformityDraft,confirmEvidenceAction=confirmNonconformityEvidence,uploadEvidenceAction=uploadEvidence }) {
  const [fields,setFields]=useState(()=>freshFields(initialSupplierId)),[file,setFile]=useState(null),[record,setRecord]=useState(null);
  const [online,setOnline]=useState(true),[step,setStep]=useState(0),[ready,setReady]=useState(false),[loadVersion,setLoadVersion]=useState(0);
  const [dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[busy,setBusy]=useState(false),[fileBusy,setFileBusy]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[conflict,setConflict]=useState(false),[reviewed,setReviewed]=useState(false),[preview,setPreview]=useState("");
  const formRef=useRef(null),fileInputRef=useRef(null),mounted=useRef(true),recordRef=useRef(null),saveQueue=useRef(Promise.resolve());
  const editVersion=useRef(0),savedVersion=useRef(0),fileDirty=useRef(false),dirtyRef=useRef(false),fileGeneration=useRef(0),sendingRef=useRef(false);
  const latest=useRef({fields,file});latest.current={fields,file};
  const callbacks=useRef({onCreated,onDraftChange});callbacks.current={onCreated,onDraftChange};
  const scopeId=`${scope.userId}:${scope.organizationId}`;
  const locked=Boolean(record && !["draft","needs_review"].includes(record.state));
  const editable=ready && !busy && !fileBusy && !locked && !conflict;
  const activeContacts=contacts.filter(c=>c.supplier_id===fields.supplier_id && c.is_active!==false);
  function message(text){if(mounted.current)setNotice(text);}
  function showError(error){if(mounted.current){setError(error?.message || String(error));if(error?.code==="draft_changed")setConflict(true);}}
  function syncRecord(value){recordRef.current=value;if(mounted.current)setRecord(value);if(mounted.current)callbacks.current.onDraftChange?.(value?{id:value.id,state:value.state,revision:value.revision,updatedAt:value.updatedAt}:null);}
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;fileGeneration.current++;};},[]);
  useEffect(()=>{
    const connection=()=>{setOnline(navigator.onLine);if(!navigator.onLine)setReviewed(false);};connection();
    window.addEventListener("online",connection);window.addEventListener("offline",connection);
    const leaving=event=>{if(dirtyRef.current || fileDirty.current){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",leaving);
    return()=>{window.removeEventListener("online",connection);window.removeEventListener("offline",connection);window.removeEventListener("beforeunload",leaving);};
  },[]);
  useEffect(()=>{
    let cancelled=false;setReady(false);setError("");setConflict(false);setReviewed(false);
    (async()=>{
      if(!draftId){if(!cancelled)setReady(true);return;}
      const saved=await getNcDraft(scope,draftId);
      if(!saved)throw new Error("This device draft is no longer available. Return to Device drafts and choose an existing report.");
      if(cancelled)return;
      recordRef.current=saved;setRecord(saved);setFields({...freshFields(),...saved.fields});setFile(saved.file || null);
      latest.current={fields:{...freshFields(),...saved.fields},file:saved.file || null};
      editVersion.current=0;savedVersion.current=0;fileDirty.current=false;dirtyRef.current=false;setDirty(false);setReady(true);
      if(saved.state==="sending")setNotice("A previous submission was interrupted. Use Retry original submission to check its server status.");
    })().catch(showError);
    return()=>{cancelled=true;};
  },[scopeId,draftId,loadVersion]);
  useEffect(()=>{
    if(!ready)return;
    return subscribeNcOffline(scope,()=>{
      const current=recordRef.current;if(!current || sendingRef.current)return;
      getNcDraft(scope,current.id).then(saved=>{
        if(mounted.current && saved && saved.revision>recordRef.current?.revision){setConflict(true);setError("This draft was updated in another tab. Your current entries remain displayed. Reload the saved version before making further changes.");}
      }).catch(showError);
    });
  },[ready,scopeId]);
  useEffect(()=>{
    if(!file || !["image/png","image/jpeg","image/webp"].includes(file.type)){setPreview("");return;}
    const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);
  },[file]);
  function change(key,value){
    const next={...latest.current.fields,[key]:value};
    if(key==="supplier_id")next.supplier_contact_id="";
    if((key==="source_category" && value==="supplier") || (key==="responsible_person_id" && value)){next.responsible_person_id=key==="responsible_person_id"?value:"";next.responsible_owner_name="";next.responsible_owner_email="";}
    if(key==="source_category" && value!=="supplier"){next.supplier_id="";next.supplier_contact_id="";}
    latest.current.fields=next;editVersion.current++;dirtyRef.current=true;setFields(next);setDirty(true);setReviewed(false);setError("");
  }
  async function persist(){
    const operation=saveQueue.current.catch(()=>{}).then(async()=>{
      const current=recordRef.current;
      if(current && !dirtyRef.current && !fileDirty.current)return current;
      const version=editVersion.current,values={...latest.current.fields},selectedFile=fileDirty.current?latest.current.file:undefined;
      if(mounted.current)setSaving(true);
      try{
        const saved=await saveNcDraft(scope,{...(current?{id:current.id}:{}),fields:values,file:selectedFile},current?.revision ?? null);
        recordRef.current=saved;
        if(editVersion.current===version){savedVersion.current=version;fileDirty.current=false;dirtyRef.current=false;if(mounted.current)setDirty(false);}
        if(mounted.current){setRecord(saved);setError("");}
        if(mounted.current)callbacks.current.onDraftChange?.({id:saved.id,state:saved.state,revision:saved.revision,updatedAt:saved.updatedAt});
        return saved;
      }finally{if(mounted.current)setSaving(false);}
    });
    saveQueue.current=operation;return operation;
  }
  useEffect(()=>{
    if(!ready || !dirty || busy || fileBusy || locked || conflict)return;
    const timer=setTimeout(()=>{persist().catch(showError);},900);
    return()=>clearTimeout(timer);
  },[fields,file,dirty,ready,busy,fileBusy,locked,conflict]);
  useEffect(()=>{
    if(!registerCloseGuard)return;
    registerCloseGuard(async()=>{
      if(fileBusy)throw new Error("Wait for the evidence file check before closing this report.");
      if(!ready)return;
      await saveQueue.current.catch(()=>{});
      if(dirtyRef.current || fileDirty.current)await persist();
    });
    return()=>registerCloseGuard(null);
  },[registerCloseGuard,fileBusy,ready]);
  async function chooseFile(event){
    const selected=event.target.files?.[0];if(!selected)return;
    const generation=++fileGeneration.current;setFileBusy(true);setError("");
    try{
      await prepareNcEvidence(selected);
      if(!mounted.current || generation!==fileGeneration.current)return;
      fileDirty.current=true;editVersion.current++;dirtyRef.current=true;
      latest.current.file=selected;setFile(selected);setDirty(true);setReviewed(false);
    }catch(error){showError(error);event.target.value="";}
    finally{if(mounted.current && generation===fileGeneration.current)setFileBusy(false);}
  }
  function removeFile(){fileGeneration.current++;fileDirty.current=true;editVersion.current++;dirtyRef.current=true;latest.current.file=null;setFile(null);setDirty(true);setReviewed(false);if(fileInputRef.current)fileInputRef.current.value="";}
  function validate(){
    const f=latest.current.fields;
    const required=[["finding_type",0,"Choose an NC classification."],["source_category",0,"Choose the source."],["title",0,"Enter the NC title."],["detected_at",0,"Enter the detection date."],["criteria",1,"Record the applicable requirement or criteria."],["objective_evidence",1,"Record the objective evidence."],["failure_statement",1,"Record the statement of nonconformity."]];
    if(f.source_category==="supplier")required.push(["supplier_id",2,"Select the supplier."],["supplier_contact_id",2,"Select an active supplier contact."]);
    let invalid=required.find(([key])=>!f[key]?.trim());
    if(!invalid && (!nonconformityDate(f.detected_at) || f.detected_at>new Date().toISOString().slice(0,10)))invalid=["detected_at",0,"Enter a valid detection date that is not in the future."];
    if(!invalid && f.agreed_date && !nonconformityDate(f.agreed_date))invalid=["agreed_date",2,"Enter a valid target-response date."];
    if(!invalid && f.source_category!=="supplier" && !f.responsible_person_id && f.responsible_owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.responsible_owner_email))invalid=["responsible_owner_email",2,"Check the owner email address."];
    if(invalid){setStep(invalid[1]);setError(invalid[2]);requestAnimationFrame(()=>formRef.current?.elements.namedItem(invalid[0])?.focus());return false;}
    return true;
  }
  async function applyResponse(response){
    const current=recordRef.current;
    const saved=await recordNcSubmissionResult(scope,current.id,current.revision,response);
    syncRecord(saved);
    if(mounted.current && saved.state==="needs_review"){setReviewed(false);setNotice("Review the highlighted issue, correct the draft and submit again. Its original submission identity has been retained.");}
    return saved;
  }
  async function submit(event){
    event?.preventDefault();if(sendingRef.current || !ready)return;
    setError("");setNotice("");
    if(!online || !navigator.onLine){try{await persist();message("Saved on this device. Reconnect, review the details and submit to create a controlled NC.");}catch(error){showError(error);}return;}
    if(!locked && !validate())return;
    if(!reviewed){setStep(2);setError("Confirm that you have reviewed the report and assignment details before submitting.");return;}
    sendingRef.current=true;setBusy(true);
    try{
      let current=await persist();
      await requestNcPersistentStorage();
      if(current.state==="sending"){current=await recoverNcSubmission(scope,current.id,current.revision);syncRecord(current);}
      const attempt=await startNcSubmission(scope,current.id,current.revision);syncRecord(attempt.draft);
      let response=await submitDraftAction(attempt.payload);
      await applyResponse(response);
      if(!response?.ok){setError(response?.error?.message || "The NC could not be confirmed. Keep the device draft and retry.");return;}
      if(response.submissionState==="evidence_pending"){
        let uploadError=null;
        if(response.upload && attempt.file){
          message("NC registered. Uploading the original evidence and checking its integrity…");
          try{const uploaded=await uploadEvidenceAction(response.upload,attempt.file,attempt.payload.evidence);uploadError=uploaded?.error || null;}catch(error){uploadError=error;}
        }
        // A duplicate-file response can mean the previous upload succeeded.
        // Always ask the server to verify the original file before retrying it.
        response=await confirmEvidenceAction(attempt.payload);await applyResponse(response);
        if(!response?.ok){setError(response.error?.message || "Evidence confirmation did not complete. Retain the device draft and retry.");return;}
        if(response.submissionState!=="confirmed"){
          const message=uploadError?"The NC is registered, but its evidence upload has not completed. The original file remains saved on this device. Retry when connected.":"The NC is registered. Evidence confirmation is still pending; the original file remains on this device.";
          await applyResponse({ok:false,error:{code:"evidence_upload_pending",message,retryable:true}});setError(message);return;
        }
      }
      if(response.submissionState==="confirmed"){
        dirtyRef.current=false;fileDirty.current=false;
        if(mounted.current){setDirty(false);setFile(null);setNotice("The server confirmed this NC and its evidence. The controlled reference is shown below.");}
        if(mounted.current)callbacks.current.onCreated?.(recordRef.current.receipt);
      }
    }catch(error){
      const current=recordRef.current;
      if(current?.submission && ["sending","evidence_pending","retry"].includes(current.state) && error?.code!=="draft_changed"){
        try{await applyResponse({ok:false,error:{code:"connection_interrupted",message:"Confirmation was interrupted. Retry the original submission; its identity and evidence remain saved on this device.",retryable:true}});}catch(storageError){showError(storageError);return;}
      }
      showError(error);
    }finally{sendingRef.current=false;if(mounted.current)setBusy(false);}
  }
  async function reloadSaved(){
    if(dirtyRef.current && !window.confirm("Reload the saved version? Unsaved entries currently displayed in this tab will be replaced."))return;
    if(!recordRef.current){setLoadVersion(v=>v+1);return;}
    try{
      const saved=await getNcDraft(scope,recordRef.current.id);if(!saved)throw new Error("The saved device draft is no longer available.");
      syncRecord(saved);setFields({...freshFields(),...saved.fields});setFile(saved.file || null);latest.current={fields:{...freshFields(),...saved.fields},file:saved.file || null};editVersion.current=0;savedVersion.current=0;fileDirty.current=false;dirtyRef.current=false;setDirty(false);setConflict(false);setReviewed(false);setError("");
    }catch(error){showError(error);}
  }
  async function retryOriginalAttempt(){
    if(!recordRef.current?.attemptHistory?.length)return;
    try{
      const current=recordRef.current;
      const saved=await restoreNcSubmissionAttempt(scope,current.id,current.revision,0);
      syncRecord(saved);setFields({...freshFields(),...saved.fields});setFile(saved.file || null);latest.current={fields:{...freshFields(),...saved.fields},file:saved.file || null};fileDirty.current=false;dirtyRef.current=false;setDirty(false);setReviewed(false);setError("");setStep(2);message("The original submitted content has been restored. Review it, then retry to check whether it already has an NC reference.");
    }catch(error){showError(error);}
  }
  const input=(key,options={})=><input name={key} value={fields[key] || ""} onChange={e=>change(key,e.target.value)} {...options}/>;
  const area=(key,options={})=><textarea name={key} value={fields[key] || ""} onChange={e=>change(key,e.target.value)} {...options}/>;
  const sourceIsSupplier=fields.source_category==="supplier";
  const fileName=file?.name || record?.evidence?.name;
  const activeOwner=people.find(p=>p.id===fields.responsible_person_id);
  return <form className="ncf" ref={formRef} noValidate onSubmit={submit} data-device-draft-exclude="true"><style>{CSS}</style>
    {showConnection && <div className={`ncfConnection ${online?"":"offline"}`} role="status"><strong><i className="ncfDot"/>{online?"Online workspace":"Offline workspace"}</strong><span>{online?"Device draft until server confirmation":record && !dirty && !fileBusy?"Draft saved on this device":"Save the draft on this device"}</span></div>}
    {!ready && <div className="ncfLoading">{error?"The saved draft could not be opened.":"Opening device draft storage…"}</div>}
    {record?.state==="confirmed" ? <div className="ncfReceipt" role="status"><span>CONTROLLED NC CONFIRMED</span><h3>{record.receipt.reference}</h3><p>The server has confirmed this report{record.evidence?" and its evidence attachment":""}. It is available in the NC Register.</p><a className="ncfButton primary" href={record.receipt.href}>Open controlled NC →</a><p><small>The device draft is separate from the controlled record. Changes, approval and verification continue through the authorised online workflow.</small></p></div> : <>
    <div className="ncfSteps" role="tablist" aria-label="NC report sections">{STEPS.map((title,index)=><button key={title} id={`ncf-tab-${index}`} type="button" role="tab" aria-selected={step===index} aria-controls={`ncf-fields-${index}`} tabIndex={step===index?0:-1} onClick={()=>setStep(index)} onKeyDown={e=>{let next=-1;if(e.key==="ArrowRight")next=(index+1)%3;if(e.key==="ArrowLeft")next=(index+2)%3;if(e.key==="Home")next=0;if(e.key==="End")next=2;if(next>=0){e.preventDefault();setStep(next);formRef.current?.querySelector(`#ncf-tab-${next}`)?.focus();}}}><i>{index+1}</i>{title}</button>)}</div>
    {locked && <div className="ncfNotice warning"><strong>{record.receipt?`NC ${record.receipt.reference} · evidence or confirmation pending`:"Original submission awaiting confirmation"}</strong>The original report is retained for a safe retry. It will not be submitted as a second NC.{record.receipt && <div><a href={record.receipt.href}>Open the registered NC →</a></div>}</div>}
    <fieldset id="ncf-fields-0" className="ncfFields" hidden={step!==0} disabled={!editable} aria-labelledby="ncf-tab-0">
      <p className="ncfIntro ncfWide">Record what was found. Classification and risk are separate: Major/Minor describes the NC; risk describes its potential impact.</p>
      <label>NC classification *<select name="finding_type" value={fields.finding_type} onChange={e=>change("finding_type",e.target.value)} required><option value="minor_nc">Minor NC</option><option value="major_nc">Major NC</option></select></label>
      <label>Source *<select name="source_category" value={fields.source_category} onChange={e=>change("source_category",e.target.value)} required>{SOURCES.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>
      <label className="ncfWide">NC title *{input("title",{required:true,maxLength:220,placeholder:"A short description of the nonconformity"})}</label>
      <label>Source reference{input("source_reference",{maxLength:300,placeholder:"Complaint, purchase order, incident or record"})}</label>
      <label>Date detected *{input("detected_at",{type:"date",required:true,max:new Date().toISOString().slice(0,10)})}</label>
      <label>Process / location{input("process_area",{maxLength:300,placeholder:"Recorded process or location"})}<small>This is a descriptive label; it does not assign an administrative site or zone.</small></label>
      <label>Risk level *<select name="risk_level" value={fields.risk_level} onChange={e=>change("risk_level",e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
    </fieldset>
    <fieldset id="ncf-fields-1" className="ncfFields" hidden={step!==1} disabled={!editable} aria-labelledby="ncf-tab-1">
      <p className="ncfIntro ncfWide">Keep the requirement, evidence and failure statement clear. You can save unfinished entries on this device.</p>
      <label className="ncfWide">Requirement / criteria *{area("criteria",{required:true,maxLength:12000,placeholder:"Applicable clause, procedure, contract or specification"})}</label>
      <label className="ncfWide">Objective evidence *{area("objective_evidence",{required:true,maxLength:16000,placeholder:"What was examined, observed, measured or confirmed?"})}</label>
      <label className="ncfWide">Statement of nonconformity *{area("failure_statement",{required:true,maxLength:12000,placeholder:"Explain how the evidence demonstrates failure to meet the requirement."})}</label>
      <label className="ncfWide">Evidence attachment · optional<input ref={fileInputRef} type="file" name="evidence_file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx" onChange={chooseFile}/><small>One photo or document, up to 10 MB. Saved with the draft on this device until the server confirms receipt.</small></label>
    </fieldset>
    {step===1 && fileName && <div className="ncfFile">{preview && <img src={preview} alt="Selected NC evidence preview"/>}<div><strong>{fileName}</strong><small>{((file?.size || record?.evidence?.size || 0)/1024/1024).toFixed(2)} MB · {dirty || fileDirty.current?"Save pending on this device":"Saved with device draft"}</small></div>{editable && <button type="button" onClick={removeFile}>Remove</button>}</div>}
    <fieldset id="ncf-fields-2" className="ncfFields" hidden={step!==2} disabled={!editable} aria-labelledby="ncf-tab-2">
      <p className="ncfIntro ncfWide">Check the accountable owner and target date. Cached supplier and people options are rechecked by the server when you submit.</p>
      {sourceIsSupplier?<><label className="ncfWide">Supplier from register *<select name="supplier_id" value={fields.supplier_id} onChange={e=>change("supplier_id",e.target.value)} required><option value="">Select supplier</option>{fields.supplier_id && !suppliers.some(s=>s.id===fields.supplier_id) && <option value={fields.supplier_id}>Previously selected supplier — review required</option>}{suppliers.map(s=><option key={s.id} value={s.id}>{s.legal_name}{s.supplier_reference?` · ${s.supplier_reference}`:""}</option>)}</select></label><label className="ncfWide">Responsible supplier contact *<select name="supplier_contact_id" value={fields.supplier_contact_id} onChange={e=>change("supplier_contact_id",e.target.value)} required><option value="">Select active supplier contact</option>{fields.supplier_contact_id && !activeContacts.some(c=>c.id===fields.supplier_contact_id) && <option value={fields.supplier_contact_id}>Previously selected contact — review required</option>}{activeContacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}{c.business_title?` · ${c.business_title}`:""}</option>)}</select><small>{fields.supplier_id && !activeContacts.length?"No active contact is available in the loaded options. Update Supplier Assurance while online before submitting.":"Only active contacts for the chosen supplier are offered."}</small></label></>:<><label className="ncfWide">Responsible company person<select name="responsible_person_id" value={fields.responsible_person_id} onChange={e=>change("responsible_person_id",e.target.value)}><option value="">Unassigned / enter owner details below</option>{fields.responsible_person_id && !activeOwner && <option value={fields.responsible_person_id}>Previously selected person — review required</option>}{people.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name || ""}{p.position?` · ${p.position}`:""}</option>)}</select></label>{!fields.responsible_person_id && <><label>Responsible owner{input("responsible_owner_name",{maxLength:220})}</label><label>Owner email{input("responsible_owner_email",{type:"email",maxLength:254})}</label></>}</>}
      <label>Target response date{input("agreed_date",{type:"date"})}</label><p className="ncfNote">{sourceIsSupplier?"Supplier issues require an active responsible contact. Formal assignments and verification continue through the online workflow.":"An unassigned report can be raised. The administrator can allocate ownership through the controlled workflow."}</p>
    </fieldset>
    {step===2 && <><div className="ncfSummary"><div><span>Classification / risk</span><strong>{fields.finding_type==="major_nc"?"Major":"Minor"} NC · {fields.risk_level}</strong></div><div><span>Evidence</span><strong>{fileName || "No attachment selected"}</strong></div></div><label className="ncfReview"><input type="checkbox" checked={reviewed} disabled={!online || busy || !ready || conflict} onChange={e=>setReviewed(e.target.checked)}/><span>I have reviewed the report and assignment details. Submission creates or confirms a controlled NC; it does not approve corrective action or verify closure.</span></label></>}
    {busy && <div className="ncfUploadProgress" role="status" aria-label="Submitting and verifying NC"><i/></div>}
    <div className="ncfActions">{step>0 && <button type="button" className="ncfButton" onClick={()=>setStep(s=>s-1)}>← Back</button>}<button type="button" className="ncfButton navy" disabled={!ready || busy || fileBusy || conflict || locked} onClick={()=>{persist().then(()=>message("NC draft and selected evidence saved on this device. It has not been submitted.")).catch(showError);}}>{saving?"Saving…":"Save device draft"}</button>{step<2?<button type="button" className="ncfButton primary" onClick={()=>setStep(s=>s+1)}>Continue →</button>:<button type="submit" className="ncfButton primary" disabled={!ready || busy || fileBusy || conflict || !online}>{busy?"Confirming…":locked?"Retry original submission":online?"Submit controlled NC":"Reconnect to submit"}</button>}</div>
    </>}
    {notice && <div className="ncfNotice" role="status">{notice}</div>}
    {error && <div className="ncfNotice error" role="alert"><strong>{error}</strong>{conflict && <button type="button" className="ncfButton" onClick={reloadSaved}>Reload saved version</button>}{record?.lastError?.code==="authentication_required" && <a className="ncfButton" href={`/portal/login?next=${encodeURIComponent(`/portal/internal-audit-actions?raise=1&draft=${record.id}`)}`}>Sign in to the original workspace</a>}{!ready && <button type="button" className="ncfButton" onClick={()=>setLoadVersion(v=>v+1)}>Try opening draft again</button>}{record?.lastError?.code==="submission_conflict" && record.attemptHistory?.length>0 && <button type="button" className="ncfButton" onClick={retryOriginalAttempt}>Check original submitted content</button>}</div>}
    <div className="ncfFooter"><span className={record && !dirty?"saved":""}>{fileBusy?"Checking evidence file…":saving?"Saving on this device…":dirty?"Unsaved changes — keep this page open":record?`Saved on this device at ${savedTime(record.updatedAt)}`:"No device draft saved yet"}</span><span>{record?.receipt?record.receipt.reference:"Official NC reference issued after server confirmation"}</span></div>
  </form>;
}

// Compatibility with the existing page until its workspace connection is updated.
function LegacyManualNonconformityForm({ action, suppliers = [], contacts = [], initialSupplierId = "" }) {
  const [source, setSource] = useState(initialSupplierId ? "supplier" : "operations");
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const availableContacts = contacts.filter((contact) => contact.supplier_id === supplierId && contact.is_active !== false);
  return <form className="ncrManualForm" action={action}>
    <label>NC classification *<select name="finding_type" required defaultValue="minor_nc"><option value="minor_nc">Minor NC</option><option value="major_nc">Major NC</option></select></label>
    <label>Source *<select name="source_category" required value={source} onChange={(event) => setSource(event.target.value)}><option value="operations">Operational activity</option><option value="supplier">Supplier issue</option><option value="customer_complaint">Customer complaint</option><option value="product_service">Product or service failure</option><option value="process_monitoring">Process monitoring / KPI</option><option value="incident">Incident or near miss</option><option value="management_review">Management review</option><option value="external_audit">External audit</option><option value="other">Other source</option></select></label>
    {source === "supplier" ? <><label className="wide supplierSelector">Supplier from approved register *<select name="supplier_id" required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Select supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.legal_name} · {supplier.supplier_reference} · {String(supplier.approval_status || "draft").replaceAll("_", " ")}</option>)}</select><small>The NC and any linked CAPA–8D will remain visible against this supplier’s live assurance record.</small></label><label className="wide supplierSelector">Responsible owner from supplier contacts *<select name="supplier_contact_id" required defaultValue=""><option value="">Select responsible supplier contact</option>{availableContacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.first_name} {contact.last_name || ""} · {contact.business_title || contact.department || "Supplier contact"} · {contact.email}</option>)}</select><small>{supplierId && !availableContacts.length ? "No active contacts exist for this supplier. Add a contact in Supplier Assurance → Contact details first." : "Only active contacts belonging to the selected supplier are available."}</small></label></> : <input type="hidden" name="supplier_id" value=""/>}
    <label className="wide">NC title *<input name="title" required maxLength="220"/></label>
    <label>Source reference<input name="source_reference" placeholder="Complaint, PO, delivery, incident or record reference"/></label>
    <label>Date detected *<input name="detected_at" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
    <label className="wide">Requirement / criteria *<textarea name="criteria" required placeholder="Applicable standard clause, procedure, contract, specification or legal requirement"/></label>
    <label className="wide">Objective evidence *<textarea name="objective_evidence" required placeholder="What was examined, observed, measured or confirmed?"/></label>
    <label className="wide">Statement of nonconformity *<textarea name="failure_statement" required placeholder="State clearly how the evidence demonstrates failure to meet the requirement."/></label>
    <label>Process / location<input name="process_area"/></label>
    <label>Risk level *<select name="risk_level" required defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
    {source !== "supplier" ? <><label>Responsible owner<input name="responsible_owner_name"/></label><label>Owner email<input name="responsible_owner_email" type="email"/></label></> : null}
    <label>Target response date<input name="agreed_date" type="date"/></label><label>Evidence attachment<input name="evidence_file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx"/></label>
    <div className="wide"><button className="ncrSubmit">Create Controlled NC</button></div>
  </form>;
}
