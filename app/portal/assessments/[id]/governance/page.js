"use client";
import {useMemo,useState} from "react";

const Field=({label,help,children})=><label style={{display:"grid",gap:7,fontWeight:850,color:"#102640"}}><span>{label}</span>{children}<small style={{color:"#647b92",fontWeight:500,lineHeight:1.4}}>{help}</small></label>;
const selectStyle={width:"100%",minWidth:0,height:48,padding:"0 13px",border:"1px solid #cad8e7",borderRadius:10,background:"#fff",font:"inherit",color:"#102640"};
export default function AssessmentGovernanceForm({action,assessment,people}){
 const [lead,setLead]=useState(assessment.lead_assessor_person_id||"");
 const [approver,setApprover]=useState(assessment.approver_person_id||"");
 const option=(person)=><option key={person.id} value={person.id}>{person.name}{person.position?` · ${person.position}`:""}</option>;
 const owners=useMemo(()=>people.filter(p=>["contribute","review","approve","admin"].includes(p.assessmentLevel)&&p.functions.includes("assessment_owner")),[people]);
 const leads=useMemo(()=>people.filter(p=>["contribute","review","approve","admin"].includes(p.assessmentLevel)&&p.functions.some(f=>["lead_assessor","auditor"].includes(f))),[people]);
 const sponsors=useMemo(()=>people.filter(p=>p.assessmentLevel!=="none"),[people]);
 const approvers=useMemo(()=>people.filter(p=>["approve","admin"].includes(p.assessmentLevel)&&p.functions.includes("approver")&&p.id!==lead),[people,lead]);
 const verifiers=useMemo(()=>people.filter(p=>["review","approve","admin"].includes(p.assessmentLevel)&&p.functions.includes("effectiveness_verifier")&&p.id!==lead),[people,lead]);
 return <form action={action} style={{display:"grid",gap:22}}>
  <input type="hidden" name="assessment_id" value={assessment.id}/>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:18}}>
   <Field label="Assessment owner *" help="Accountable for scope, resources, progress and controlled completion."><select style={selectStyle} name="assessment_owner_person_id" required defaultValue={assessment.assessment_owner_person_id||""}><option value="">Select authorised assessment owner</option>{owners.map(option)}</select></Field>
   <Field label="Lead assessor *" help="Must hold Assessments access and an authorised Lead Assessor or Auditor function."><select style={selectStyle} name="lead_assessor_person_id" required value={lead} onChange={e=>{setLead(e.target.value);if(e.target.value===approver)setApprover("")}}><option value="">Select authorised lead assessor</option>{leads.map(option)}</select></Field>
   <Field label="Executive sponsor *" help="Leadership contact responsible for resources, barriers and management attention."><select style={selectStyle} name="executive_sponsor_person_id" required defaultValue={assessment.executive_sponsor_person_id||""}><option value="">Select executive sponsor</option>{sponsors.map(option)}</select></Field>
   <Field label="Assessment approver *" help="Cannot be the lead assessor. Requires Approve or Admin access and the Approver function."><select style={selectStyle} name="approver_person_id" required value={approver} onChange={e=>setApprover(e.target.value)}><option value="">Select independent approver</option>{approvers.map(option)}</select></Field>
   <Field label="Effectiveness verifier *" help="Independent Company User who verifies corrective-action effectiveness."><select style={selectStyle} name="effectiveness_verifier_person_id" required defaultValue={assessment.effectiveness_verifier_person_id||""}><option value="">Select independent verifier</option>{verifiers.map(option)}</select></Field>
  </div>
  {!people.length&&<p style={{color:"#b42318"}}>No active Company Users are available. Add users under Administration → People, Roles &amp; Access.</p>}
  <label style={{display:"flex",gap:10,alignItems:"flex-start",fontWeight:750,color:"#334b65"}}><input type="checkbox" name="approval_confirmation" required style={{marginTop:3}}/><span>I confirm that the nominated people are authorised, competent for their assigned functions and sufficiently independent for approval and effectiveness verification.</span></label>
  <button style={{justifySelf:"start",padding:"13px 19px",border:0,borderRadius:10,background:"#245ee8",color:"#fff",fontWeight:900,cursor:"pointer"}}>Save controlled governance</button>
 </form>;
}
