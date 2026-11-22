import Link from "next/link";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { briefingRoot, distributionRows } from "../../../../../lib/risk-distribution";
import { communicateAssessment } from "./distribution-actions";
import RecipientPicker from "./RecipientPicker";
import s from "../../../documents/documents.module.css";

const date = (value, timed = false) => value ? new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium", ...(timed ? { timeStyle: "short" } : {}), timeZone: "Europe/London",
}).format(new Date(value)) : "—";

const messages = {
  invalid: "Select at least one active recipient and check the due date.",
  "send-error": "Communication could not be recorded. Check the recipients and due date, and confirm this version has not already been sent.",
  sent: "This version was communicated and acknowledgement tasks were created.",
};

export default async function RecordDistribution({ assessment, access, canContribute, result }) {
  const admin = createAdminClient();
  const current = ["approved", "communicated"].includes(assessment.status);
  const rows = await distributionRows(admin, access.organization.id, query => query.eq("assessment_id", assessment.id));
  const canSend = rows !== null && current && canContribute && !rows.length;
  const myTask = rows?.find(row => row.recipient_user_id === access.user.id);
  const done = rows?.filter(row => row.acknowledged_at).length ?? 0;
  const people = [];
  if (canSend || (canContribute && rows?.length)) {
    const pageSize = 500;
    for (let start = 0; ; start += pageSize) {
      let request = admin.from("organization_people").select("id,first_name,last_name,site,department")
        .eq("organization_id", access.organization.id).order("id");
      if (canSend) request = request.eq("account_type", "system").eq("account_status", "active").not("user_id", "is", null);
      const response = await request.range(start, start + pageSize - 1);
      if (response.error) throw response.error;
      people.push(...(response.data ?? []).map(person => ({ id: person.id,
        name: [person.first_name, person.last_name].filter(Boolean).join(" ") || "Unnamed company user",
        site: person.site || "Across locations", department: person.department || "Department not assigned",
      })));
      if ((response.data ?? []).length < pageSize) break;
    }
    people.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  }
  const names = new Map(people.map(person => [person.id, person.name]));
  return <>
    <section className={s.recordPanel}><h2>Distribution list</h2>
      {Object.hasOwn(messages, result ?? "") && <p className={result === "sent" ? s.success : s.error} role={result === "sent" ? "status" : "alert"}>{messages[result]}</p>}
      {rows === null ? <p className={s.muted}>Distribution is unavailable until the database update is applied.</p> :
        <><p><strong>Selected company users</strong> · Acknowledgement required</p>
          {canSend && <>
            {assessment.status === "communicated" && <p className={s.notice}>Previously marked communicated. Send to selected recipients to start tracking acknowledgements for this version.</p>}
            <p className={s.muted}>Each selected user receives a task in My Tasks &amp; Approvals to read and acknowledge this version.</p>
            <RecipientPicker people={people} action={communicateAssessment.bind(null, assessment.id)}/>
          </>}
          {!canSend && !rows.length && <p className={s.muted}>{current ? "No recipient distribution is recorded for this version."
            : "An assessment must be approved before it can be communicated."}</p>}
        </>}
    </section>
    {Boolean(rows?.length) && <section className={s.recordPanel}><h2>Acknowledgement record</h2>
      <p><strong>{done} acknowledged · {rows.length - done} {current ? "pending" : "outstanding when withdrawn from use"}</strong></p>
      <p className={s.muted}>Sent {date(rows[0].communicated_at, true)}{rows[0].acknowledgement_due ? " · Due " + date(rows[0].acknowledgement_due) : ""} · Version {assessment.version}</p>
      {canContribute && <ul className={s.recordDecisions}>{rows.map(row => <li key={row.person_id}>
        <strong>{names.get(row.person_id) || "Company user"}</strong>
        <span>{row.acknowledged_at ? "Acknowledged " + date(row.acknowledged_at, true) : "Pending"}</span>
      </li>)}</ul>}
      {myTask && current && <Link className={s.recordButton} href={briefingRoot + "/" + assessment.id}>
        {myTask.acknowledged_at ? "View my acknowledgement" : "Open my acknowledgement task"}
      </Link>}
    </section>}
  </>;
}
