import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();const U=n=>'40000000-0000-4000-8000-'+String(n).padStart(12,'0');
const org=U(1),foreign=U(2),owner=U(3),otherOwner=U(4),site=U(5),foreignSite=U(6),oldPerson=U(7),unnamed=U(8);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create table organizations(id uuid primary key,owner_id uuid references auth.users(id));
create table organization_sites(id uuid primary key,organization_id uuid,site_name text,site_reference text,status text);
create table organization_people(id uuid primary key default gen_random_uuid(),organization_id uuid,user_id uuid,first_name text not null default '',last_name text not null default '',email text,site text,account_type text,account_status text,created_by uuid,created_at timestamptz default now(),updated_at timestamptz default now());
create unique index org_person_email on organization_people(organization_id,lower(email));
create table organization_access_events(organization_id uuid,person_id uuid,actor_id uuid,event_type text,event_summary text);
create table organization_person_permissions(person_id uuid,module_key text,access_level text);
grant insert on organizations to authenticated;`);
await db.query("insert into auth.users values($1,'owner@example.test',now(),'{\"first_name\":\"Raf\",\"last_name\":\"Perry\"}'),($2,'other@example.test',now(),'{}'),($3,'unnamed@example.test',now(),'{}')",[owner,otherOwner,unnamed]);
await db.query('insert into organizations values($1,$2),($3,$4)',[org,owner,foreign,otherOwner]);
await db.query("insert into organization_sites values($1,$2,'Workshop','SITE-001','active'),($3,$4,'Foreign','SITE-001','active')",[site,org,foreignSite,foreign]);
await db.query("insert into organization_people(id,organization_id,first_name,last_name,email,site,account_type,account_status)values($1,$2,'Existing','Owner','OWNER@example.test','Workshop','directory','directory')",[oldPerson,org]);
await db.query("insert into organization_person_permissions values($1,'reports','view')",[oldPerson]);
const sql=fs.readFileSync(new URL('../supabase/migrations/20261110_company_owner_people_sites.sql',import.meta.url),'utf8');
await db.exec(sql);
let p=(await db.query('select * from organization_people where id=$1',[oldPerson])).rows[0];
assert.equal(p.user_id,owner);assert.equal(p.account_status,'active');assert.equal(p.first_name,'Existing');assert.equal(p.site_id,site);assert.equal(p.site_legacy_text,'Workshop');assert.equal(p.site,'SITE-001 · Workshop');
assert.equal((await db.query('select count(*)::int n from organization_person_permissions')).rows[0].n,1);
const other=(await db.query('select * from organization_people where organization_id=$1',[foreign])).rows[0];assert.equal(other.user_id,otherOwner);assert.equal(other.first_name,'');assert.equal(other.last_name,'');assert.equal(other.site_id,null);
await db.exec(sql);assert.equal((await db.query('select count(*)::int n from organization_people')).rows[0].n,2);
assert.equal((await db.query('select count(*)::int n from organization_access_events')).rows[0].n,2);
console.log('PASS existing owner linked by verified email, identity/permissions retained, unnamed owner supported, legacy site snapshot preserved and safe reapplication');
await db.exec('set role authenticated');
await assert.rejects(db.query('select ensure_company_owner_person($1)',[foreign]),/permission denied/);
await db.query('insert into organizations values($1,$2)',[U(9),unnamed]);await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from organization_people where organization_id=$1 and user_id=$2',[U(9),unnamed])).rows[0].n,1);
await db.query('insert into organizations values($1,$2)',[U(110),owner]);
const sameOwnerPerson=(await db.query('select * from organization_people where organization_id=$1',[U(110)])).rows[0];
assert.notEqual(sameOwnerPerson.id,oldPerson);assert.equal(sameOwnerPerson.user_id,owner);assert.equal(sameOwnerPerson.site_id,null);
console.log('PASS new-company insert automatically links owner, same-owner companies keep distinct people, browser cannot call bootstrap RPC');
await assert.rejects(db.query('update organization_people set site_id=$1 where id=$2',[foreignSite,oldPerson]),/same company/);
await db.query("update organization_sites set status='inactive' where id=$1",[site]);
await db.query("update organization_people set first_name='Retained' where id=$1",[oldPerson]);
await db.query("insert into organization_sites values($1,$2,'Inactive','SITE-002','inactive')",[U(10),org]);
await assert.rejects(db.query('update organization_people set site_id=$1 where id=$2',[U(10),oldPerson]),/active company location/);
await assert.rejects(db.query('update organization_people set organization_id=$1 where id=$2',[foreign,oldPerson]),/same company/);
await db.query('delete from organization_sites where id=$1',[site]);
p=(await db.query('select * from organization_people where id=$1',[oldPerson])).rows[0];assert.equal(p.site_id,null);assert.equal(p.site,'SITE-001 · Workshop');assert.equal(p.site_legacy_text,'Workshop');
console.log('PASS cross-company assignment and reparenting denied, inactive assignments blocked, historical text survives site deletion');
// Backfill must never reactivate a suspended row or claim one linked to another user.
for (const [n,status,linked] of [[11,'suspended',null],[12,'active',otherOwner]]){
 const person=U(n+20),newOwner=U(n+40),company=U(n+60);
 await db.query('insert into auth.users values($1,$2,now(),$3)',[newOwner,'owner'+n+'@example.test',{}]);
 await db.exec('alter table organizations disable trigger bootstrap_company_owner_person');
 await db.query('insert into organizations values($1,$2)',[company,newOwner]);
 await db.query("insert into organization_people(id,organization_id,user_id,first_name,last_name,email,account_type,account_status)values($1,$2,$3,'Protected','Row',$4,'system',$5)",[person,company,linked,'owner'+n+'@example.test',status]);
 await db.exec('alter table organizations enable trigger bootstrap_company_owner_person');
 assert.equal((await db.query('select ensure_company_owner_person($1) id',[company])).rows[0].id,null);
 const row=(await db.query('select * from organization_people where id=$1',[person])).rows[0];assert.equal(row.user_id,linked);assert.equal(row.account_status,status);
}
// A verified owner may activate an already-linked invitation, but never a suspension.
for (const [n,status] of [[120,'invited'],[121,'suspended']]) {
 const actor=U(n+10),company=U(n+20),person=U(n+30);
 await db.query('insert into auth.users values($1,$2,now(),$3)',[actor,'linked'+n+'@example.test',{}]);
 await db.exec('alter table organizations disable trigger bootstrap_company_owner_person');
 await db.query('insert into organizations values($1,$2)',[company,actor]);
 await db.query("insert into organization_people(id,organization_id,user_id,first_name,last_name,email,account_type,account_status)values($1,$2,$3,'Linked','Owner',$4,'system',$5)",[person,company,actor,'linked'+n+'@example.test',status]);
 await db.exec('alter table organizations enable trigger bootstrap_company_owner_person');
 await db.query('select ensure_company_owner_person($1)',[company]);
 const row=(await db.query('select * from organization_people where id=$1',[person])).rows[0];assert.equal(row.account_status,status==='invited'?'active':'suspended');
}
console.log('PASS existing linked invitation is activated for a verified owner, linked suspension remains suspended');
// Ambiguous and unmatched legacy site text stays intact and unlinked.
await db.query("insert into organization_sites values($1,$2,'Shared','S-3','active'),($3,$2,'Shared','S-4','active')",[U(100),org,U(101)]);
for(const [n,text] of [[102,'Shared'],[103,'Unmatched address']])await db.query("insert into organization_people(id,organization_id,first_name,last_name,email,site,account_type,account_status) values($1,$2,'Legacy','Person',$3,$4,'directory','directory')",[U(n),org,'legacy'+n+'@example.test',text]);
await db.exec(sql);
for(const [n,text] of [[102,'Shared'],[103,'Unmatched address']]){const row=(await db.query('select site,site_id,site_legacy_text from organization_people where id=$1',[U(n)])).rows[0];assert.equal(row.site,text);assert.equal(row.site_id,null);assert.equal(row.site_legacy_text,text);}
console.log('PASS suspended and conflicting records preserved, ambiguous/unmatched legacy sites require review');
await db.close();
