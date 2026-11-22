import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const id = n => "40000000-0000-4000-8000-" + String(n).padStart(12, "0");
const [org, foreignOrg, sender, reader, other, record, draft, next, person, outsider, inactive, legacy] =
  Array.from({ length: 12 }, (_, index) => id(index + 1));

await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table organizations(id uuid primary key);
  create table organization_people(id uuid primary key, organization_id uuid, user_id uuid, account_status text, account_type text);
  create table hs_risk_assessments(id uuid primary key, organization_id uuid, owner_id uuid, status text, communicated_at timestamptz);
  create table hs_risk_events(assessment_id uuid, owner_id uuid, organization_id uuid, actor_id uuid,
    event_type text, event_summary text, event_data jsonb);
`);
await db.query("insert into organizations values ($1),($2)", [org, foreignOrg]);
await db.query("insert into organization_people values ($1,$2,$3,'active','system'),($4,$5,$6,'active','system'),($7,$2,$6,'suspended','system')",
  [person, org, reader, outsider, foreignOrg, other, inactive]);
await db.query("insert into hs_risk_assessments values ($1,$2,$3,'approved',null),($4,$2,$3,'draft',null),($5,$2,$3,'approved',null),($6,$2,$3,'communicated','2026-10-01T12:00Z')",
  [record, org, sender, draft, next, legacy]);
const migration = readFileSync(new URL("../supabase/migrations/20261122_hs_risk_distribution.sql", import.meta.url), "utf8");
await db.exec(migration);
await db.exec(migration);
const send = (assessment, audience, company = org, due = null) => db.query(
  "select hs_communicate_assessment($1,$2,$3,$4,$5)", [company, assessment, sender, audience, due]);
const ack = (assessment, actor, company = org) => db.query(
  "select hs_acknowledge_assessment($1,$2,$3)", [company, assessment, actor]);
const records = async assessment => (await db.query("select * from hs_risk_recipients where assessment_id=$1", [assessment])).rows;

await db.exec("set role authenticated");
await assert.rejects(send(record, [person]), /permission denied/);
await assert.rejects(ack(record, reader), /permission denied/);
await assert.rejects(records(record), /permission denied/);
await db.exec("reset role");
await assert.rejects(send(draft, [person]), /Only an approved/);
await assert.rejects(send(record, [person], foreignOrg), /Only an approved/);
await assert.rejects(send(record, [person, outsider]), /no longer eligible/);
await assert.rejects(send(record, [inactive]), /no longer eligible/);
await assert.rejects(send(record, [person], org, "2000-01-01"), /due date/);
assert.equal((await records(record)).length, 0);
assert.equal((await db.query("select status from hs_risk_assessments where id=$1", [record])).rows[0].status, "approved");

await send(record, [person]);
await assert.rejects(send(record, [person]), /already been distributed/);
await assert.rejects(ack(record, sender), /not an active recipient/);
await db.query("update organization_people set account_status='suspended' where id=$1", [person]);
await assert.rejects(ack(record, reader), /not an active recipient/);
await db.query("update organization_people set account_status='active' where id=$1", [person]);
await ack(record, reader);
const acknowledgedAt = (await records(record))[0].acknowledged_at;
await ack(record, reader);
assert.deepEqual((await records(record))[0].acknowledged_at, acknowledgedAt);
assert.equal((await db.query("select count(*)::int as total from hs_risk_events where event_type='acknowledged'")).rows[0].total, 1);
await db.query("update hs_risk_assessments set status='superseded' where id=$1", [record]);
await assert.rejects(ack(record, reader), /no longer available/);
await send(next, [person]);
assert.equal((await records(next))[0].acknowledged_at, null);
assert.deepEqual((await records(record))[0].acknowledged_at, acknowledgedAt);
await send(legacy, [person]);
assert.equal((await db.query("select communicated_at from hs_risk_assessments where id=$1", [legacy])).rows[0].communicated_at.toISOString(),
  "2026-10-01T12:00:00.000Z");
await db.close();
console.log("PASS assessment distribution and acknowledgement, tenant and recipient boundaries, rollback, retries, history, and migration reapplication");
