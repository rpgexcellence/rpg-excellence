'use client';
import {useState,useEffect} from 'react';
import styles from './commercial.module.css';

export default function MicrosoftConnection({connection:initialConnection,onRefresh}){
 const [refreshedConnection,setRefreshedConnection]=useState(null),[refreshing,setRefreshing]=useState(false),[refreshResult,setRefreshResult]=useState(null);
 const connection=refreshedConnection||initialConnection;
 useEffect(()=>{setRefreshedConnection(null);},[initialConnection]);
 async function refreshSavedDrafts(){
  if(refreshing)return;
  setRefreshing(true);setRefreshResult(null);
  try{
   const response=await fetch('/api/portal/marketing/microsoft',{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'The saved draft list could not be refreshed.');
   if(!Array.isArray(result.drafts))throw Error('The saved draft list returned an unreadable response.');
   setRefreshedConnection(result);
   const checked=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   setRefreshResult({ok:true,message:`Saved list refreshed at ${checked}. ${result.drafts.length} saved record${result.drafts.length===1?'':'s'}.`});
  }catch(error){setRefreshResult({ok:false,message:error.name==='TimeoutError'||error.name==='AbortError'?'The saved list refresh timed out. Please try again.':error.message||'The saved list could not be refreshed.'});}
  finally{setRefreshing(false);}
 }
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[checking,setChecking]=useState(false),[mailboxCheck,setMailboxCheck]=useState(null);
 async function disconnect(){setBusy(true);setNotice('');try{const r=await fetch('/api/portal/marketing/microsoft/disconnect',{method:'POST'});if(!r.ok)throw Error('The mailbox could not be disconnected.');setNotice('Mailbox disconnected. Existing Outlook drafts are retained.');await onRefresh();}catch(e){setNotice(e.message);}finally{setBusy(false);}}
 async function checkMailbox(){setChecking(true);try{const r=await fetch('/api/portal/marketing/microsoft/check',{method:'POST'}),result=await r.json();setMailboxCheck(result);}catch{setMailboxCheck({ok:false,message:'RPG could not complete the mailbox check. Try the check again shortly.'});}finally{setChecking(false);}}
 const ready=connection?.configured&&connection?.databaseReady;
 return <><section className={styles.microsoftPanel}><div><span className={styles.badge}>{connection?.connected?'Microsoft account connected':'Connection setup'}</span><h2>Your Outlook. Your commercial conversations.</h2><p>Authorised mailbox: <strong>info@rpgexcellence.com</strong></p><p>Create a branded Outlook draft from a reviewed proposal. Open it in Outlook for final review and sending.</p>{!connection?<p role="status">Checking Microsoft connection…</p>:<>{!connection.configured&&<p className={styles.formHint}>Complete the Microsoft application settings in Vercel: {connection.missing.join(', ')}.</p>}{!connection.databaseReady&&<p className={styles.formHint}>Complete the private Microsoft connection database setup before connecting.</p>}<form method="POST" action="/api/portal/marketing/microsoft/connect"><button className={styles.primary} disabled={!ready}>{connection.connected?'Reconnect Microsoft 365':'Connect Microsoft 365'}</button></form>{connection.connected&&<button className={styles.secondary} disabled={busy} onClick={disconnect}>{busy?'Disconnecting…':'Disconnect mailbox'}</button>}</>}<div style={{marginTop:16}}>{connection?.connected&&<button className={styles.secondary} disabled={checking} onClick={checkMailbox}>{checking?'Checking mailbox…':'Check mailbox access'}</button>}{mailboxCheck&&<p role="status">{mailboxCheck.ok?'Mailbox access verified. RPG can reach the Outlook Drafts folder.':mailboxCheck.message}{mailboxCheck.code?` (${mailboxCheck.code}${mailboxCheck.httpStatus?`; HTTP ${mailboxCheck.httpStatus}`:''})`:''}</p>}</div><p className={styles.formHint}>Website access stays restricted to your two RPG accounts. Connect to Microsoft using info@rpgexcellence.com. Automatic sending and reply synchronisation are not active in this release.</p>{notice&&<p role="status">{notice}</p>}</div></section><section className={styles.panel}><header><h2>Saved Outlook drafts</h2><button type="button" className={styles.secondary} disabled={refreshing} aria-busy={refreshing} onClick={refreshSavedDrafts}>{refreshing?'Refreshing saved list…':'Refresh saved list'}</button></header><div className={styles.libraryBody} aria-busy={refreshing}>
 <p className={styles.formHint}>This list shows draft records saved by RPG. Refreshing it does not search Outlook for drafts with an uncertain outcome. <a href="https://outlook.office.com/mail/" target="_blank" rel="noopener noreferrer">Open Outlook to check Drafts ↗</a></p>
 {refreshing&&<p role="status" aria-live="polite">Refreshing saved draft records…</p>}
 {refreshResult&&<p role={refreshResult.ok?'status':'alert'} aria-live="polite">{refreshResult.message}</p>}
 {!connection?.drafts?.length?<p>No Outlook drafts have been created from RPG yet.</p>:connection.drafts.map(d=><div className={styles.accountRow} key={d.id}><span><b>{d.subject}</b><br/><small>{d.recipient} · {new Date(d.created_at).toLocaleDateString('en-GB')} · {d.status==='draft'?'Saved in Outlook':d.status==='creating'?'Check Outlook — creation in progress':'Check Outlook — outcome uncertain'}</small></span>{d.outlook_url&&<a href={d.outlook_url} target="_blank" rel="noopener noreferrer">Open in Outlook ↗</a>}</div>)}</div></section></>;
}
