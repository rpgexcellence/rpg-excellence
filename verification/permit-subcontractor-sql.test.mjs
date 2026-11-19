import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const permit = "11111111-1111-4111-8111-111111111111";
const organization = "22222222-2222-4222-8222-222222222222";
const issuer = "33333333-3333-4333-8333-333333333333";
const recipient = "44444444-4444-4444-8444-444444444444";
const other = "55555555-5555-4555-8555-555555555555";
const updated = "2026-11-19T09:00:00Z";

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create table public.hs_permits(id uuid primary key, organization_id uuid, updated_at timestamptz, status text);
  `);
  const migration = await readFile(new URL("../supabase/migrations/20261119_permit_subcontractor_requests.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  await db.query("insert into hs_permits values ($1,$2,$3,'draft')", [permit, organization, updated]);
  await db.query("insert into auth.users values ($1,'lead@example.test',now()), ($2,'other@example.test',now())", [recipient, other]);

  const insert = () => db.query(`
    insert into hs_permit_subcontractor_requests(permit_id,permit_updated_at,recipient_email,requested_by)
    values ($1,$2,'lead@example.test',$3) returning id
  `, [permit, updated, issuer]);
  const submit = (id, actor) => db.query(`
    update hs_permit_subcontractor_requests set submitted_at=now(),submitted_by=$2,
      company='Example Contractor',work_lead='Work Lead',method_summary='Method summary',evidence_pdf='bW9jayBQREY='
    where id=$1 returning id
  `, [id, actor]);

  await db.exec("set role service_role");
  const { rows: [first] } = await insert();
  await assert.rejects(insert, /duplicate key/);
  await assert.rejects(() => submit(first.id, other), /unavailable/);

  await db.exec("reset role; set role authenticated");
  await assert.rejects(() => db.query("select * from hs_permit_subcontractor_requests"), /permission denied/);
  await db.exec("reset role; set role anon");
  await assert.rejects(() => db.query("select * from hs_permit_subcontractor_requests"), /permission denied/);

  await db.exec("reset role; set role service_role");
  await db.query("update hs_permit_subcontractor_requests set revoked_at=now() where id=$1", [first.id]);
  await assert.rejects(() => submit(first.id, recipient), /final/);
  const { rows: [second] } = await insert();
  await db.exec("reset role");
  await db.query("update hs_permits set status='awaiting_verification' where id=$1", [permit]);
  await db.exec("set role service_role");
  await assert.rejects(() => submit(second.id, recipient), /unavailable/);
  await db.exec("reset role");
  await db.query("update hs_permits set status='draft' where id=$1", [permit]);
  await db.exec("set role service_role");
  assert.equal((await submit(second.id, recipient)).rows[0].id, second.id);
  await assert.rejects(() => submit(second.id, recipient), /final/);
  await db.exec("reset role");
  assert.equal((await db.query("select status from hs_permits where id=$1", [permit])).rows[0].status, "draft");
  console.log("PASS subcontractor migration grants, draft and recipient checks, revocation and single submission");
} finally {
  await db.close();
}
