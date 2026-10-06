export default function RcaGateReviewerField({people,discipline,locked=false}) {
  return <div style={{flexBasis:"100%",display:"grid",gap:8,maxWidth:640}}>
    {discipline.status==="approved" ? <p style={{margin:0,color:"#174b3c"}}>Company reviewer: <strong>{discipline.reviewer_name || "Not recorded on this earlier approval"}</strong>{discipline.reviewer_email ? ` · ${discipline.reviewer_email}` : ""}</p> : <label style={{display:"grid",gap:8,fontWeight:800}}>Company reviewer<select name="reviewer_person_id" defaultValue={discipline.reviewer_person_id || ""} disabled={locked || !people.length} style={{width:"100%",minWidth:0,minHeight:48,padding:"12px 14px",border:"1px solid #cfdae8",borderRadius:10,fontSize:16}}><option value="">Select company user before confirming approval</option>{people.map(row=><option key={row.id} value={row.id}>{row.name}{row.email?` · ${row.email}`:""}</option>)}</select></label>}
    {!people.length && <small>Add or activate company users under <a href="/portal/company/people">Administration → People, Roles &amp; Access</a>.</small>}
    <small style={{color:"#607089",lineHeight:1.5}}>The selected reviewer is recorded with this gate. Your signed-in account records the approval confirmation.</small>
  </div>;
}
