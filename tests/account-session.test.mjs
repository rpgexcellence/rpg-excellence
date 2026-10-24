import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT_LOADING,accountIdentity,createAccountSessionStore} from '../lib/account-session.mjs';
const a={id:'a',email:'rafal@example.test',user_metadata:{full_name:'Rafal Example'}},b={id:'b',email:'igor@example.test',user_metadata:{full_name:'Igor Example'}};
const next=()=>new Promise(resolve=>setTimeout(resolve,5));
function fixture(){
  let callback,requests=[],listenerCount=0,unsubscribed=0,scope;
  const auth={onAuthStateChange(fn){callback=fn;listenerCount++;return {data:{subscription:{unsubscribe(){unsubscribed++;}}}};},getUser(){return new Promise(resolve=>requests.push(resolve));},async signOut(options){scope=options.scope;callback('SIGNED_OUT',null);return {error:null};}};
  const store=createAccountSessionStore(auth);
  return {store,requests,event:(...args)=>callback(...args),counts:()=>({listenerCount,unsubscribed,scope})};
}
test('identity contains only display fields and handles metadata without inferring permissions',()=>{
  assert.deepEqual(accountIdentity(a),{id:'a',email:'rafal@example.test',name:'Rafal Example'});
  assert.deepEqual(accountIdentity({id:'x',email:'person@example.test',app_metadata:{admin:true}}),{id:'x',email:'person@example.test',name:''});
  assert.equal(accountIdentity(null),null);
});
test('header and portal share one auth listener and verified identity',async()=>{
  const f=fixture(),off1=f.store.subscribe(()=>{}),off2=f.store.subscribe(()=>{});
  assert.equal(f.counts().listenerCount,1);assert.equal(f.store.getServerSnapshot(),ACCOUNT_LOADING);
  await next();f.requests.shift()({data:{user:a},error:null});await next();
  assert.equal(f.store.getSnapshot().identity.email,a.email);
  off1();assert.equal(f.counts().unsubscribed,0);off2();assert.equal(f.counts().unsubscribed,1);
});
test('account changes clear the old identity before verification and late replies cannot restore it',async()=>{
  const f=fixture(),off=f.store.subscribe(()=>{});await next();const old=f.requests.shift();
  f.event('SIGNED_IN',{user:b});assert.equal(f.store.getSnapshot().identity,null);assert.equal(f.store.getSnapshot().pendingUserId,'b');
  await next();const current=f.requests.shift();current({data:{user:b},error:null});await next();old({data:{user:a},error:null});await next();
  assert.equal(f.store.getSnapshot().identity.id,'b');
  f.event('SIGNED_OUT',null);assert.equal(f.store.getSnapshot().status,'signed_out');off();
});
test('sign-out uses the current browser session and invalidates pending identity requests',async()=>{
  const f=fixture(),off=f.store.subscribe(()=>{});await next();const pending=f.requests.shift();
  await f.store.signOut();pending({data:{user:a},error:null});await next();
  assert.equal(f.counts().scope,'local');assert.equal(f.store.getSnapshot().status,'signed_out');off();
});
test('an unavailable identity check does not pretend the user is signed out',async()=>{
  const f=fixture(),off=f.store.subscribe(()=>{});await next();f.requests.shift()({data:{user:null},error:{name:'NetworkError'}});await next();assert.equal(f.store.getSnapshot().status,'unavailable');
  f.store.refresh();await next();f.requests.shift()({data:{user:null},error:{name:'AuthSessionMissingError'}});await next();assert.equal(f.store.getSnapshot().status,'signed_out');off();
});
