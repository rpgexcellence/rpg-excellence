import {signDefinition,signScopeText} from '../lib/safety-signs.mjs';
export default function ZoneSafetySigns({signs=[]}) {
 if(!signs.length)return null;
 return <div className="zone-selected-signs">{signs.map(sign=>{const def=signDefinition(sign.code);return def?<article className={`zone-safety-sign ${def.category}`} key={sign.code}><img src={`data:image/png;base64,${def.png}`} width="64" height="64" alt={def.title}/><div><strong>{def.title}</strong><small>{signScopeText(sign)}</small><p>{sign.instruction||'Instruction not entered'}</p>{sign.assessment_id&&<small>Linked assessment · v{sign.assessment_version||'—'}</small>}</div></article>:null;})}</div>;
}
