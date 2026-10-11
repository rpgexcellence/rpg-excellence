import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import {
  getPermitAccess,
  mayAcceptHandback,
  mayEditPermit,
  mayIssuePermit,
  mayReceivePermit,
  mayVerifyPermit,
} from "../../../../../lib/permitAccess";
import {
  effectivePermitStatus,
  getCloseReadiness,
  getIssueReadiness,
  PERMIT_STATUSES,
  statusMessage,
} from "../../../../../lib/permitLifecycle";
import {
  COMMON_CONTROLS,
  getPermitRule,
} from "../../../../../lib/permitControlRules";
import { changePermitLifecycle } from "./actions";

export const dynamic = "force-dynamic";

const title = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

function Action({
  id,
  intent,
  label,
  tone = "blue",
  field,
  confirmation = false,
}) {
  return (
    <form action={changePermitLifecycle} className="pcAction">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />

      {field && (
        <label>
          {field}
          <textarea
            name={confirmation ? "confirmation" : "reason"}
            required
          />
        </label>
      )}

      <button className={`pcButton ${tone}`}>{label}</button>
    </form>
  );
}

export default async function PermitRecordPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/portal/login?next=/portal/health-safety/permits/${id}`);
  }

  const access = await getPermitAccess(user.id, id);

  if (!access.allowed || !access.permit) {
    notFound();
  }

  const { admin } = access;

  const [
    permitResult,
    isolationResult,
    testResult,
    handoverResult,
    eventResult,
    conflictResult,
  ] = await Promise.all([
    admin
      .from("hs_permits")
      .select(
        "*,hs_risk_assessments!hs_permits_linked_assessment_id_fkey(assessment_reference,title,status)",
      )
      .eq("id", id)
      .single(),

    admin
      .from("hs_permit_isolations")
      .select("*")
      .eq("permit_id", id)
      .order("created_at"),

    admin
      .from("hs_permit_atmosphere_tests")
      .select("*")
      .eq("permit_id", id)
      .order("tested_at", { ascending: false }),

    admin
      .from("hs_permit_handovers")
      .select("*")
      .eq("permit_id", id)
      .order("handed_over_at", { ascending: false }),

    admin
      .from("hs_permit_events")
      .select("*")
      .eq("permit_id", id)
      .order("created_at", { ascending: false }),

    admin
      .from("hs_permits")
      .select("id,permit_reference,task_description,status")
      .eq("organization_id", access.permit.organization_id)
      .eq("site_location", access.permit.site_location)
      .eq("asset_reference", access.permit.asset_reference)
      .neq("id", id)
      .in("status", [
        "awaiting_verification",
        "awaiting_acceptance",
        "issued",
        "handover_required",
      ]),
  ]);

  if (permitResult.error) {
    throw new Error(permitResult.error.message);
  }

  const item = permitResult.data;
  const isolations = isolationResult.data || [];
  const tests = testResult.data || [];
  const handovers = handoverResult.data || [];
  const events = eventResult.data || [];
  const conflicts = conflictResult.data || [];

  const status = effectivePermitStatus(item);
  const definition = PERMIT_STATUSES[status];
  const rule = getPermitRule(item.permit_type);

  const issue = getIssueReadiness({
    permit: item,
    rule,
    isolations,
    atmosphereTests: tests,
    relatedConflicts: conflicts,
  });

  const close = getCloseReadiness({
    permit: item,
    isolations,
  });

  const selected = item.permit_specific_controls?.selected || [];
  const values = item.permit_specific_controls?.values || [];

  const labels = new Map(
    [...COMMON_CONTROLS, ...rule.controls].map((control) => [
      control.key,
      control.label,
    ]),
  );

  return (
    <main className="pcPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .pcPage {
          min-height: 100vh;
          padding: 30px 22px 90px;
          background: #edf4f8;
          color: #071d3a;
          font-family: Arial, sans-serif;
        }

        .pcShell {
          width: 100%;
          max-width: 1500px;
          margin: auto;
        }

        .pcTop {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .pcTop small {
          color: #087f6c;
          font-weight: 900;
          letter-spacing: 0.09em;
        }

        .pcTop h1 {
          max-width: 900px;
          margin: 6px 0;
          font-size: 31px;
        }

        .pcTop p,
        .pcPanel > p {
          color: #647b91;
        }

        .pcTopLinks {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .pcBack,
        .pcButton {
          padding: 11px 15px;
          border: 0;
          border-radius: 9px;
          background: #fff;
          color: #173b59;
          text-decoration: none;
          font-weight: 850;
          cursor: pointer;
        }

        .pcBack.primary {
          background: #087f6c;
          color: #fff;
        }

        .pcStatus {
          margin: 22px 0;
          padding: 20px;
          border-radius: 15px;
          background: #566b7d;
          color: #fff;
        }

        .pcStatus.green {
          background: #087f6c;
        }

        .pcStatus.blue {
          background: #1762a3;
        }

        .pcStatus.amber {
          background: #9a5c13;
        }

        .pcStatus.red {
          background: #a3372d;
        }

        .pcStatus strong {
          display: block;
          font-size: 24px;
        }

        .pcGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .pcBox,
        .pcPanel {
          border: 1px solid #d4e1e9;
          border-radius: 13px;
          background: #fff;
        }

        .pcBox {
          padding: 15px;
          overflow-wrap: anywhere;
        }

        .pcBox span {
          display: block;
          font-size: 10px;
          color: #698095;
          font-weight: 850;
        }

        .pcBox strong {
          display: block;
          margin-top: 5px;
        }

        .pcPanel {
          margin-top: 14px;
          padding: 21px;
        }

        .pcPanel h2 {
          margin: 0 0 5px;
        }

        .pcTwo,
        .pcActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pcRecord,
        .pcItem {
          padding: 12px;
          border-radius: 9px;
          background: #f0f5f8;
          overflow-wrap: anywhere;
        }

        .pcRecord span {
          display: block;
          font-size: 10px;
          color: #687f93;
          font-weight: 850;
        }

        .pcList {
          display: grid;
          gap: 8px;
        }

        .pcItem.ok {
          border-left: 4px solid #087f6c;
        }

        .pcItem.block {
          border-left: 4px solid #c44836;
          background: #fff1ed;
        }

        .pcItem.warn {
          border-left: 4px solid #d48713;
          background: #fff7e5;
        }

        .pcAction {
          display: grid;
          gap: 8px;
          padding: 13px;
          border: 1px solid #d6e1e9;
          border-radius: 11px;
        }

        .pcAction label {
          display: grid;
          gap: 5px;
          font-size: 12px;
          font-weight: 850;
        }

        .pcAction textarea {
          min-height: 68px;
          padding: 9px;
          border: 1px solid #cad8e3;
          border-radius: 8px;
        }

        .pcButton {
          color: #fff;
          background: #1762a3;
        }

        .pcButton.green {
          background: #087f6c;
        }

        .pcButton.amber {
          background: #b36b10;
        }

        .pcButton.red {
          background: #a3372d;
        }

        .pcButton.dark {
          background: #173b59;
        }

        .pcEvent {
          display: grid;
          grid-template-columns: 170px 180px 1fr;
          gap: 12px;
          padding: 11px;
          border-top: 1px solid #e1e9ef;
          font-size: 13px;
        }

        @media (max-width: 760px) {
          .pcGrid,
          .pcTwo,
          .pcActions {
            grid-template-columns: 1fr 1fr;
          }

          .pcEvent {
            grid-template-columns: 1fr;
          }

          .pcTopLinks {
            justify-content: flex-start;
          }
        }

        @media (max-width: 480px) {
          .pcPage {
            padding: 20px 12px 70px;
          }

          .pcGrid,
          .pcTwo,
          .pcActions {
            grid-template-columns: 1fr;
          }

          .pcTop h1 {
            font-size: 27px;
          }

          .pcTopLinks {
            width: 100%;
          }

          .pcTopLinks a {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>

      <div className="pcShell">
        <header className="pcTop">
          <div>
            <small>
              {item.permit_reference} · {title(item.permit_type)} · VERSION{" "}
              {item.version || 1}
            </small>

            <h1>{item.task_description}</h1>

            <p>
              {item.site_location} ·{" "}
              {item.asset_reference || item.equipment_asset}
            </p>
          </div>

          <nav className="pcTopLinks" aria-label="Permit actions">
            <Link className="pcBack" href="/portal/health-safety/permits">
              ← Register
            </Link>

            <Link
              className="pcBack primary"
              href={`/portal/health-safety/permits/${id}/controls`}
            >
              Safety controls
            </Link>

            <Link
              className="pcBack"
              href={`/portal/health-safety/permits/${id}/documents`}
            >
              Evidence
            </Link>

            <Link
              className="pcBack"
              href={`/portal/health-safety/permits/${id}/print`}
            >
              Print / PDF
            </Link>
          </nav>
        </header>

        <section className={`pcStatus ${definition.tone}`}>
          <strong>{definition.label}</strong>
          <span>{statusMessage(status, item)}</span>
        </section>

        <section className="pcGrid">
          {[
            ["VALID FROM", date(item.valid_from)],
            ["VALID UNTIL", date(item.valid_until)],
            ["ISSUER", item.issuer_name],
            ["PERSON IN CHARGE", item.receiver_name],
          ].map(([label, value]) => (
            <div className="pcBox" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className="pcPanel">
          <h2>Work scope</h2>
          <p>The authority applies only to these recorded limits.</p>

          <div className="pcTwo">
            {[
              [
                "WORK AREA / ASSET",
                `${item.work_area} · ${
                  item.asset_reference || item.equipment_asset
                }`,
              ],
              [
                "RISK ASSESSMENT",
                item.hs_risk_assessments
                  ? `${item.hs_risk_assessments.assessment_reference} — ${item.hs_risk_assessments.title}`
                  : "Not available",
              ],
              ["SCOPE LIMITS", item.scope_limits],
              ["STOP-WORK CONDITIONS", item.stop_work_conditions],
              [
                "PROHIBITED WORK",
                item.prohibited_work || "No additional prohibition recorded",
              ],
              [
                "CONTRACTOR",
                item.contractor_company || "Internal work party",
              ],
            ].map(([label, value]) => (
              <div className="pcRecord" key={label}>
                <span>{label}</span>
                <strong>{value || "Not recorded"}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="pcPanel">
          <h2>{rule.title}</h2>
          <p>{rule.guidance}</p>

          <div className="pcList">
            {selected.map((key) => (
              <div className="pcItem ok" key={key}>
                {labels.get(key) || title(key)}
              </div>
            ))}

            {Object.entries(values)
              .filter(([, value]) => value !== null && value !== "")
              .map(([key, value]) => (
                <div className="pcItem" key={key}>
                  <strong>{title(key)}:</strong> {String(value)}
                </div>
              ))}
          </div>
        </section>

        <section className="pcPanel">
          <h2>Readiness and coordination</h2>
          <p>The permit cannot become active while a blocker remains.</p>

          <div className="pcList">
            {issue.ready ? (
              <div className="pcItem ok">
                All applicable issue checks are satisfied.
              </div>
            ) : (
              issue.blockers.map((value) => (
                <div className="pcItem block" key={value}>
                  {value}
                </div>
              ))
            )}

            {conflicts.map((value) => (
              <div className="pcItem warn" key={value.id}>
                Potential conflict: {value.permit_reference} —{" "}
                {value.task_description}
              </div>
            ))}
          </div>

          <div className="pcGrid" style={{ marginTop: 12 }}>
            {[
              ["ISOLATIONS", isolations.length],
              ["ATMOSPHERE TESTS", tests.length],
              ["HANDOVERS", handovers.length],
              ["RELATED PERMITS", conflicts.length],
            ].map(([label, value]) => (
              <div className="pcBox" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="pcPanel">
          <h2>Permit control</h2>
          <p>
            Only actions available to your role and the present status are
            shown.
          </p>

          <div className="pcActions">
            {status === "draft" && mayEditPermit(access) && (
              <Action
                id={id}
                intent="submit_verification"
                label="Submit for verification"
              />
            )}

            {status === "awaiting_verification" &&
              mayVerifyPermit(access) && (
                <Action
                  id={id}
                  intent="verify"
                  label="Complete verification"
                  tone="green"
                />
              )}

            {status === "awaiting_acceptance" &&
              mayReceivePermit(access) &&
              !item.receiver_accepted_at && (
                <Action
                  id={id}
                  intent="accept_receiver"
                  label="Accept control of work"
                  tone="green"
                />
              )}

            {status === "awaiting_acceptance" &&
              mayIssuePermit(access) && (
                <Action
                  id={id}
                  intent="issue"
                  label="Issue permit"
                  tone="green"
                />
              )}

            {status === "issued" && mayEditPermit(access) && (
              <Action
                id={id}
                intent="suspend"
                label="Suspend permit"
                tone="amber"
                field="Reason and safe condition"
              />
            )}

            {status === "issued" && mayEditPermit(access) && (
              <Action
                id={id}
                intent="request_handover"
                label="Start handover"
                tone="amber"
                field="Work state and outstanding controls"
              />
            )}

            {status === "issued" && mayReceivePermit(access) && (
              <Action
                id={id}
                intent="complete_work"
                label="Declare work complete"
                tone="dark"
                field="Completion confirmation"
                confirmation
              />
            )}

            {status === "awaiting_handback" &&
              mayAcceptHandback(access) && (
                <Action
                  id={id}
                  intent="accept_handback"
                  label="Accept hand-back and close"
                  tone="dark"
                  field="Reinstatement confirmation"
                  confirmation
                />
              )}

            {[
              "draft",
              "awaiting_verification",
              "awaiting_acceptance",
              "suspended",
              "handover_required",
              "expired",
            ].includes(status) &&
              mayIssuePermit(access) && (
                <Action
                  id={id}
                  intent="cancel"
                  label="Cancel permit"
                  tone="red"
                  field="Cancellation reason"
                />
              )}
          </div>

          {status === "awaiting_handback" && !close.ready && (
            <div className="pcList" style={{ marginTop: 12 }}>
              {close.blockers.map((value) => (
                <div className="pcItem block" key={value}>
                  {value}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pcPanel">
          <h2>Audit trail</h2>
          <p>Chronological evidence of permit decisions.</p>

          {events.length ? (
            events.map((value) => (
              <div className="pcEvent" key={value.id}>
                <strong>{date(value.created_at)}</strong>
                <span>{value.actor_name}</span>
                <span>
                  {title(value.event_type)}
                  {value.reason ? ` — ${value.reason}` : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="pcItem">
              No lifecycle events recorded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
