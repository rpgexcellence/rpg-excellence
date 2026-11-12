import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {soaTasks} from '../lib/soa-workflow.mjs';
const db=new PGlite(),u=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const org=u(1),foreign=u(2),owner=u(3),other=u(4),person=u(5),reviewer=u(6),reviewUser=u(7),assessment=u(8),register=u(9),risk=u(10),foreignRisk=u(11),foreignPerson=u(12);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
create table auth.users(id uuid primary key);create table organizations(id uuid primary key,owner_id uuid);create table organization_people(id uuid primary key,organization_id uuid,user_id uuid,account_status text);
create table organization_person_permissions(person_id uuid,organization_id uuid,module_key text,access_level text);
create table organization_person_authorizations(person_id uuid,organization_id uuid,function_key text,status text,expires_at date);
create table assessments(id uuid primary key,organization_id uuid,owner_id uuid,standard text);
create table assessment_soa_registers(id uuid primary key,assessment_id uuid,owner_id uuid);
create table iso27001_control_catalog(control_id text primary key,active boolean);
create table isms_risks(id uuid primary key,organization_id uuid,owner_id uuid,status text);
create table isms_risk_controls(id uuid primary key default gen_random_uuid(),risk_id uuid,assessment_id uuid,control_id text,organization_id uuid,owner_id uuid,treatment_purpose text,design_status text,operating_effectiveness text,evidence_reference text,review_due_date date,unique(risk_id,assessment_id,control_id));
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table assessment_soa_entries(id uuid primary key default gen_random_uuid(),soa_register_id uuid,assessment_id uuid,owner_id uuid,control_id text,applicability text,applicability_justification text,inclusion_source text[],implementation_status text,control_description text,control_owner text,implementation_evidence text,effectiveness_evidence text,residual_risk text,residual_risk_level text,residual_likelihood integer,residual_impact integer,residual_risk_score integer,residual_risk_rationale text,risk_owner text,treatment_decision text,risk_acceptance_authority text,risk_accepted_at date,risk_review_due_at date,action_required text,target_date date,assessor_conclusion text,finding_reference text,last_reviewed_at timestamptz,updated_at timestamptz default now(),unique(assessment_id,control_id));`);
await db.query('insert into auth.users values($1),($2),($3)',[owner,other,reviewUser]);
await db.query('insert into organizations values($1,$2),($3,$4)',[org,owner,foreign,other]);
await db.query("insert into organization_people values($1,$2,$3,'active'),($4,$2,$5,'active'),($6,$7,$8,'active')",[person,org,owner,reviewer,reviewUser,foreignPerson,foreign,other]);
await db.query("insert into organization_person_permissions values($1,$2,'information_security','approve')",[reviewer,org]);
await db.query("insert into assessments values($1,$2,$3,'ISO/IEC 27001:2022')",[assessment,org,owner]);
await db.query('insert into assessment_soa_registers values($1,$2,$3)',[register,assessment,owner]);
await db.exec("insert into iso27001_control_catalog values('5.1',true)");
await db.query("insert into isms_risks values($1,$2,$3,'draft'),($4,$5,$6,'draft')",[risk,org,owner,foreignRisk,foreign,other]);
const migration=fs.readFileSync(new URL('../supabase/migrations/20261112_soa_owners_evidence_tasks.sql',import.meta.url),'utf8');await db.exec(migration);
// Idempotent schema/grant update.
await db.exec(migration);
let values={soa_register_id:register,applicability:'applicable',implementation_status:'planned',control_owner_person_id:person,risk_owner_person_id:person,action_required:'Implement policy',action_owner_person_id:person,action_verifier_person_id:reviewer,action_status:'planned',target_date:'2026-12-01'};
async function save(actor=owner,changes={},ids=[risk],files=[]){const current=(await db.query("select updated_at from assessment_soa_entries where assessment_id=$1 and control_id='5.1'",[assessment])).rows[0];return (await db.query('select save_soa_control_workflow($1,$2,$3,$4,$5::jsonb,$6::uuid[],$7::jsonb) result',[assessment,actor,'5.1',current?.updated_at||null,JSON.stringify({...values,...changes}),ids,JSON.stringify(files)])).rows[0].result;}
let result=await save();assert.equal(result.action_owner_person_id,person);assert.equal((await db.query('select * from isms_risk_controls')).rows.length,1);
// Project persisted action states through the same task adapter used by both dashboards.
async function savedTask() {
 const entries=(await db.query('select * from assessment_soa_entries where assessment_id=$1',[assessment])).rows;
 return soaTasks(entries)[0];
}
assert.equal((await savedTask()).status,'planned');
await save(owner,{action_status:'in_progress'});
assert.equal((await savedTask()).status,'in_progress');
assert.equal((await savedTask()).assignee,person);
assert.match((await savedTask()).href,/control=5.1#soa-5_1$/);
await assert.rejects(()=>save(owner,{control_owner_person_id:foreignPerson}));
await assert.rejects(()=>save(owner,{},[foreignRisk]));
await assert.rejects(()=>save(other));
await assert.rejects(()=>save(owner,{action_status:'verified',action_completion_evidence:'evidence',action_verification_conclusion:'pass'}));
await assert.rejects(()=>save(owner,{action_status:'awaiting_verification',action_verifier_person_id:person,action_completion_evidence:'evidence'}));
await save(owner,{action_status:'awaiting_verification',action_completion_evidence:'evidence'});
assert.equal((await savedTask()).status,'awaiting_verification');
assert.equal((await savedTask()).assignee,reviewer);
await assert.rejects(()=>save(owner,{action_status:'verified',action_completion_evidence:'evidence',action_verification_conclusion:'pass'}));
await save(reviewUser,{action_status:'verified',action_completion_evidence:'evidence',action_verification_conclusion:'Reviewed evidence and confirmed completion'});
assert.equal((await db.query('select action_verified_by from assessment_soa_entries')).rows[0].action_verified_by,reviewUser);
assert.equal((await savedTask()).status,'verified');
const file={evidence_kind:'implementation',storage_path:`${org}/${assessment}/5_1/test.pdf`,file_name:'test.pdf',mime_type:'application/pdf',size_bytes:200};
await save(owner,{action_status:'in_progress'},[risk],[file]);assert.equal((await db.query('select count(*)::int n from soa_control_evidence')).rows[0].n,1);
await assert.rejects(()=>save(owner,{action_status:'in_progress'},[],[{...file,storage_path:`${foreign}/${assessment}/5_1/foreign.pdf`}]));
assert.equal((await db.query('select count(*)::int n from isms_risk_controls')).rows[0].n,1,'failed evidence metadata must roll back risk unlinking');
await save(owner,{action_status:'in_progress'},[]);assert.equal((await db.query('select count(*)::int n from isms_risk_controls')).rows[0].n,0);
await assert.rejects(()=>db.query('select save_soa_control_workflow($1,$2,$3,$4,$5::jsonb,$6::uuid[],$7::jsonb)',[assessment,owner,'5.1','2000-01-01',JSON.stringify(values),[],JSON.stringify([])]));
// Risk edits retain links in other SoA workspaces and invalid replacements roll back.
await save(owner,{action_status:'in_progress'},[risk]);
// Saving the selected workspace with its existing control preserves that exact link.
const savedLinks=(await db.query('select control_id,treatment_purpose,design_status,operating_effectiveness,evidence_reference,review_due_date from isms_risk_controls where risk_id=$1 and assessment_id=$2',[risk,assessment])).rows;
await db.query('select replace_isms_soa_links($1,$2,$3,$4::jsonb)',[risk,owner,assessment,JSON.stringify(savedLinks)]);
assert.equal((await db.query('select count(*)::int n from isms_risk_controls where risk_id=$1 and assessment_id=$2 and control_id=$3',[risk,assessment,'5.1'])).rows[0].n,1);
await db.query('select replace_isms_soa_links($1,$2,$3,$4::jsonb)',[risk,owner,null,JSON.stringify([{control_id:'5.1'}])]);
assert.equal((await db.query('select count(*)::int n from isms_risk_controls where assessment_id=$1',[assessment])).rows[0].n,1);
await assert.rejects(()=>db.query('select replace_isms_soa_links($1,$2,$3,$4::jsonb)',[risk,other,assessment,'[]']));
await assert.rejects(()=>db.query('select replace_isms_soa_links($1,$2,$3,$4::jsonb)',[risk,owner,assessment,JSON.stringify([{control_id:'9.99'}])]));
assert.equal((await db.query('select count(*)::int n from isms_risk_controls where assessment_id=$1',[assessment])).rows[0].n,1);
assert.equal((await db.query("select public from storage.buckets where id='soa-control-evidence'")).rows[0].public,false);
assert.equal((await db.query("select has_table_privilege('authenticated','soa_control_evidence','select') ok")).rows[0].ok,false);
assert.equal((await db.query("select has_function_privilege('authenticated','save_soa_control_workflow(uuid,uuid,text,timestamptz,jsonb,uuid[],jsonb)','execute') ok")).rows[0].ok,false);
assert.ok((await db.query('select count(*)::int n from soa_workflow_events')).rows[0].n>=5);
console.log('PASS SoA workflow: company-bound owners/risks/evidence, independent verification, atomic rollback, stale-update rejection, private bucket, server-only grants and durable audit history');
await db.close();
