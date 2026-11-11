export const DOCUMENT_TYPES=['Policy','Procedure','Work Instruction','Manual','Plan','Form','Template','Register','Assessment','Report','Guidance','Specification','External Document','Record','Other'];
export const DOCUMENT_SERIES={Policy:'POL',Procedure:'PRO','Work Instruction':'WI',Manual:'MAN',Plan:'PLAN',Form:'FRM',Template:'TPL',Register:'REG',Assessment:'ASM',Report:'RPT',Guidance:'GDE',Specification:'SPEC','External Document':'EXT',Record:'REC',Other:'OTH'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function documentDraftValues(form){
 const text=(k,max=10000)=>{const value=String(form.get(k)||'').trim();if(value.length>max)throw new Error(`${k.replaceAll('_',' ')} is too long.`);return value;};
 const ids=k=>{const values=[...new Set(form.getAll(k).map(String))];if(values.length>500||values.some(x=>!UUID.test(x)))throw new Error(`Choose valid ${k.replaceAll('_',' ')}.`);return values;};
 const payload={};for(const k of ['title','description','revision','change_reason','change_impact','due_date','review_date','distribution','applicability','expected_updated_at'])payload[k]=text(k,k==='title'?300:10000);
 payload.document_type=text('document_type',50);if(!DOCUMENT_TYPES.includes(payload.document_type))throw new Error('Select a document type.');
 payload.owner_person_id=text('owner_person_id',36);if(!UUID.test(payload.owner_person_id))throw new Error('Select the document owner.');
 if(!payload.title||!payload.revision||!payload.change_reason||!payload.change_impact)throw new Error('Complete the title, revision, reason and impact assessment.');
 if(!['company','selected'].includes(payload.distribution)||!['company','selected'].includes(payload.applicability))throw new Error('Choose applicability and distribution.');
 payload.reviews=[...ids('verifiers').map(person_id=>({person_id,role:'verifier'})),...ids('approvers').map(person_id=>({person_id,role:'approver'}))];
 payload.recipients=ids('recipients');payload.sites=ids('sites');payload.departments=ids('departments');
 payload.classifications=[...new Set(form.getAll('classifications').map(String))];if(payload.classifications.length>100||payload.classifications.some(x=>!/^[a-z0-9_]{1,80}$/.test(x)))throw new Error('Choose valid classifications.');
 for(const k of ['due_date','review_date'])if(payload[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(payload[k]))throw new Error('Choose valid dates.');
 return payload;
}
