export const SOA_ACTION_STATUSES=['not_required','planned','in_progress','awaiting_verification','verified','cancelled'];
export function soaControlHref(assessmentId,controlId){return `/portal/assessments/${encodeURIComponent(assessmentId)}/soa?q=${encodeURIComponent(controlId)}&control=${encodeURIComponent(controlId)}#soa-${controlId.replaceAll('.','_')}`;}
export function soaPerson(people,id,label,required=false){
 if(!id){if(required)throw Error(`Select an active company user for ${label}.`);return null;}
 const person=people.find(p=>p.id===id&&p.account_status==='active');
 if(!person)throw Error(`${label} must be an active user in this company.`);
 return person;
}
export const soaPersonName=p=>p?[p.first_name,p.last_name].filter(Boolean).join(' ')||p.email:'';
export function validateSoaAction({values,existing={},people,actorId,canApprove}){
 const action=String(values.action_required||'').trim(),status=values.action_status;
 if(!SOA_ACTION_STATUSES.includes(status))throw Error('Select a valid action status.');
 if(!action){if(existing.action_required)throw Error('Retain the recorded action and cancel it with a reason instead of deleting its history.');if(status!=='not_required')throw Error('Record an action before selecting its status.');return;}
 if(status==='not_required')throw Error('Choose a status for the recorded action.');
 soaPerson(people,values.action_owner_person_id,'action owner',true);
 if(!values.target_date)throw Error('An assigned action requires a target date.');
 const verifier=soaPerson(people,values.action_verifier_person_id,'action verifier',['awaiting_verification','verified'].includes(status));
 const owner=people.find(p=>p.id===values.action_owner_person_id);
 if(['awaiting_verification','verified'].includes(status)){
  if(!values.action_completion_evidence)throw Error('Record completion evidence before requesting verification.');
  if(verifier.id===owner.id||verifier.user_id&&verifier.user_id===owner.user_id)throw Error('The action owner cannot verify their own action.');
 }
 if(status==='verified'){
  if(existing.action_status!=='awaiting_verification'&&existing.action_status!=='verified')throw Error('Submit the action for verification before verifying it.');
  if(!canApprove||verifier?.user_id!==actorId||owner?.user_id===actorId)throw Error('Only the assigned independent reviewer with approval access can verify this action.');
  if(!values.action_verification_conclusion)throw Error('Record the independent verification conclusion.');
 }
 if(status==='cancelled'&&!values.action_verification_conclusion)throw Error('Record why this action is cancelled.');
 if(existing.action_status==='verified'&&status==='verified'){
  const keys=['action_required','action_owner_person_id','action_verifier_person_id','target_date','action_completion_evidence'];
  if(keys.some(k=>(existing[k]||'')!==(values[k]||'')))throw Error('Reopen the action before changing verified work.');
 }
}
export function soaTasks(entries=[]){return entries.filter(r=>r.action_required&&r.action_status!=='not_required').map(r=>({id:`soa:${r.assessment_id}:${r.control_id}`,source:'isms',module:'Information Security / SoA',title:`${!r.action_owner_person_id?'Assign action owner — ':''}A.${r.control_id}: ${r.action_required}`,due:r.target_date||'',assignee:r.action_status==='awaiting_verification'?r.action_verifier_person_id:r.action_owner_person_id,assigneeUserId:!r.action_owner_person_id?r.owner_id:null,status:r.action_status||'planned',href:soaControlHref(r.assessment_id,r.control_id),ownerName:r.control_owner||r.risk_owner||'',updated:r.updated_at}));}
export function validateSoaUpload(file,bytes){
 if(!file||!file.size)return;
 if(file.size>10*1024*1024)throw Error('Each evidence file must be 10 MB or smaller.');
 const extensions={'application/pdf':['pdf'],'image/png':['png'],'image/jpeg':['jpg','jpeg'],'image/webp':['webp'],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['docx'],'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['xlsx'],'text/plain':['txt'],'text/csv':['csv']};
 const ext=String(file.name).split('.').pop().toLowerCase();
 if(!extensions[file.type]?.includes(ext))throw Error('Use PDF, PNG, JPEG, WebP, DOCX, XLSX, TXT or CSV evidence.');
 const text=new TextDecoder().decode(bytes.slice(0,12));
 if(file.type==='application/pdf'&&!text.startsWith('%PDF-')||file.type==='image/png'&&!(bytes[0]===137&&text.slice(1,4)==='PNG')||file.type==='image/jpeg'&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||file.type==='image/webp'&&!(text.startsWith('RIFF')&&text.slice(8,12)==='WEBP')||['docx','xlsx'].includes(ext)&&!(bytes[0]===80&&bytes[1]===75))throw Error('The evidence contents do not match the selected file type.');
}
