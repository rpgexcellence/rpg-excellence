import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit integer, allowed_mime_types text[]);
  create table public.suppliers (id uuid primary key);
  create table public.organizations (id uuid primary key);
  create table public.supplier_code_of_conduct_documents (
    id uuid primary key, supplier_id uuid, organization_id uuid, document_reference text,
    version integer, sections jsonb, declaration jsonb, status text, generated_by text
  );
  insert into public.suppliers values ('00000000-0000-0000-0000-000000000001');
  insert into public.organizations values ('00000000-0000-0000-0000-000000000002');
  insert into public.supplier_code_of_conduct_documents (id) values ('00000000-0000-0000-0000-000000000003');
`);
const migration = await readFile(new URL("../supabase/migrations/20261126_supplier_assurance_invitations.sql", import.meta.url), "utf8");
await db.exec(migration);
await db.exec(migration);
const create = (id, hash) => db.query(`
  insert into public.supplier_assurance_invitations
  (id,supplier_id,organization_id,owner_id,recipient,contact_name,expires_at,token_hash,document_id,questionnaire,status)
  values ($1,'00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004','supplier@example.com','Test Contact',now() + interval '1 day',$2,
  '00000000-0000-0000-0000-000000000003','[]','creating')`, [id,hash]);
const documentAccess = await readFile(new URL("../supabase/migrations/202611261112_supplier_invitation_document_read.sql", import.meta.url), "utf8");
await db.exec(documentAccess);
await db.exec(documentAccess);
await db.exec("set role service_role");
await db.query("select id,document_reference,version,sections,declaration,status from public.supplier_code_of_conduct_documents where supplier_id is null and organization_id is null");
await assert.rejects(db.query("select generated_by from public.supplier_code_of_conduct_documents"), error => error.code === "42501");
await create("00000000-0000-0000-0000-000000000005", "first");
await assert.rejects(create("00000000-0000-0000-0000-000000000006", "second"), error => error.code === "23505");
for (const status of ["draft", "sent", "in_progress", "submitted", "clarification"]) {
  await db.query("update public.supplier_assurance_invitations set status=$1", [status]);
  await assert.rejects(create("00000000-0000-0000-0000-000000000006", "second"), error => error.code === "23505");
}
await db.query("update public.supplier_assurance_invitations set status='reviewed'");
await create("00000000-0000-0000-0000-000000000006", "second");
await db.exec("reset role");
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  await assert.rejects(db.query("select * from public.supplier_assurance_invitations"), error => error.code === "42501");
  await assert.rejects(db.query("select id,sections from public.supplier_code_of_conduct_documents"), error => error.code === "42501");
  await db.exec("reset role");
}
const { rows:[bucket] } = await db.query("select * from storage.buckets where id='supplier-submission-evidence'");
assert.equal(bucket.public, false);
assert.equal(bucket.file_size_limit, 4194304);
await db.close();
console.log("Supplier invitation migration verified. Active invitations are unique and supplier responses and evidence storage are private.");
