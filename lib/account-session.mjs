// Display-only identity. All permissions remain enforced by existing server code.
export const ACCOUNT_LOADING = Object.freeze({status:'loading',identity:null});

export function accountIdentity(user) {
  if (!user?.id) return null;
  const metadata=user.user_metadata || {};
  const name=[metadata.full_name,metadata.display_name,metadata.name,
    [metadata.first_name,metadata.last_name].filter(Boolean).join(' ')]
    .find(value=>typeof value==='string'&&value.trim());
  return {id:user.id,email:String(user.email || ''),name:name?.trim() || ''};
}

/** One shared listener per browser. Auth events schedule verification outside
 * Supabase's auth callback lock. Late requests cannot restore an old identity.
 * No token, password or user identity is written to application localStorage.
 */
export function createAccountSessionStore(auth,{defer=fn=>setTimeout(fn,0),cancel=clearTimeout}={}) {
  let value=ACCOUNT_LOADING,live=false,version=0,timer=null,subscription=null;
  const listeners=new Set();
  const publish=next=>{value=next;for(const listener of listeners)listener();};
  async function verify() {
    const ticket=++version;
    try {
      const {data,error}=await auth.getUser();
      if(!live||ticket!==version)return;
      const identity=accountIdentity(data?.user);
      if(error) {
        const missing=error.name==='AuthSessionMissingError'||[401,403].includes(error.status);
        publish({status:missing?'signed_out':'unavailable',identity:null});
      } else publish({status:identity?'signed_in':'signed_out',identity});
    } catch {
      if(live&&ticket===version)publish({status:'unavailable',identity:null});
    }
  }
  function refresh() {
    if(!live)return;
    if(timer!==null)cancel(timer);
    timer=defer(()=>{timer=null;void verify();});
  }
  function start() {
    live=true;value=ACCOUNT_LOADING;
    subscription=auth.onAuthStateChange((event,session)=>{
      ++version;
      if(event==='SIGNED_OUT') {
        if(timer!==null){cancel(timer);timer=null;}
        publish({status:'signed_out',identity:null});
      } else {
        // Do not display an account from an unverified cached session.
        if(session?.user?.id!==value.identity?.id)publish({...ACCOUNT_LOADING,pendingUserId:session?.user?.id || null});
        refresh();
      }
    }).data.subscription;
    refresh();
  }
  return {
    subscribe(listener) {
      listeners.add(listener);
      if(!live)start();
      return ()=>{
        listeners.delete(listener);
        if(!listeners.size){live=false;++version;subscription?.unsubscribe();subscription=null;if(timer!==null)cancel(timer);timer=null;}
      };
    },
    getSnapshot:()=>value,
    getServerSnapshot:()=>ACCOUNT_LOADING,
    refresh,
    async signOut() {
      const result=await auth.signOut({scope:'local'});
      if(result.error)throw result.error;
      ++version;
      if(live)publish({status:'signed_out',identity:null});
    },
  };
}
