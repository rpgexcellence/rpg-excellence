import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const U=i=>'10000000-0000-4000-8000-'+String(i).padStart(12,'0');
const owner=U(1),org=U(2),other=U(3),client=U(4),second=U(5),audit=U(6),foreignAudit=U(7),linked=U(8),manual=U(9);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create table organizations(id uuid primary key,owner_id uuid);
create function is_organization_people_admin(uuid) returns boolean language sql as $$select false$$;
create table internal_audits(id uuid primary key,owner_id uuid,organization_id uuid);
create table internal_audit_findings(id uuid primary key,owner_id uuid,audit_id uuid,created_at timestamptz default now());
create table rca_cases(id uuid primary key,organization_id uuid);create table isms_security_incidents(id uuid primary key,organization_id uuid);`);
await db.query('insert into auth.users values($1)',[owner]);
await db.query('insert into organizations values($1,$2),($3,$2)',[org,owner,other]);
await db.query('insert into internal_audits values($1,$2,$3),($4,$2,$5)',[audit,owner,org,foreignAudit,other]);
await db.query('insert into internal_audit_findings(id,owner_id,audit_id)values($1,$2,$3),($4,$2,null)',[linked,owner,audit,manual]);
await db.exec(fs.readFileSync(new URL('../supabase/migrations/20261013_enterprise_integration_foundation_v1.sql',import.meta.url),'utf8'));
const migration=fs.readFileSync(new URL('../supabase/migrations/20261022_integration_api_stabilisation.sql',import.meta.url),'utf8');
await db.exec(migration);
assert.equal((await db.query('select organization_id from internal_audit_findings where id=$1',[linked])).rows[0].organization_id,org);
assert.equal((await db.query('select organization_id from internal_audit_findings where id=$1',[manual])).rows[0].organization_id,null);
assert.equal((await db.query('select count(*)::int n from integration_finding_export')).rows[0].n,1);
await assert.rejects(db.query('update internal_audit_findings set organization_id=$1 where id=$2',[other,linked]),/parent audit/);
await db.query('insert into internal_audit_findings(id,owner_id,audit_id)values($1,$2,$3)',[U(20),owner,foreignAudit]);
assert.equal((await db.query('select count(*)::int n from integration_finding_export where organization_id=$1',[org])).rows[0].n,1);
console.log('PASS explicit parent mapping and same-owner multi-organisation isolation; ambiguous standalone records stay unassigned');
for(const [id,prefix] of [[client,'one'],[second,'two']]) await db.query("insert into integration_api_clients(id,owner_id,organization_id,client_name,environment,key_prefix,secret_hash,permissions,created_by,requests_per_minute)values($1,$2,$3,'BI client','live',$4,$4,$5,$2,3)",[id,owner,org,prefix,['workplace_inspections:read','security_incidents:read','security_incidents:detail','audits:write']]);
await db.query('insert into integration_api_limits values($1,5)',[org]);
const reserve=id=>db.query('select reserve_integration_request($1,$2) r',[id,org]).then(r=>r.rows[0].r);
assert.equal((await reserve(client)).allowed,true);assert.equal((await reserve(client)).allowed,true);assert.equal((await reserve(client)).allowed,true);
let budget=await reserve(client);assert.equal(budget.allowed,false);assert.equal(budget.client_remaining,0);assert.ok(budget.retry_after>=1&&budget.retry_after<=60);
assert.equal((await reserve(second)).allowed,true);assert.equal((await reserve(second)).allowed,true);assert.equal((await reserve(second)).allowed,false);
assert.equal((await db.query("select request_count from integration_request_buckets where organization_id=$1 and bucket_key='organisation'",[org])).rows[0].request_count,5);
await assert.rejects(db.query('select reserve_integration_request($1,$2)',[client,other]),/Active organisation-bound/);
console.log('PASS transactional client and organisation budgets, Retry-After boundaries and cross-tenant refusal');
await db.query("update integration_api_clients set revoked_at=now(),active=false where id=$1",[client]);await assert.rejects(reserve(client),/Active/);
await db.exec('set role authenticated');
for(const table of ['integration_api_limits','integration_request_buckets','integration_finding_export'])await assert.rejects(db.query('select * from '+table),/permission denied/);
await assert.rejects(reserve(second),/permission denied/);await db.exec('reset role');
await db.exec(migration);
assert.equal((await db.query('select count(*)::int n from integration_api_clients')).rows[0].n,2);
console.log('PASS revoked credentials, service-only grants, preserved legacy key metadata and safe reapplication');
await db.close();


// Phase 2: exercise the installed SQL in an additional, isolated database.
// This fixture tests export semantics, not production schema discovery. The live
// migration separately verifies that its allow-listed source columns exist.
const exportSql=fs.readFileSync(new URL('../supabase/migrations/20261103_integration_export_foundation.sql',import.meta.url),'utf8');
const registryMatch=exportSql.match(/jsonb_to_recordset\('(\[.*?\])'::jsonb\)/s);
assert.ok(registryMatch,'Export migration has an explicit allow-listed source registry');
const exportSpecs=JSON.parse(registryMatch[1]);
assert.deepEqual(exportSpecs.map(spec=>spec.resource).sort(),['assets','audits','capa-8d','findings','inspection-programmes','people','security-incidents','suppliers','workplace-inspections']);
const exportDb=new PGlite();
const X=i=>'20000000-0000-4000-8000-'+String(i).padStart(12,'0');
const xOwner=X(1),xOrg=X(2),xForeign=X(3),xClient=X(4),xReplacement=X(5),xForeignClient=X(6);
try {
 await exportDb.exec(`create role anon;create role authenticated;create role service_role;
 create table organizations(id uuid primary key,owner_id uuid);
 create table integration_api_clients(id uuid primary key,owner_id uuid,organization_id uuid,permissions text[],active boolean default true,revoked_at timestamptz,environment text default 'live',expires_at timestamptz);
 create table integration_events(id uuid);
 create function reserve_integration_request(uuid,uuid)returns jsonb language sql as $$select '{}'::jsonb$$;`);
 for(const spec of exportSpecs){
  assert.match(spec.source_table,/^[a-z_]+$/);
  const fields=[...new Set([...spec.fields,'organization_id',...(spec.owner_required?['owner_id']:[]),'private_secret'])];
  const definitions=fields.map(field=>{assert.match(field,/^[a-z_]+$/);return field+' '+(field==='id'?'uuid primary key':['organization_id','owner_id','audit_id'].includes(field)?'uuid':'text')});
  await exportDb.exec('create table '+spec.source_table+'('+definitions.join(',')+')');
 }
 await exportDb.query('insert into organizations values($1,$2),($3,$2)',[xOrg,xOwner,xForeign]);
 for(const [id,organizationId]of [[xClient,xOrg],[xReplacement,xOrg],[xForeignClient,xForeign]])await exportDb.query('insert into integration_api_clients(id,owner_id,organization_id,permissions)values($1,$2,$3,$4)',[id,xOwner,organizationId,exportSpecs.map(spec=>spec.permission)]);
 for(const [id,title,organizationId]of [[X(10),'First',xOrg],[X(11),'Second',xOrg],[X(12),'Third',xOrg],[X(20),'FOREIGN',xForeign]])await exportDb.query('insert into internal_audits(id,organization_id,owner_id,title,private_secret)values($1,$2,$3,$4,$5)',[id,organizationId,xOwner,title,'PRIVATE FIELD']);
 await exportDb.query('insert into internal_audit_findings(id,owner_id,finding_type)values($1,$2,$3)',[X(21),xOwner,'major_nc']);
 await exportDb.query('insert into internal_audit_findings(id,organization_id,owner_id,finding_type)values($1,$2,$3,$4)',[X(22),xOrg,xOwner,'observation']);
 await exportDb.exec(exportSql);
 const journalCount=async()=>Number((await exportDb.query('select count(*) n from integration_export_changes')).rows[0].n);
 assert.equal(await journalCount(),4);await exportDb.exec(exportSql);assert.equal(await journalCount(),4,'Reapplication does not duplicate baseline history');
 const excluded=(await exportDb.query("select excluded_existing_records from integration_export_sources where resource='findings'")).rows[0].excluded_existing_records;
 assert.equal(Number(excluded),2,'Unassigned and advisory findings do not enter NC exports');
 const readPage=async(resource='audits',cursor=null,size=null,key=xClient)=>(await exportDb.query('select read_integration_export_page($1,$2,$3,$4) r',[key,resource,cursor,size])).rows[0].r;
 const first=await readPage('audits',null,1);assert.equal(first.mode,'snapshot');assert.equal(first.data.length,1);assert(first.next_cursor);assert(!first.checkpoint);assert.equal(first.data[0].record.title,'First');assert(!('private_secret' in first.data[0].record));assert.equal(typeof first.data[0].change_id,'string');
 await exportDb.query('update internal_audits set title=$1 where id=$2',['Changed after snapshot',X(11)]);
 await exportDb.query('delete from internal_audits where id=$1',[X(12)]);
 await exportDb.query('insert into internal_audits(id,organization_id,owner_id,title)values($1,$2,$3,$4)',[X(13),xOrg,xOwner,'Inserted after snapshot']);
 const secondPage=await readPage('audits',first.next_cursor);assert.equal(secondPage.data[0].record.title,'Second');
 assert.deepEqual(await readPage('audits',first.next_cursor,null,xReplacement),secondPage,'Scoped replacement keys replay the same page');
 const thirdPage=await readPage('audits',secondPage.next_cursor);assert.equal(thirdPage.data[0].record.title,'Third');assert(thirdPage.complete&&thirdPage.checkpoint);
 await assert.rejects(()=>readPage('audits',first.next_cursor,null,xForeignClient),/cursor_invalid/);
 await assert.rejects(()=>readPage('people',first.next_cursor),/cursor_invalid/);
 await assert.rejects(()=>readPage('audits',first.next_cursor,2),/page_size_mismatch/);
 let delta=await readPage('audits',thirdPage.checkpoint);const deltaFirst=delta;
 assert.deepEqual(await readPage('audits',thirdPage.checkpoint),deltaFirst,'A retried checkpoint replays the frozen change batch');
 const changes=[];for(;;){changes.push(...delta.data);if(delta.complete)break;delta=await readPage('audits',delta.next_cursor)}
 assert.equal(changes.length,3);assert(changes.some(e=>e.record?.title==='Changed after snapshot'));assert(changes.some(e=>e.record?.title==='Inserted after snapshot'));assert(changes.some(e=>e.record_id===X(12)&&e.operation==='delete'&&e.record===null));assert(!changes.some(e=>e.record?.title==='FOREIGN'));
 const empty=await readPage('audits',delta.checkpoint);assert.equal(empty.data.length,0);assert(empty.complete&&empty.checkpoint);assert.notEqual(empty.checkpoint,delta.checkpoint);
 console.log('PASS SQL snapshot pages stay stable across intervening source changes; retry and scoped-key continuation preserve pages; deltas contain updates/inserts/deletions; empty polls advance checkpoint; tenant and resource cursors are bound');

 await exportDb.query('insert into organization_people(id,organization_id,first_name,private_secret)values($1,$2,$3,$4)',[X(30),xOrg,'Directory person','PRIVATE']);
 const peoplePage=await readPage('people');assert.equal(peoplePage.data.length,1);assert.equal(peoplePage.data[0].record.first_name,'Directory person');assert(!('private_secret' in peoplePage.data[0].record));
 await exportDb.query('insert into isms_security_incidents(id,organization_id,owner_id,title,private_secret)values($1,$2,$3,$4,$5)',[X(31),xOrg,xOwner,'Security summary','PRIVATE NARRATIVE']);
 assert(!('private_secret' in (await readPage('security-incidents')).data[0].record));
 for(const spec of exportSpecs.filter(spec=>!['audits','findings','people','security-incidents'].includes(spec.resource))){
  await exportDb.query('insert into '+spec.source_table+'(id,organization_id,owner_id,private_secret)values($1,$2,$3,$4)',[X(32),xOrg,xOwner,'PRIVATE']);
  const page=await readPage(spec.resource);assert.equal(page.data.length,1,spec.resource+' captures inserts');assert(!('private_secret' in page.data[0].record));
  await exportDb.query('delete from '+spec.source_table+' where id=$1',[X(32)]);const deleted=await readPage(spec.resource,page.checkpoint);assert(deleted.data.some(e=>e.operation==='delete'),spec.resource+' captures deletes');
 }
 await exportDb.query('insert into internal_audit_findings(id,audit_id,organization_id,owner_id,finding_type,title)values($1,$2,$3,$4,$5,$6)',[X(40),X(10),xOrg,xOwner,'major_nc','Linked finding']);
 assert.equal((await readPage('findings')).data.length,1);
 await exportDb.query('update internal_audits set organization_id=$1 where id=$2',[xForeign,X(10)]);assert.equal((await readPage('findings')).data.length,0);
 await exportDb.query('update internal_audits set organization_id=$1 where id=$2',[xOrg,X(10)]);assert.equal((await readPage('findings')).data.length,1);
 await exportDb.query('delete from internal_audits where id=$1',[X(10)]);assert.equal((await readPage('findings')).data.length,0);
 await exportDb.query('insert into internal_audits(id,organization_id,owner_id,title)values($1,$2,$3,$4)',[X(10),xOrg,xOwner,'Restored parent']);assert.equal((await readPage('findings')).data.length,1);
 await exportDb.query('update internal_audit_findings set finding_type=$1 where id=$2',['observation',X(40)]);assert.equal((await readPage('findings')).data.length,0);
 await exportDb.query('delete from internal_audit_findings where id=$1',[X(22)]);assert.equal(Number((await exportDb.query('select count(*) n from integration_export_changes where record_id=$1',[X(22)])).rows[0].n),0,'Never-exported observations do not leak identities through deletion entries');
 await exportDb.exec('begin');await exportDb.query('insert into internal_audits(id,organization_id,owner_id,title)values($1,$2,$3,$4)',[X(50),xOrg,xOwner,'Rolled back']);await exportDb.exec('rollback');assert.equal(Number((await exportDb.query('select count(*) n from integration_export_changes where record_id=$1',[X(50)])).rows[0].n),0);
 await exportDb.exec(`create function nested_export_revision()returns trigger language plpgsql as $$begin if new.title='outer revision' then update internal_audits set title='final nested revision' where id=new.id;end if;return null;end$$;
 create trigger aaa_nested_export_revision after update on internal_audits for each row execute function nested_export_revision();`);
 await exportDb.query('update internal_audits set title=$1 where id=$2',['outer revision',X(11)]);assert.equal((await exportDb.query("select record_data->>'title' title from integration_export_changes where record_id=$1 order by change_id desc limit 1",[X(11)])).rows[0].title,'final nested revision');
 await assert.rejects(()=>exportDb.exec('truncate internal_audits'),/TRUNCATE would bypass/);
 console.log('PASS SQL allow-listed fields and summary privacy, all nine source captures, parent audit moves/deletes/restoration, finding reclassification, rollback, nested trigger revisions and TRUNCATE protection');

 await exportDb.query("update integration_export_pages set expires_at=now()-interval '1 second' where token=$1",[empty.checkpoint]);await assert.rejects(()=>readPage('audits',empty.checkpoint),/expired_full_resync_required/);
 await exportDb.query('update integration_api_clients set permissions=null where id=$1',[xClient]);await assert.rejects(()=>readPage(),/scope_required/);
 await exportDb.query('update integration_api_clients set permissions=$1,active=false where id=$2',[['audits:read'],xClient]);await assert.rejects(()=>readPage(),/key_unavailable/);
 await exportDb.query('update integration_api_clients set active=true,environment=$1 where id=$2',['test',xClient]);await assert.rejects(()=>readPage(),/key_unavailable/);
 await exportDb.query('update integration_api_clients set environment=$1,expires_at=now()-interval \'1 second\' where id=$2',['live',xClient]);await assert.rejects(()=>readPage(),/key_unavailable/);
 await exportDb.query('update integration_api_clients set expires_at=null where id=$1',[xClient]);
 for(const role of ['authenticated','anon']){
  await exportDb.exec('set role '+role);
  for(const table of ['integration_export_changes','integration_export_pages','integration_export_sources'])await assert.rejects(()=>exportDb.query('select * from '+table),/permission denied/);
  await assert.rejects(()=>readPage(),/permission denied/);await exportDb.exec('reset role');
 }
 await exportDb.exec('set role service_role');assert.equal((await readPage()).resource,'audits');
 await assert.rejects(()=>exportDb.query('select integration_export_safe_cutoff()'),/permission denied/);
 await assert.rejects(()=>exportDb.exec('delete from integration_export_pages'),/permission denied/);await exportDb.exec('reset role');
 console.log('PASS SQL cursor expiry, current scope/revocation/test-key/expiry checks, denied public execution and service-only read RPC');


 // Asset Management extension: execute real migration SQL, not source-text assertions.
 const assetExtension=fs.readFileSync(new URL('../supabase/migrations/20261108_asset_management_integration_extension.sql',import.meta.url),'utf8');
 await exportDb.exec('alter table organization_assets add column asset_categories text[]');
 await exportDb.exec('alter table organization_assets add column calibration_required boolean');
 await exportDb.exec('alter table organization_assets add column last_calibration_date text');
 await exportDb.exec('alter table organization_assets add column next_calibration_date text');
 await exportDb.exec('alter table organization_assets add column calibration_frequency_value text');
 await exportDb.exec('alter table organization_assets add column calibration_frequency_unit text');
 await exportDb.exec('alter table organization_assets add column calibration_interval_basis text');
 await exportDb.exec('alter table organization_assets add column calibration_provider text');
 await exportDb.exec('alter table organization_assets add column calibration_certificate_reference text');
 await exportDb.exec('alter table organization_assets add column calibration_result text');
 await exportDb.exec('alter table organization_assets add column calibration_scope text');
 await exportDb.exec('alter table organization_assets add column calibration_acceptance_criteria text');
 await exportDb.exec('create table organization_asset_maintenance(id uuid primary key,asset_id uuid,maintenance_reference text,maintenance_type text,scheduled_date text,completed_date text,status text,maintenance_owner_type text,responsible_person_id uuid,supplier_id uuid,performed_by text,work_completed text,evidence_reference text,calibration_result text,calibration_acceptance_criteria text,next_due_date text,created_at text,organization_id uuid,owner_id uuid)');
 await exportDb.exec('create table organization_asset_document_links(id uuid primary key,asset_id uuid,controlled_document_id uuid,created_at text,organization_id uuid,owner_id uuid)');
 await exportDb.exec('create table organization_asset_assurance_links(id uuid primary key,asset_id uuid,finding_id uuid,rca_case_id uuid,created_at text,organization_id uuid)');
 await exportDb.exec('create table hs_moc_changes(id uuid primary key,organization_asset_id uuid,organization_id uuid,owner_id uuid)');

 await exportDb.exec(assetExtension);
 const extensionAsset=X(100),job=X(101),link=X(102),moc=X(103);
 await exportDb.query("insert into organization_assets(id,organization_id,owner_id,asset_reference,asset_name,asset_categories,calibration_required,next_calibration_date)values($1,$2,$3,'A100','Gauge',array['equipment','measuring_instruments'],true,'2026-12-01')",[extensionAsset,xOrg,xOwner]);
 await exportDb.query("insert into organization_asset_maintenance(id,asset_id,organization_id,owner_id,status,maintenance_type,scheduled_date)values($1,$2,$3,$4,'planned','calibration','2026-12-01')",[job,extensionAsset,xOrg,xOwner]);
 await exportDb.query("insert into organization_asset_assurance_links(id,asset_id,organization_id,finding_id)values($1,$2,$3,$4)",[link,extensionAsset,xOrg,X(104)]);
 await exportDb.query("insert into hs_moc_changes(id,organization_asset_id,organization_id,owner_id)values($1,$2,$3,$4)",[moc,extensionAsset,xOrg,xOwner]);
 await exportDb.query("update integration_api_clients set permissions=array['assets:read','assets:maintenance:read','assets:links:read','audits:read'] where id=$1",[xClient]);
 let controls=await readPage('asset-controls');assert.equal(controls.data.find(x=>x.record_id===extensionAsset).record.calibration_required,true);
 assert.deepEqual(controls.data.find(x=>x.record_id===extensionAsset).record.asset_categories,['equipment','measuring_instruments']);
 let jobs=await readPage('asset-maintenance');assert.equal(jobs.data.find(x=>x.record_id===job).record.status,'planned');
 let refs=await readPage('asset-assurance-links');assert.equal(refs.data.find(x=>x.record_id===link).record.finding_id,X(104));
 assert(!JSON.stringify(jobs).includes('evidence_storage_path'));
 const legacy=await readPage('assets');assert(!Object.hasOwn(legacy.data.find(x=>x.record_id===extensionAsset).record,'calibration_required'));
 await exportDb.query("update integration_api_clients set permissions=array['assets:maintenance:read'] where id=$1",[xClient]);await assert.rejects(()=>readPage('asset-maintenance'),/scope_required/);
 await exportDb.query("update integration_api_clients set permissions=array['assets:read','assets:maintenance:read','assets:links:read','audits:read'] where id=$1",[xClient]);
 const oldCheckpoint=controls.checkpoint;
 await exportDb.query("update organization_assets set next_calibration_date='2027-01-01' where id=$1",[extensionAsset]);
 controls=await readPage('asset-controls',oldCheckpoint);assert(controls.data.some(x=>x.record_id===extensionAsset&&x.record.next_calibration_date==='2027-01-01'));
 await exportDb.query('delete from organization_asset_maintenance where id=$1',[job]);jobs=await readPage('asset-maintenance',jobs.checkpoint);assert(jobs.data.some(x=>x.record_id===job&&x.operation==='delete'));
 await exportDb.query('update organization_assets set organization_id=$1 where id=$2',[xForeign,extensionAsset]);
 refs=await readPage('asset-assurance-links',refs.checkpoint);assert(refs.data.some(x=>x.record_id===link&&x.operation==='delete'));
 assert(!(await readPage('asset-assurance-links')).data.some(x=>x.record_id===link));
 await exportDb.query('update organization_assets set organization_id=$1 where id=$2',[xOrg,extensionAsset]);
 assert((await readPage('asset-assurance-links')).data.some(x=>x.record_id===link),'Restored parent restores eligible child visibility');
 for(const role of ['anon','authenticated']){await exportDb.exec('set role '+role);await assert.rejects(()=>exportDb.query('select * from integration_asset_controls'),/permission denied/);await exportDb.exec('reset role');}
 await exportDb.exec(assetExtension);
 assert.equal((await exportDb.query("select count(*)::int n from integration_export_sources where resource like 'asset-%'")).rows[0].n,5);
 console.log('PASS asset extension SQL: independent feeds, unchanged legacy payload, category/calibration updates, maintenance deletions, parent move tombstones, scope dependencies, service isolation and idempotent migration');

 // Controlled visibility-boundary simulation, not a multi-connection concurrency
 // test: a lower sequence can belong to a transaction deferred to a later batch.
 // Use different records so a receiver must receive BOTH entries regardless of
 // the largest sequence seen in its previous batch.
 await exportDb.query('insert into internal_audits(id,organization_id,owner_id,title)values($1,$2,$3,$4),($5,$2,$3,$6)',[X(60),xOrg,xOwner,'Deferred lower sequence',X(61),'Visible higher sequence']);
 await exportDb.query('update integration_export_changes set source_xid=1000000 where resource=$1 and record_id=$2',['audits',X(60)]);
 await exportDb.query('update integration_export_changes set source_xid=999999 where resource=$1 and record_id=$2',['audits',X(61)]);
 await exportDb.exec(`create table export_fixture_watermark(value bigint);insert into export_fixture_watermark values(1000000);
 create or replace function public.integration_export_safe_cutoff()returns bigint language sql volatile security definer set search_path='' as $$select value from public.export_fixture_watermark$$;`);
 let window=await readPage('audits');assert(window.data.some(e=>e.record_id===X(61)));assert(!window.data.some(e=>e.record_id===X(60)));
 const previousMax=window.data.reduce((max,e)=>BigInt(e.change_id)>max?BigInt(e.change_id):max,0n);
 await exportDb.exec('update export_fixture_watermark set value=1000001');window=await readPage('audits',window.checkpoint);
 assert(window.data.some(e=>e.record_id===X(60)));assert(BigInt(window.data.find(e=>e.record_id===X(60)).change_id)<previousMax,'Deferred lower sequence is still exported after the checkpoint');
 console.log('PASS controlled SQL visibility cutoff simulation retains a deferred lower sequence across checkpoint windows; no sequence-only commit watermark');
} finally {
 await exportDb.close();
}
