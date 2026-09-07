import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

function quarterKey(date = new Date()) {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const quarter = quarterKey();
  const { data: auditors, error } = await supabase.from("internal_auditor_register").select("id, owner_id, organization_id, verification_status, verified_until").eq("active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const groups = new Map();
  for (const auditor of auditors || []) {
    const key = `${auditor.owner_id}:${auditor.organization_id}`;
    const current = groups.get(key) || [];
    current.push(auditor); groups.set(key, current);
  }
  let created = 0;
  for (const group of groups.values()) {
    const first = group[0];
    const { data: existing } = await supabase.from("internal_auditor_quarterly_selections").select("id").eq("owner_id", first.owner_id).eq("organization_id", first.organization_id).eq("quarter_key", quarter).maybeSingle();
    if (existing) continue;
    const horizon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const priority = group.filter((auditor) => auditor.verification_status !== "verified" || !auditor.verified_until || auditor.verified_until <= horizon);
    const pool = priority.length ? priority : group;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    const due = new Date(); due.setUTCDate(due.getUTCDate() + 30);
    const inserted = await supabase.from("internal_auditor_quarterly_selections").insert({ owner_id: selected.owner_id, organization_id: selected.organization_id, auditor_id: selected.id, quarter_key: quarter, due_date: due.toISOString().slice(0, 10), status: "notified", selection_reason: priority.includes(selected) ? "Automated risk-prioritised quarterly selection: verification is absent or due within 90 days." : "Automated quarterly random rotational selection." });
    if (!inserted.error) created += 1;
  }
  return NextResponse.json({ quarter, selections_created: created });
}

