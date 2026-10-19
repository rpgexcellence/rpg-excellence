'use client';
import {useActionState,useState} from 'react';
export default function ZoneEditor({action,site,zone,buildings,people,programmes,inspections,assessments,assessmentIds}) {
 const [state,formAction,pending]=useActionState(action,null),[step,setStep]=useState(0);
 const [name,setName]=useState(zone?.name||''),[reference,setReference]=useState(zone?.reference||''),[mode,setMode]=useState(zone?.access_mode||'company');
 const steps=['Zone details','Link safety records','Review & publish'];
 const chooseRecords=(title,rows,field,selected,referenceKey)=> <fieldset className="zone-records"><legend>{title}</legend>{rows.length?rows.map(row=><label className="zone-check" key={row.id}><input type="checkbox" name={field} value={row.id} defaultChecked={selected.includes(row.id)}/><span><strong>{row.title}</strong><small>{row[referenceKey]} · {row.status.replaceAll('_',' ')}{row.version?` · v${row.version}`:''}</small></span></label>):<p>No eligible records at this controlled site. Create records in the relevant module first.</p>}</fieldset>;
 return <form action={formAction} noValidate className="zone-editor">
 <input type="hidden" name="site_id" value={site.id}/><input type="hidden" name="id" value={zone?.id||''}/><input type="hidden" name="version" value={zone?.version||0}/>
 <nav className="zone-steps" aria-label="Zone setup">{steps.map((label,index)=><button type="button" key={label} aria-current={step===index?'step':undefined} onClick={()=>setStep(index)}>{index+1}. {label}</button>)}</nav>
 <div className="zone-grid"><div className="zone-panel">
 <section hidden={step!==0}><h2>Location & identity</h2><p>{site.site_name} · {site.site_reference}</p><div className="zone-fields">
 <label>Zone name *<input name="name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="Welding Workshop"/></label>
 <label>Zone reference *<input name="reference" required maxLength={40} value={reference} onChange={e=>setReference(e.target.value)} placeholder="ZONE-A"/></label>
 <label>Building<select name="building_id" defaultValue={zone?.building_id||''}><option value="">Outdoor area / no building</option>{buildings.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
 <label>Floor / level<input name="floor_level" maxLength={120} defaultValue={zone?.floor_level||''}/></label>
 <label className="zone-wide">Description<textarea name="description" maxLength={3000} defaultValue={zone?.description||''}/></label>
 <label>Area owner *<select name="owner_person_id" required defaultValue={zone?.owner_person_id||''}><option value="">Select active Company User</option>{people.map(p=><option value={p.id} key={p.id}>{[p.first_name,p.last_name].filter(Boolean).join(' ')||'Company User'}</option>)}</select></label>
 <label>Deputy<select name="deputy_person_id" defaultValue={zone?.deputy_person_id||''}><option value="">Not assigned</option>{people.map(p=><option value={p.id} key={p.id}>{[p.first_name,p.last_name].filter(Boolean).join(' ')||'Company User'}</option>)}</select></label>
 </div></section>
 <section hidden={step!==1}><h2>Link safety records</h2><p>Select exact records for this zone. No records are linked by text matching. Programme links apply to future inspections; select historical inspections separately.</p>
 {chooseRecords('Inspection programmes',programmes.filter(x=>!x.zone_id||x.zone_id===zone?.id),'programme_ids',programmes.filter(x=>x.zone_id===zone?.id).map(x=>x.id),'programme_reference')}
 {chooseRecords('Existing inspections',inspections.filter(x=>!x.zone_id||x.zone_id===zone?.id),'inspection_ids',inspections.filter(x=>x.zone_id===zone?.id).map(x=>x.id),'inspection_reference')}
 {chooseRecords('Risk assessments',assessments,'assessment_ids',assessmentIds,'assessment_reference')}
 <p>Only approved or communicated assessments are visible to employees. Revisions must be linked and checked before publishing.</p></section>
 <section hidden={step!==2}><h2>Review & publish</h2><p>These instructions are displayed exactly as entered. Confirm their accuracy before publishing.</p>
 <label>Area restriction / urgent instruction<textarea name="restriction" maxLength={3000} defaultValue={zone?.restriction||''} placeholder="Leave blank if there is no restriction recorded."/></label>
 <label>PPE & key controls<textarea name="key_controls" maxLength={3000} defaultValue={zone?.key_controls||''}/></label>
 <label>Emergency information * for publishing<textarea name="emergency_information" maxLength={3000} defaultValue={zone?.emergency_information||''} placeholder="Local alarm, assembly point and emergency contact instructions"/></label>
 <label>Employee access<select name="access_mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="company">Company sign-in required</option><option value="link">Selected information available to anyone with the link</option></select></label>
 <fieldset className="zone-records"><legend>Employee page content</legend><label className="zone-check"><input type="checkbox" name="show_inspections" defaultChecked={zone?.show_inspections??true}/>Inspection references, dates and aggregate action counts</label><label className="zone-check"><input type="checkbox" name="show_assessments" defaultChecked={zone?.show_assessments??true}/>Approved assessment titles, hazards and existing controls</label><label className="zone-check"><input type="checkbox" name="show_owner" defaultChecked={zone?.show_owner??false}/>Area owner's name (no personal contact details)</label></fieldset>
 {mode==='link'&&<label className="zone-check zone-notice"><input type="checkbox" name="confirm_public"/>I confirm the selected records and instructions are suitable for anyone with the link, including assessment hazards and existing controls. Draft assessments, attachments and personal action details remain restricted.</label>}
 <label>Publication status<select name="status" defaultValue={zone?.status||'draft'}><option value="draft">Draft — employee page unavailable</option><option value="published">Published — employee page available</option><option value="archived">Archived — QR page unavailable</option></select></label>
 </section>
 {state?.error&&<p role="alert" className="zone-error">{state.error}</p>}
 <footer className="zone-buttons">{step>0&&<button type="button" onClick={()=>setStep(step-1)}>← Back</button>}{step<2?<button className="zone-button" type="button" onClick={()=>setStep(step+1)}>Continue →</button>:<button className="zone-button" disabled={pending}>{pending?'Saving…':'Save zone'}</button>}</footer>
 </div><aside className="zone-panel zone-preview"><small>EMPLOYEE PAGE PREVIEW · UNSAVED DETAILS</small><div className="zone-brand">RPG EXCELLENCE</div><p>{site.site_name}</p><h2>{reference||'Zone reference'}</h2><h3>{name||'Zone name'}</h3><p>The employee page shows saved, published records.</p>{['Workplace inspections','Risk assessments','PPE & key controls','Emergency information'].map(x=><div className="zone-preview-row" key={x}>{x} →</div>)}<p className="zone-notice">Saving creates a permanent zone link and QR code. Publish the page before downloading its poster.</p></aside></div>
 </form>;
}
