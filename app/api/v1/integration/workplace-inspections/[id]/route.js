import {
  integrationJson,
  recordIntegrationEvent,
  requireIntegrationClient,
} from "../../../../../../lib/integration-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

async function recordFailure(authentication, request, inspectionId, status, message) {
  await recordIntegrationEvent({
    admin: authentication.admin,
    client: authentication.client,
    request,
    requestId: authentication.requestId,
    eventType: "workplace_inspection_read_failed",
    resourceType: "workplace_inspection",
    resourceId: validUuid(inspectionId) ? inspectionId : null,
    responseStatus: status,
    errorSummary: message,
  });
}

export async function GET(request, { params }) {
  const authentication = await requireIntegrationClient(
    request,
    "workplace_inspections:read",
  );
  if (authentication.error) return authentication.error;

  const route = await params;
  const inspectionId = String(route.id || "");
  const { admin, client, requestId } = authentication;

  if (!validUuid(inspectionId)) {
    await recordFailure(
      authentication,
      request,
      inspectionId,
      400,
      "Invalid inspection identifier",
    );
    return integrationJson(
      {
        error: "invalid_inspection_id",
        message: "Provide a valid Workplace Inspection identifier.",
      },
      400,
      requestId,
    );
  }

  const inspectionResult = await admin
    .from("hs_workplace_inspections")
    .select(
      "id,inspection_reference,title,inspection_type,programme_id,template_id," +
      "administration_location_id,administration_location_label,area_department," +
      "planned_start_at,planned_end_at,started_at,completed_at,status," +
      "lead_inspector_person_id,accountable_person_id,reviewer_person_id," +
      "planning_risk_score,planning_risk_band,planning_basis,scope," +
      "created_at,updated_at",
    )
    .eq("id", inspectionId)
    .eq("organization_id", client.organization_id)
    .maybeSingle();

  if (inspectionResult.error) {
    await recordFailure(
      authentication,
      request,
      inspectionId,
      500,
      inspectionResult.error.message,
    );
    return integrationJson(
      {
        error: "workplace_inspection_unavailable",
        message: "The Workplace Inspection record could not be retrieved.",
        diagnostic_code: inspectionResult.error.code || "database_query_failed",
      },
      500,
      requestId,
    );
  }

  if (!inspectionResult.data) {
    await recordFailure(
      authentication,
      request,
      inspectionId,
      404,
      "Inspection not found in API client organisation",
    );
    return integrationJson(
      {
        error: "workplace_inspection_not_found",
        message: "The Workplace Inspection record was not found.",
      },
      404,
      requestId,
    );
  }

  const [responsesResult, findingsResult, actionsResult, evidenceResult] =
    await Promise.all([
      admin
        .from("hs_workplace_inspection_responses")
        .select(
          "id,question_code,section_code,section_title,question_text," +
          "legislation_guidance,inspector_guidance,response,comment," +
          "not_applicable_justification,finding_required,display_order,updated_at",
        )
        .eq("organization_id", client.organization_id)
        .eq("inspection_id", inspectionId)
        .order("display_order"),
      admin
        .from("hs_workplace_inspection_findings")
        .select(
          "id,response_id,finding_reference,title,description,finding_type,priority," +
          "severity,likelihood,risk_score,immediate_action_taken,stop_work_applied," +
          "status,created_at,updated_at",
        )
        .eq("organization_id", client.organization_id)
        .eq("inspection_id", inspectionId)
        .order("created_at"),
      admin
        .from("hs_workplace_inspection_actions")
        .select(
          "id,finding_id,action_reference,action_text,priority,status," +
          "responsible_person_id,verifier_person_id,target_date,completed_at," +
          "verified_at,effectiveness_result,created_at,updated_at",
        )
        .eq("organization_id", client.organization_id)
        .eq("inspection_id", inspectionId)
        .order("target_date"),
      admin
        .from("hs_workplace_inspection_evidence")
        .select(
          "id,response_id,finding_id,action_id,evidence_type,title," +
          "original_file_name,external_url,created_at",
        )
        .eq("organization_id", client.organization_id)
        .eq("inspection_id", inspectionId)
        .order("created_at", { ascending: false }),
    ]);

  const relatedResults = [
    responsesResult,
    findingsResult,
    actionsResult,
    evidenceResult,
  ];
  const relatedError = relatedResults.find((result) => result.error)?.error;
  if (relatedError) {
    await recordFailure(
      authentication,
      request,
      inspectionId,
      500,
      relatedError.message,
    );
    return integrationJson(
      {
        error: "inspection_detail_unavailable",
        message: "Connected Workplace Inspection records could not be retrieved.",
        diagnostic_code: relatedError.code || "database_query_failed",
      },
      500,
      requestId,
    );
  }

  await recordIntegrationEvent({
    admin,
    client,
    request,
    requestId,
    eventType: "workplace_inspection_read",
    resourceType: "workplace_inspection",
    resourceId: inspectionId,
    responseStatus: 200,
  });

  return integrationJson(
    {
      data: {
        inspection: inspectionResult.data,
        responses: responsesResult.data || [],
        findings: findingsResult.data || [],
        actions: actionsResult.data || [],
        evidence: evidenceResult.data || [],
      },
      counts: {
        responses: (responsesResult.data || []).length,
        findings: (findingsResult.data || []).length,
        actions: (actionsResult.data || []).length,
        evidence: (evidenceResult.data || []).length,
      },
      request_id: requestId,
    },
    200,
    requestId,
  );
}
