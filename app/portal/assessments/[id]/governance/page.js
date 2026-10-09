import Link from "next/link";
import AssessmentGovernanceForm from "../../../../../components/AssessmentGovernanceForm";
import {requireAssessmentOrganizationAccess} from "../../../../../lib/assessment-organization-access";
import {loadAssessmentPeople,personName} from "../../../../../lib/assessment-people";
import {saveAssessmentGovernance} from "./actions";

export default async function AssessmentGovernancePage({params,searchParams}){
 const {id}=await params,query=await searchParams;
 const access=await requireAssessmentOrganizationAccess(id,"view"),assessment=access.assessment;
 const people=await loadAssessmentPeople(assessment.organization_id),byId=new Map(people.map(p=>[p.id,p]));
 const assignments=[['Assessment owner',assessment.assessment_owner_person_id],['Lead assessor',assessment.lead_assessor_person_id],['Executive sponsor',assessment.executive_sponsor_person_id],['Approver',assessment.approver_person_id],['Effectiveness verifier',assessment.effectiveness_verifier_person_id]];
 return <main style={{minHeight:"100vh",background:"#edf3fa",padding:"36px clamp(18px,4vw,54px)",color:"#071a33",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1200,margin:"0 auto"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start",flexWrap:"wrap",marginBottom:22}}><div><span style={{color:"#245ee8",fontWeight:950,fontSize:11,letterSpacing:".12em"}}>CONTROLLED ASSESSMENT GOVERNANCE</span><h1 style={{margin:"6px 0",fontSize:36}}>People roles and access</h1><p style={{margin:0,color:"#617890"}}>{assessment.standard} · Company Users and segregation of duties</p></div><div style={{display:"flex",gap:10}}><Link href={`/portal/assessments/${id}`} style={{padding:"11px 15px",border:"1px solid #cad8e7",borderRadius:9,background:"#fff",color:"#071a33",textDecoration:"none",fontWeight:850}}>← Assessment</Link><Link href="/portal/company/people" style={{padding:"11px 15px",borderRadius:9,background:"#071a33",color:"#fff",textDecoration:"none",fontWeight:850}}>Manage Company Users</Link></div></header>
  {query?.saved&&<div style={{padding:"14px 17px",border:"1px solid #98d6bc",borderRadius:10,background:"#eefaf5",color:"#08704a",fontWeight:850,marginBottom:16}}>Controlled governance saved and recorded in the access audit trail.</div>}
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,marginBottom:16}}>{assignments.map(([label,id])=><div key={label} style={{padding:17,border:"1px solid #d7e2ed",borderRadius:12,background:"#fff"}}><small style={{color:"#657b91",fontWeight:850}}>{label}</small><strong style={{display:"block",marginTop:7}}>{id?personName(byId.get(id)):"Not assigned"}</strong></div>)}</section>
  <section style={{padding:"26px",border:"1px solid #d7e2ed",borderRadius:16,background:"#fff"}}><h2 style={{marginTop:0}}>Controlled role assignment</h2><p style={{color:"#617890",lineHeight:1.6}}>Only active Company Users with the required Assessments permission and professional authorisation are available for controlled roles. Configure missing permissions under Administration → People, Roles &amp; Access.</p>{access.level==="admin"||access.level==="owner"?<AssessmentGovernanceForm action={saveAssessmentGovernance} assessment={assessment} people={people}/>:<p style={{padding:14,background:"#fff8e8",color:"#8a6116",borderRadius:9,fontWeight:800}}>You can view governance, but Assessments Admin access is required to change it.</p>}</section>
 </div></main>;
}
