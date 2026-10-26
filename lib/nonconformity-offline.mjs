/**
 * RPG Excellence — browser-only NC draft and evidence persistence.
 * IndexedDB stores the original Blob, not a temporary file-input reference.
 * This module never authenticates, submits, approves or closes a report.
 * Server permissions and submission identity are rechecked on every submission.
 */
export const NC_OFFLINE_DATABASE = 'rpg-nc-offline-v1';
export const NC_OFFLINE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const NC_OFFLINE_MAX_DRAFTS = 30;
const VERSION = 1;
const CHANNEL = 'rpg-nc-offline-change-v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_LIMITS = Object.freeze({
  finding_type:30,source_category:40,title:220,criteria:12000,objective_evidence:16000,failure_statement:12000,
  process_area:300,risk_level:20,source_reference:300,detected_at:10,agreed_date:10,
  supplier_id:36,supplier_contact_id:36,responsible_person_id:36,responsible_owner_name:220,responsible_owner_email:254,
});
const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf'],
  'text/plain':['txt'],'text/csv':['csv'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['xlsx'],
});
// These errors are produced before insertion by the new server action. Preserve
// the original attempt as well: a concurrent/lost prior request may still have
// registered it. Corrections ALWAYS retain the SAME database submission UUID.
const CORRECTABLE = new Set(['invalid_field','invalid_classification','invalid_date','invalid_reference','supplier_contact_required','invalid_email','invalid_evidence','supplier_unavailable','contact_unavailable','owner_unavailable']);
let connection = null;
function failure(code,message) { const error=new Error(message);error.code=code;return error; }
function safeError(error) {
  if (error?.code && typeof error.code==='string') return error;
  if (error?.name==='QuotaExceededError') return failure('storage_full','Device storage is full. This change was not saved. Keep the form open and free space or submit online.');
  return failure('storage_unavailable','This browser could not save or read NC drafts. Keep the form open and check device storage before leaving.');
}
function scopeKey(scope) {
  if (!scope || !UUID.test(scope.userId || '') || !UUID.test(scope.organizationId || '')) throw failure('invalid_scope','A signed-in account and company are required for device drafts.');
  return `${scope.userId.toLowerCase()}:${scope.organizationId.toLowerCase()}`;
}
function keyFor(scope,id) {
  if (!UUID.test(id || '')) throw failure('invalid_draft','The device draft identity is invalid.');
  return `${scopeKey(scope)}:${id.toLowerCase()}`;
}
function now() { return new Date().toISOString(); }
function revision(value) { return Number.isInteger(value) && value>=1; }
function checkRevision(existing,expected) {
  if (existing ? !revision(expected) || existing.revision!==expected : expected!==null && expected!==undefined) throw failure('draft_changed','This draft changed in another tab. Reload its latest version before saving.');
}
function fieldsOnly(input={}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw failure('invalid_fields','The NC draft fields are invalid.');
  const result={};
  for (const [key,max] of Object.entries(FIELD_LIMITS)) {
    const value=input[key] ?? '';
    if (typeof value!=='string' || value.length>max) throw failure('invalid_fields',`Check ${key.replaceAll('_',' ')}. Maximum ${max} characters.`);
    result[key]=value;
  }
  return result;
}
function defaults() { return { finding_type:'minor_nc',source_category:'operations',risk_level:'medium',detected_at:new Date().toISOString().slice(0,10) }; }
function notify(scope) {
  if (typeof window!=='undefined') window.dispatchEvent(new CustomEvent(CHANNEL,{detail:{scope}}));
  if (typeof BroadcastChannel!=='undefined') {
    try { const channel=new BroadcastChannel(CHANNEL);channel.postMessage({scope});channel.close(); } catch { /* The next explicit read still sees committed data. */ }
  }
}
async function openDatabase() {
  if (connection) return connection;
  if (typeof indexedDB==='undefined') throw failure('storage_unavailable','Offline NC storage is unavailable in this browser.');
  connection=new Promise((resolve,reject)=>{
    let finished=false;
    const request=indexedDB.open(NC_OFFLINE_DATABASE,VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if (!db.objectStoreNames.contains('drafts')) { const store=db.createObjectStore('drafts',{keyPath:'key'});store.createIndex('scope','scope',{unique:false}); }
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots',{keyPath:'scope'});
      if (!db.objectStoreNames.contains('workspace')) db.createObjectStore('workspace',{keyPath:'id'});
    };
    request.onblocked=()=>{ finished=true;connection=null;reject(failure('storage_blocked','Close older RPG Excellence tabs, then try device storage again.')); };
    request.onerror=()=>{ if(!finished){finished=true;connection=null;reject(safeError(request.error));} };
    request.onsuccess=()=>{
      const db=request.result;
      if(finished){db.close();return;}
      finished=true;
      db.onversionchange=()=>{ db.close();connection=null; };
      db.onclose=()=>{connection=null;};
      resolve(db);
    };
  });
  return connection;
}
async function transaction(stores,mode,operation) {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    let tx,result,reason;
    try { tx=db.transaction(stores,mode); } catch(error) { reject(safeError(error));return; }
    const stop=error=>{reason=error;try{tx.abort();}catch{reject(safeError(error));}};
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(safeError(reason || tx.error));
    tx.onerror=()=>{reason ||= tx.error;};
    const set=value=>{result=value;};
    try { operation(tx,set,stop); } catch(error) { stop(error); }
  });
}
async function read(store,key) {
  return transaction([store],'readonly',(tx,set)=>{const request=tx.objectStore(store).get(key);request.onsuccess=()=>set(request.result || null);});
}
function publicDraft(record) {
  if (!record) return null;
  // Only this authenticated scope is ever requested. Storage fields are not
  // credentials; browser origin security still applies to all local content.
  return record;
}
export async function getNcDraft(scope,id) { return publicDraft(await read('drafts',keyFor(scope,id))); }
export async function listNcDrafts(scope) {
  const scoped=scopeKey(scope);
  const rows=await transaction(['drafts'],'readonly',(tx,set)=>{const request=tx.objectStore('drafts').index('scope').getAll(scoped);request.onsuccess=()=>set(request.result);});
  return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
export async function prepareNcEvidence(file) {
  if (file===null) return {file:null,evidence:null};
  if (typeof Blob==='undefined' || !(file instanceof Blob) || typeof file.name!=='string' || !file.name.trim() || file.name.length>180 || file.size<=0 || file.size>NC_OFFLINE_MAX_FILE_BYTES) throw failure('invalid_file','Choose one evidence file up to 10 MB.');
  const extension=file.name.split('.').at(-1)?.toLowerCase();
  const type=file.type || Object.entries(MIME_EXTENSIONS).find(([,extensions])=>extensions.includes(extension))?.[0];
  if (!Object.hasOwn(MIME_EXTENSIONS,type || '')) throw failure('invalid_file','Use PNG, JPEG, WebP, PDF, TXT, CSV, DOCX or XLSX evidence.');
  if (!globalThis.crypto?.subtle) throw failure('secure_context_required','Open RPG Excellence over HTTPS to save and verify evidence on this device.');
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  const sha256=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  // Keep the exact original bytes. No photo conversion or quality loss occurs.
  return {file,evidence:{name:file.name.trim(),type,size:file.size,sha256}};
}
export async function saveNcDraft(scope,input,expectedRevision=null) {
  const scoped=scopeKey(scope);
  if (!input || typeof input!=='object') throw failure('invalid_draft','The NC draft is invalid.');
  const id=input.id===undefined ? globalThis.crypto?.randomUUID?.() : input.id;
  if(input.fields!==undefined && (!input.fields || typeof input.fields!=='object' || Array.isArray(input.fields))) throw failure('invalid_fields','The NC draft fields are invalid.');
  const key=keyFor(scope,id);
  const previous=await getNcDraft(scope,id);
  const fields=fieldsOnly({...defaults(),...(input.fields || {})});
  const attachment=input.file===undefined ? {file:previous?.file || null,evidence:previous?.evidence || null} : await prepareNcEvidence(input.file);
  const stamp=now();
  const saved=await transaction(['drafts'],'readwrite',(tx,set,stop)=>{
    const store=tx.objectStore('drafts'),count=store.index('scope').count(scoped);
    count.onsuccess=()=>{
      const request=store.get(key);
      request.onsuccess=()=>{
        try {
          const current=request.result;
          checkRevision(current,expectedRevision);
          if (current && !['draft','needs_review'].includes(current.state)) throw failure('submission_locked','The original submission is awaiting confirmation or is already registered. Retry that submission or open its controlled NC before editing.');
          if (!current && count.result>=NC_OFFLINE_MAX_DRAFTS) throw failure('draft_limit','This workspace has 30 saved device drafts. Submit or explicitly clear an existing draft before adding another.');
          const record={
            ...(current || {}),key,scope:scoped,id:id.toLowerCase(),userId:scope.userId,organizationId:scope.organizationId,
            revision:(current?.revision || 0)+1,createdAt:current?.createdAt || stamp,updatedAt:stamp,state:'draft',
            fields,file:attachment.file,evidence:attachment.evidence,submission:null,lastError:null,
            receipt:current?.receipt || null,attemptHistory:current?.attemptHistory || [],
          };
          store.put(record);set(record);
        } catch(error) {stop(error);}
      };
    };
  });
  notify(scoped);return saved;
}
async function changeDraft(scope,id,expectedRevision,mutate) {
  const key=keyFor(scope,id),scoped=scopeKey(scope);
  const saved=await transaction(['drafts'],'readwrite',(tx,set,stop)=>{
    const store=tx.objectStore('drafts'),request=store.get(key);
    request.onsuccess=()=>{
      try {
        const current=request.result;
        if(!current) throw failure('draft_missing','This device draft is no longer available.');
        checkRevision(current,expectedRevision);
        const changed=mutate(current);
        const record={...changed,revision:current.revision+1,updatedAt:now()};
        store.put(record);set(record);
      } catch(error) {stop(error);}
    };
  });
  notify(scoped);return saved;
}
function submissionPayload(record) {
  return {user_id:record.userId,organization_id:record.organizationId,client_submission_id:record.id,...record.fields,evidence:record.evidence};
}
export async function startNcSubmission(scope,id,expectedRevision) {
  const draft=await changeDraft(scope,id,expectedRevision,current=>{
    if(current.state==='confirmed') throw failure('already_registered','This draft already has a confirmed NC reference. Open the controlled record.');
    if(current.state==='sending') throw failure('submission_in_progress','This draft is already being submitted. Recover the original attempt if its connection was interrupted.');
    if(current.evidence && !current.file) throw failure('evidence_missing','The saved evidence is unavailable. Re-select the original file before submitting.');
    return {...current,state:'sending',submission:current.submission || submissionPayload(current),lastError:null,attemptedAt:current.attemptedAt || now()};
  });
  return {draft,payload:draft.submission,file:draft.file};
}
export async function recoverNcSubmission(scope,id,expectedRevision) {
  // An interrupted tab cannot prove whether its HTTP request reached the server.
  // Retain the identity and original payload; do not silently turn it into a new NC.
  return changeDraft(scope,id,expectedRevision,current=>{
    if(current.state!=='sending') return current;
    return {...current,state:current.receipt?'evidence_pending':'retry',lastError:{code:'connection_interrupted',message:'The previous submission was interrupted. Retry the original report to check its server status.',retryable:true}};
  });
}
export async function recordNcSubmissionResult(scope,id,expectedRevision,response) {
  return changeDraft(scope,id,expectedRevision,current=>{
    if (!current.submission) throw failure('submission_missing','No saved submission attempt is available for this draft.');
    if (response?.ok===true) {
      const receipt=response.finding;
      if (!receipt || !UUID.test(receipt.id || '') || typeof receipt.reference!=='string' || !receipt.reference.trim() || receipt.reference.length>180 || !['confirmed','evidence_pending'].includes(response.submissionState)) throw failure('invalid_receipt','Server confirmation was incomplete. Keep the draft and retry the original submission.');
      if(current.receipt && current.receipt.id!==receipt.id) throw failure('receipt_changed','The confirmed NC identity changed unexpectedly. Retain this draft and contact your administrator.');
      const confirmed=response.submissionState==='confirmed';
      return {...current,state:confirmed?'confirmed':'evidence_pending',receipt:{id:receipt.id,reference:receipt.reference,href:`/portal/internal-audit-actions?record=${encodeURIComponent(receipt.id)}#nc-${encodeURIComponent(receipt.id)}`},
        // File bytes are released ONLY after final server confirmation, including
        // evidence verification. Failed or partial uploads retain the original.
        file:confirmed?null:current.file,attemptHistory:confirmed?[]:current.attemptHistory,
        confirmedAt:confirmed?now():null,lastError:null};
    }
    if(response?.ok!==false || typeof response.error?.code!=='string' || typeof response.error?.message!=='string') throw failure('invalid_receipt','The server response was not recognised. Retain the draft and retry.');
    const error={code:response.error.code.slice(0,100),message:response.error.message.slice(0,1500),retryable:response.error.retryable===true};
    if(CORRECTABLE.has(error.code)) {
      if(current.attemptHistory.length>=5) return {...current,state:'retry',lastError:{...error,message:'Resolve the original submission before making further corrections. Five prior attempts are retained on this device.'}};
      return {...current,state:'needs_review',attemptHistory:[...current.attemptHistory,{submission:current.submission,file:current.file,savedAt:now()}],submission:null,lastError:error};
    }
    return {...current,state:current.receipt?'evidence_pending':'retry',lastError:error};
  });
}
export async function restoreNcSubmissionAttempt(scope,id,expectedRevision,index) {
  return changeDraft(scope,id,expectedRevision,current=>{
    if(current.state==='confirmed' || current.state==='sending') throw failure('submission_locked','This draft cannot be changed in its current state.');
    if(!Number.isInteger(index) || !current.attemptHistory[index]) throw failure('attempt_missing','The selected original submission attempt is unavailable.');
    const saved=current.attemptHistory[index];
    if(saved.submission.client_submission_id!==current.id || saved.submission.user_id!==current.userId || saved.submission.organization_id!==current.organizationId) throw failure('invalid_scope','The saved attempt does not belong to this draft.');
    const {user_id,organization_id,client_submission_id,evidence,...fields}=saved.submission;
    return {...current,fields:fieldsOnly(fields),file:saved.file,evidence,submission:saved.submission,state:'retry',lastError:null};
  });
}
export async function deleteNcDraft(scope,id,expectedRevision,{discardUnconfirmed=false}={}) {
  const key=keyFor(scope,id),scoped=scopeKey(scope);
  await transaction(['drafts'],'readwrite',(tx,set,stop)=>{
    const store=tx.objectStore('drafts'),request=store.get(key);
    request.onsuccess=()=>{
      try {
        const record=request.result;if(!record){set(false);return;}
        checkRevision(record,expectedRevision);
        if(record.attemptedAt && record.state!=='confirmed' && !discardUnconfirmed) throw failure('confirmation_required','This report may already be registered or have evidence pending. Confirm explicit removal of its device copy before clearing it.');
        store.delete(key);set(true);
      } catch(error) {stop(error);}
    };
  });
  notify(scoped);
}
function pick(row,keys) { return Object.fromEntries(keys.filter(k=>row[k]!==undefined).map(k=>[k,row[k]])); }
function cacheSnapshot(snapshot,scope) {
  if(!snapshot || snapshot.currentUserId!==scope.userId || snapshot.organization?.id!==scope.organizationId) throw failure('invalid_scope','The saved workspace does not match the current account and company.');
  const specs={
    findings:['id','organization_id','audit_id','supplier_id','finding_reference','finding_type','risk_level','title','failure_statement','criteria','objective_evidence','process_area','responsible_owner_name','agreed_date','status','linked_rca_case_id','closure_verified','created_at','closed_at','closure_verified_at','updated_at','source_type','source_category','source_reference','detected_at'],
    access:['id','finding_id','assignee_user_id','assignee_name','status','created_at','updated_at'],
    audits:['id','audit_reference','title'],capaCases:['id','status'],
    suppliers:['id','legal_name','supplier_reference','approval_status'],
    contacts:['id','supplier_id','first_name','last_name','business_title','is_active'],
    people:['id','first_name','last_name','position','account_status'],
  };
  const clean={currentUserId:scope.userId,organization:{id:scope.organizationId,name:String(snapshot.organization.name || 'Organisation').slice(0,300)},asOf:snapshot.asOf || null,fetchedAt:snapshot.fetchedAt || null,canCreate:snapshot.canCreate===true,canExecutiveReport:snapshot.canExecutiveReport===true,legacyUnassigned:Number(snapshot.legacyUnassigned)||0};
  for(const [key,keys] of Object.entries(specs)) clean[key]=(Array.isArray(snapshot[key])?snapshot[key]:[]).map(row=>pick(row,keys));
  // Response text, passwords, JWTs, access tokens, signed upload credentials and
  // subscription objects are never included in this offline read snapshot.
  return clean;
}
export async function saveNcWorkspaceSnapshot(scope,snapshot) {
  const scoped=scopeKey(scope),record={scope:scoped,savedAt:now(),snapshot:cacheSnapshot(snapshot,scope)};
  await transaction(['snapshots','workspace'],'readwrite',(tx,set)=>{
    tx.objectStore('snapshots').put(record);
    tx.objectStore('workspace').put({id:'active',scope:scoped,userId:scope.userId,organizationId:scope.organizationId,lastOnlineAt:record.savedAt});
    set(record);
  });
  notify(scoped);return record;
}
export async function getNcWorkspaceSnapshot(scope) { return read('snapshots',scopeKey(scope)); }
export async function getActiveNcWorkspace() { return read('workspace','active'); }
export async function deactivateNcWorkspace() {
  // Call on sign-out/account change. Drafts remain in their original namespace;
  // the offline landing page must not silently open a previous account's data.
  return transaction(['workspace'],'readwrite',(tx)=>{tx.objectStore('workspace').delete('active');});
}
export async function clearNcWorkspace(scope,{discardUnconfirmed=false}={}) {
  const scoped=scopeKey(scope);
  await transaction(['drafts','snapshots','workspace'],'readwrite',(tx,set,stop)=>{
    const drafts=tx.objectStore('drafts'),request=drafts.index('scope').getAll(scoped);
    request.onsuccess=()=>{
      try {
        if(!discardUnconfirmed && request.result.some(r=>r.state!=='confirmed')) throw failure('confirmation_required','Unsubmitted NC drafts are stored here. Confirm their explicit removal before clearing this workspace.');
        for(const draft of request.result) drafts.delete(draft.key);
        tx.objectStore('snapshots').delete(scoped);
        const active=tx.objectStore('workspace').get('active');active.onsuccess=()=>{if(active.result?.scope===scoped)tx.objectStore('workspace').delete('active');};
        set(true);
      } catch(error) {stop(error);}
    };
  });
  notify(scoped);
}
export function subscribeNcOffline(scope,listener) {
  const scoped=scopeKey(scope);
  if(typeof listener!=='function') throw failure('invalid_listener','A draft change listener is required.');
  const changed=event=>{if(event.detail?.scope===scoped)listener();};
  if(typeof window!=='undefined') window.addEventListener(CHANNEL,changed);
  let channel;
  try {if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel(CHANNEL);channel.onmessage=event=>{if(event.data?.scope===scoped)listener();};}}catch{/* Explicit refresh remains available. */}
  return ()=>{if(typeof window!=='undefined')window.removeEventListener(CHANNEL,changed);channel?.close();};
}
export async function requestNcPersistentStorage() {
  try {return Boolean(await globalThis.navigator?.storage?.persist?.());}catch{return false;}
}
