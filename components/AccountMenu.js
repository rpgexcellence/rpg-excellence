"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createClient} from '../lib/supabase/client';
import {ACCOUNT_LOADING,createAccountSessionStore} from '../lib/account-session.mjs';

let store;
function accountStore(){return store ||= createAccountSessionStore(createClient().auth);}
const subscribe=listener=>accountStore().subscribe(listener);
const getSnapshot=()=>store?.getSnapshot() || ACCOUNT_LOADING;
const getServerSnapshot=()=>ACCOUNT_LOADING;
export function useAccountSession(){
  const session=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')accountStore().refresh();};
    window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return session;
}

const css=`
.rpgAccount{position:relative;flex-shrink:0;font-family:Arial,sans-serif;color:#12385f;text-align:left}
.rpgAccount *{box-sizing:border-box}.rpgAccount summary{list-style:none;cursor:pointer}.rpgAccount summary::-webkit-details-marker{display:none}
.rpgAccountTrigger{display:flex;align-items:center;gap:9px;min-height:44px;max-width:260px;padding:7px 11px;border:1px solid #c4d4e5;border-radius:10px;background:#fff;color:#12385f;font-size:12px;font-weight:800;text-decoration:none}
.rpgAccountAvatar{display:grid;place-items:center;width:30px;height:30px;flex-shrink:0;border-radius:50%;background:#e6f1ff;color:#1757ce;font-size:12px;font-weight:900}
.rpgAccountText{display:grid;gap:3px;min-width:0}.rpgAccountText strong,.rpgAccountText small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rpgAccountText strong{font-size:12px}.rpgAccountText small{font-size:10px;font-weight:600;color:#60778f}
.rpgAccountArrow{margin-left:auto;padding-left:5px}.rpgAccount.dark{color:#fff}.rpgAccount.dark .rpgAccountTrigger{background:#0d3157;border-color:#6b88a6;color:#fff}.rpgAccount.dark .rpgAccountText small{color:#d8e6f5}
.rpgAccountDrop{position:absolute;z-index:600;right:0;top:calc(100% + 8px);width:min(320px,calc(100vw - 28px));padding:12px;border:1px solid #c9d9e6;border-radius:13px;background:#fff;color:#12385f;box-shadow:0 18px 50px #07203e35;font-size:13px}
.rpgAccountIdentity{display:grid;gap:6px;padding:7px 9px 13px;margin-bottom:5px;border-bottom:1px solid #dbe6ee;overflow-wrap:anywhere}.rpgAccountIdentity small{font-size:10px;color:#60778f;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.rpgAccountIdentity strong{font-size:14px}.rpgAccountIdentity span{color:#41617d;font-size:12px;line-height:1.5}
.rpgAccountDrop a,.rpgAccountDrop button{display:block;width:100%;min-height:42px;padding:11px 10px;border:0;border-radius:8px;background:transparent;color:#163d65!important;font:800 13px Arial,sans-serif;text-align:left;text-decoration:none;cursor:pointer}
.rpgAccountDrop a:hover,.rpgAccountDrop button:hover{background:#edf4ff}.rpgAccountDrop .rpgAccountExit{color:#a02d31!important}.rpgAccountDrop button:disabled{opacity:.6;cursor:wait}
.rpgAccount a:focus-visible,.rpgAccount summary:focus-visible,.rpgAccount button:focus-visible{outline:3px solid #32c7d2;outline-offset:3px}
.rpgAccountError{margin:6px 0;padding:10px;border-radius:8px;background:#fff1ee;color:#9d2822;font-size:12px;line-height:1.4}
.rpgPortalIdentityBar{position:sticky;top:0;z-index:145;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px clamp(18px,3vw,48px);border-bottom:1px solid #d3e0ec;background:#fdfefe;color:#12385f;box-shadow:0 3px 12px #07203e08}
.rpgPortalIdentityBar>a{color:#234d76;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}.rpgPortalIdentityBar>a:focus-visible{outline:3px solid #32c7d2;outline-offset:3px}
.rpgAccountChange{padding:30px;background:#eef5fc;color:#12385f;font:14px Arial,sans-serif}.rpgAccountChange a{display:inline-block;margin-top:12px;padding:10px;background:#1761e8;border-radius:8px;color:#fff}
@media(max-width:1600px){.header .rpgAccountTrigger{max-width:220px}}
@media(max-width:1100px){.rpgPortalIdentityBar{top:68px}}
@media(max-width:600px){.header .rpgAccountTrigger{max-width:165px;padding:6px 8px;gap:6px}.header .rpgAccountAvatar{display:none}.header .rpgAccountDrop{position:fixed;top:82px;left:12px;right:12px;width:auto}.header.homeHeader .rpgAccountDrop{top:72px}.rpgPortalIdentityBar{padding:8px 12px;gap:8px}.rpgPortalIdentityBar .rpgAccountTrigger{max-width:230px}}
@media(max-width:380px){.header .rpgAccountTrigger{max-width:135px}.rpgPortalIdentityBar .rpgAccountTrigger{max-width:205px}.rpgPortalIdentityBar>a{max-width:72px;white-space:normal;font-size:11px;line-height:1.4}}
@media print{.rpgAccount,.rpgPortalIdentityBar{display:none!important}}
`;

export default function AccountMenu({tone='light',roleLabel=''}) {
  const session=useAccountSession(),menu=useRef(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const close=event=>{if(menu.current&&!menu.current.contains(event.target))menu.current.open=false;};
    const escape=event=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
  },[]);
  async function leave(switching) {
    setBusy(true);setError('');
    try{await accountStore().signOut();window.location.assign(switching?'/portal/login?next=%2Fportal':'/portal/login');}
    catch{setError('Sign-out could not be completed. Please retry.');setBusy(false);}
  }
  const wrapper='rpgAccount '+(tone==='dark'?'dark':'');
  if(session.status!=='signed_in')return <div className={wrapper}><style>{css}</style>
    <a className="rpgAccountTrigger" href={session.status==='signed_out'?'/portal/login':'/portal'}>
      {session.status==='signed_out'?'Sign in':session.status==='unavailable'?'Check account':'Checking account…'}
    </a>
  </div>;
  const {identity}=session,display=identity.name || identity.email || 'My account';
  const initials=(identity.name || identity.email).split(/[\s.@_-]+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase() || 'ME';
  return <div className={wrapper}><style>{css}</style><details ref={menu}>
    <summary className="rpgAccountTrigger" aria-label={'Account: '+(identity.email || display)}>
      <span className="rpgAccountAvatar" aria-hidden="true">{initials}</span><span className="rpgAccountText"><strong>{identity.name || 'Signed in'}</strong><small>{identity.email || 'My account'}</small></span><span className="rpgAccountArrow" aria-hidden="true">⌄</span>
    </summary>
    <div className="rpgAccountDrop"><div className="rpgAccountIdentity"><small>Signed in as</small>{identity.name?<strong>{identity.name}</strong>:null}<span>{identity.email || 'Authenticated account'}</span>{roleLabel?<span>{roleLabel}</span>:null}</div>
      <a href="/portal">My platform →</a><a href="/portal/tasks">My tasks &amp; approvals</a>
      <button type="button" disabled={busy} onClick={()=>leave(true)}>Switch account</button>
      <button type="button" className="rpgAccountExit" disabled={busy} onClick={()=>leave(false)}>{busy?'Signing out…':'Sign out'}</button>
      {error?<p className="rpgAccountError" role="alert">{error}</p>:null}
    </div>
  </details></div>;
}

export function PortalAccountBar({roleLabel=''}) {
  return <div className="rpgPortalIdentityBar"><a href="/en">← Public website</a><AccountMenu roleLabel={roleLabel}/></div>;
}
