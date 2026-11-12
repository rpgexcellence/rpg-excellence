export default function SoaPersonField({people=[],name,id,legacy='',label,canEdit,required=false,fieldStyle,labelStyle}){
 const legacyMatches=people.filter(p=>legacy&&([p.first_name,p.last_name].filter(Boolean).join(' ')===legacy||p.email===legacy));
 const selected=id&&people.some(p=>p.id===id)?id:!id&&legacyMatches.length===1?legacyMatches[0].id:'';
 return <label style={labelStyle}>{label}{required?' *':''}<select name={name} defaultValue={selected} disabled={!canEdit} required={required} style={fieldStyle}><option value="">Select active company user</option>{people.map(p=><option key={p.id} value={p.id}>{[p.first_name,p.last_name].filter(Boolean).join(' ')||p.email}{p.email?` · ${p.email}`:''}</option>)}</select>{legacy&&!selected&&<small>Previously recorded: {legacy}. Select a current company user to retain this assignment.</small>}{!people.length&&<small>Add an active user under Administration → People, Roles &amp; Access.</small>}</label>;
}
