import "server-only";

export const briefingRoot = "/portal/risk-briefings";
export const riskRoot = "/portal/health-safety/risk-assessment";

export function distributionUnavailable(error) {
  return ["42P01", "PGRST205"].includes(error?.code);
}

export async function distributionRows(admin, organisation, filter = query => query, joined = false) {
  const columns = "assessment_id,person_id,recipient_user_id,communicated_at,acknowledgement_due,acknowledged_at";
  const assessment = ",hs_risk_assessments!inner(assessment_reference,title,version,status,site_location)";
  const rows = [];
  const size = 500;
  for (let start = 0; ; start += size) {
    const query = admin.from("hs_risk_recipients").select(columns + (joined ? assessment : ""))
      .eq("organization_id", organisation).order("assessment_id").order("person_id");
    const { data, error } = await filter(query).range(start, start + size - 1);
    if (error) {
      if (distributionUnavailable(error)) return null;
      throw error;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

export async function riskAcknowledgementTasks(admin, organisation, userId, oversight) {
  const rows = await distributionRows(admin, organisation, query => {
    const live = query.eq("hs_risk_assessments.status", "communicated");
    return oversight ? live : live.eq("recipient_user_id", userId);
  }, true);
  return (rows ?? []).map(row => {
    const assessment = row.hs_risk_assessments;
    return {
      id: "risk-ack:" + row.assessment_id + ":" + row.person_id, source: "risk", module: "Risk Management",
      title: "Acknowledge " + [assessment.assessment_reference, assessment.title, "Version " + assessment.version].filter(Boolean).join(" · "),
      due: row.acknowledgement_due, assignee: row.person_id, assigneeUserId: row.recipient_user_id,
      href: row.recipient_user_id === userId ? briefingRoot + "/" + row.assessment_id
        : riskRoot + "/" + row.assessment_id + "?tab=distribution",
      status: row.acknowledged_at ? "completed" : "acknowledgement_due",
      site: assessment.site_location, updated: row.acknowledged_at ?? row.communicated_at,
      recipientOnly: true,
    };
  });
}
