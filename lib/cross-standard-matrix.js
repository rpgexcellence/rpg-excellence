import { createAdminClient } from "./supabase/admin";

export const MATRIX_STANDARD_KEYS = [
  { key: "ISO 9001:2026", label: "ISO 9001", edition: "2026" },
  { key: "ISO 14001:2026", label: "ISO 14001", edition: "2026" },
  { key: "ISO 45001:2018", label: "ISO 45001", edition: "2018/Amd 1:2024" },
  { key: "ISO 22301:2019", label: "ISO 22301", edition: "2019/Amd 1:2024" },
  { key: "ISO/IEC 27001:2022", label: "ISO/IEC 27001", edition: "2022/Amd 1:2024" },
];

const normaliseStandard = (value) => String(value || "")
  .toUpperCase()
  .replaceAll("IEC", "IEC")
  .replace(/[^A-Z0-9]/g, "");

const standardMatches = (assessmentStandard, configured) => {
  const value = normaliseStandard(assessmentStandard);
  const key = normaliseStandard(configured.key);
  if (value === key) return true;
  const base = normaliseStandard(configured.label);
  return value.startsWith(base) && value.includes(configured.edition.slice(0, 4));
};

const clauseRoots = (reference) => [...new Set(
  String(reference || "")
    .match(/\b(?:4|5|6|7|8|9|10)(?:\.\d+)?/g)
    ?.map((item) => item.split(".")[0]) || [],
)];

const average = (values) => values.length
  ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  : null;

export async function loadCrossStandardMatrix(organization) {
  const admin = createAdminClient();
  const [groupResult, controlResult, evidenceResult, peopleResult, documentResult, assessmentResult] = await Promise.all([
    admin
      .from("cross_standard_control_groups")
      .select("*,cross_standard_requirement_links(*)")
      .eq("active", true)
      .order("display_order"),
    admin
      .from("organization_cross_standard_controls")
      .select("*")
      .eq("organization_id", organization.id),
    admin
      .from("cross_standard_evidence_links")
      .select("*")
      .eq("organization_id", organization.id),
    admin
      .from("organization_people")
      .select("id,first_name,last_name,email,position,account_status")
      .eq("organization_id", organization.id)
      .eq("account_status", "active")
      .order("last_name"),
    admin
      .from("controlled_documents")
      .select("id,document_number,title,revision,status")
      .eq("status", "Current")
      .in("audience", ["Customer", "Both"])
      .order("document_number"),
    admin
      .from("assessments")
      .select("id,title,standard,status,created_at,updated_at")
      .eq("organization_id", organization.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  for (const result of [groupResult, controlResult, evidenceResult, peopleResult, documentResult, assessmentResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const assessments = assessmentResult.data || [];
  const assessmentIds = assessments.map((item) => item.id);
  const answerResult = assessmentIds.length
    ? await admin
      .from("assessment_answers")
      .select("assessment_id,clause,score")
      .in("assessment_id", assessmentIds)
    : { data: [], error: null };
  if (answerResult.error) throw new Error(answerResult.error.message);

  const answersByAssessment = new Map();
  for (const answer of answerResult.data || []) {
    if (!answersByAssessment.has(answer.assessment_id)) answersByAssessment.set(answer.assessment_id, []);
    answersByAssessment.get(answer.assessment_id).push(answer);
  }

  const latestByStandard = new Map();
  for (const standard of MATRIX_STANDARD_KEYS) {
    latestByStandard.set(
      `${standard.label}|${standard.edition}`,
      assessments.find((assessment) => standardMatches(assessment.standard, standard)) || null,
    );
  }

  const controlsByGroup = new Map((controlResult.data || []).map((item) => [item.control_group_id, item]));
  const evidenceByControl = new Map();
  for (const item of evidenceResult.data || []) {
    if (!evidenceByControl.has(item.organization_control_id)) evidenceByControl.set(item.organization_control_id, []);
    evidenceByControl.get(item.organization_control_id).push(item);
  }

  const groups = (groupResult.data || []).map((group) => {
    const control = controlsByGroup.get(group.id) || null;
    const requirements = (group.cross_standard_requirement_links || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((requirement) => {
        const assessment = latestByStandard.get(`${requirement.standard_name}|${requirement.edition}`) || null;
        const roots = clauseRoots(requirement.clause_reference);
        const scores = (answersByAssessment.get(assessment?.id) || [])
          .filter((answer) => roots.includes(String(answer.clause || "").split(".")[0]))
          .map((answer) => Number(answer.score))
          .filter(Number.isFinite);
        return {
          ...requirement,
          assessment: assessment ? {
            id: assessment.id,
            title: assessment.title,
            status: assessment.status,
            score: average(scores),
          } : null,
        };
      });
    return {
      ...group,
      cross_standard_requirement_links: undefined,
      requirements,
      control,
      evidence: control ? evidenceByControl.get(control.id) || [] : [],
    };
  });

  return {
    groups,
    people: peopleResult.data || [],
    documents: documentResult.data || [],
    standards: MATRIX_STANDARD_KEYS,
  };
}

