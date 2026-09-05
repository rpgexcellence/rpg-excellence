import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { createRcaCase } from "./actions";

const label = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const severityColour = {
  critical: "#b42318",
  high: "#c4320a",
  medium: "#b54708",
  low: "#175cd3",
};

export default async function RcaCommandCentre({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const requestedView =
    typeof resolvedSearchParams?.view === "string"
      ? resolvedSearchParams.view
      : "register";
  const activeView = [
    "register",
    "management-board",
    "open",
    "verification",
    "closed",
  ].includes(requestedView)
    ? requestedView
    : "register";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const [organizationsResult, casesResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("name"),
      supabase
        .from("rca_cases")
        .select(
          `
            id,
            case_reference,
            title,
            source_type,
            severity,
            status,
            current_discipline,
            target_close_date,
            updated_at,
            organization_id
          `
        )
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

  if (organizationsResult.error) {
    throw new Error(organizationsResult.error.message);
  }

  if (casesResult.error) {
    throw new Error(casesResult.error.message);
  }

  const organizations = organizationsResult.data ?? [];
  const cases = casesResult.data ?? [];
  const organizationNames = new Map(
    organizations.map((organization) => [
      organization.id,
      organization.name,
    ])
  );
  const openCases = cases.filter(
    (item) =>
      !["closed", "cancelled"].includes(item.status)
  );
  const criticalOpen = openCases.filter(
    (item) => item.severity === "critical"
  ).length;
  const effectivenessReview = cases.filter(
    (item) => item.status === "effectiveness_review"
  ).length;
  const closedCases = cases.filter(
    (item) => item.status === "closed"
  ).length;
  const visibleCases =
    activeView === "open"
      ? openCases
      : activeView === "verification"
        ? cases.filter(
            (item) =>
              item.status === "effectiveness_review" ||
              item.current_discipline === 6
          )
        : activeView === "closed"
          ? cases.filter((item) => item.status === "closed")
          : cases;
  const portfolioTitle = {
    register: "All CAPA-8D cases",
    "management-board": "CAPA management portfolio",
    open: "Open CAPA-8D cases",
    verification: "Cases awaiting effectiveness verification",
    closed: "Closed CAPA-8D cases",
  }[activeView];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6fa",
        color: "#061a35",
        padding: "48px 24px 80px",
      }}
    >
      <div
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "24px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link
              href="/en"
              aria-label="RPG Excellence home"
              style={{
                width: "260px",
                height: "70px",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                textDecoration: "none",
                marginBottom: "22px",
              }}
            >
              <img
                src="/rpg-excellence-logo.png"
                alt="RPG Excellence"
                style={{
                  display: "block",
                  width: "260px",
                  maxWidth: "260px",
                  height: "70px",
                  maxHeight: "70px",
                  objectFit: "contain",
                  objectPosition: "left center",
                }}
              />
            </Link>

            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "clamp(34px, 5vw, 56px)",
              }}
            >
              8D Command Centre
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "800px",
                color: "#52657f",
                fontSize: "19px",
                lineHeight: 1.6,
              }}
            >
              Every recurring problem leaves a pattern. The
              controlled 8D workflow turns that pattern into
              evidence—protecting operations now, proving the
              root cause and preventing the problem from returning.
            </p>
          </div>

          <Link
            href="/portal"
            style={{
              padding: "15px 20px",
              border: "1px solid #d5deea",
              borderRadius: "12px",
              color: "#061a35",
              background: "white",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ← Customer Portal
          </Link>
        </div>

        <section
          style={{
            marginTop: "34px",
            background: "#061a35",
            color: "white",
            borderRadius: "24px",
            padding: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#9fb2cb",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "13px",
                }}
              >
                Corrective Action Intelligence
              </div>
              <h2
                style={{
                  margin: "8px 0 6px",
                  fontSize: "30px",
                }}
              >
                Challenge assumptions. Prove causes.
                Verify effectiveness.
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "#c7d4e5",
                  maxWidth: "850px",
                  lineHeight: 1.6,
                }}
              >
                Move beyond closing actions. Challenge assumptions,
                distinguish occurrence, escape and systemic causes,
                and demonstrate sustained effectiveness. AI may
                expose gaps; accountable people retain every decision.
              </p>
            </div>
            <div
              style={{
                fontSize: "72px",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              8D
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          {[
            ["Open cases", openCases.length],
            ["Critical open", criticalOpen],
            ["Effectiveness review", effectivenessReview],
            ["Closed", closedCases],
          ].map(([title, value]) => (
            <div
              key={title}
              style={{
                background: "white",
                border: "1px solid #dce4ee",
                borderRadius: "16px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  color: "#607089",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {title}
              </div>
              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  fontSize: "34px",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>

        <section
          style={{
            marginTop: "28px",
            background: "white",
            border: "1px solid #dce4ee",
            borderRadius: "20px",
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: "#155eef",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                New investigation
              </div>
              <h2 style={{ margin: "6px 0" }}>
                Start a standalone 8D case
              </h2>
            </div>
          </div>

          {organizations.length === 0 ? (
            <div
              style={{
                marginTop: "18px",
                padding: "18px",
                borderRadius: "12px",
                background: "#fff7e8",
                color: "#7a4e00",
              }}
            >
              Create an organisation in the customer portal
              before starting an 8D case. {" "}
              <Link href="/portal">Open portal →</Link>
            </div>
          ) : (
            <form action={createRcaCase}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: "14px",
                  marginTop: "20px",
                }}
              >
                <select
                  name="organization_id"
                  required
                  defaultValue=""
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    Select organisation
                  </option>
                  {organizations.map((organization) => (
                    <option
                      value={organization.id}
                      key={organization.id}
                    >
                      {organization.name}
                    </option>
                  ))}
                </select>

                <select
                  name="source_type"
                  defaultValue="standalone"
                  style={fieldStyle}
                >
                  <option value="standalone">
                    Standalone problem
                  </option>
                  <option value="audit">Audit</option>
                  <option value="complaint">
                    Complaint
                  </option>
                  <option value="incident">Incident</option>
                  <option value="defect">Defect</option>
                  <option value="supplier">
                    Supplier issue
                  </option>
                </select>

                <select
                  name="severity"
                  defaultValue="medium"
                  style={fieldStyle}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <input
                name="title"
                required
                placeholder="Short problem title"
                style={{ ...fieldStyle, marginTop: "14px" }}
              />

              <textarea
                name="problem_statement"
                rows={4}
                placeholder="What happened? State only the known facts; D2 will develop the verified problem definition."
                style={{
                  ...fieldStyle,
                  marginTop: "14px",
                  resize: "vertical",
                }}
              />

              <button
                type="submit"
                style={{
                  marginTop: "16px",
                  border: 0,
                  borderRadius: "12px",
                  background: "#155eef",
                  color: "white",
                  padding: "15px 22px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Create 8D Case
              </button>
            </form>
          )}
        </section>

        <section style={{ marginTop: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#155eef",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Investigation portfolio
              </div>
              <h2 style={{ margin: "6px 0" }}>
                {portfolioTitle}
              </h2>
            </div>
          </div>

          {visibleCases.length === 0 ? (
            <div
              style={{
                marginTop: "16px",
                background: "white",
                border: "1px solid #dce4ee",
                borderRadius: "18px",
                padding: "32px",
                color: "#607089",
              }}
            >
              No cases match this view.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              {visibleCases.map((item) => (
                <Link
                  href={`/portal/rca/${item.id}`}
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1fr) auto",
                    gap: "18px",
                    alignItems: "center",
                    padding: "22px",
                    background: "white",
                    border: "1px solid #dce4ee",
                    borderRadius: "16px",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: "20px" }}>
                        {item.case_reference} · {item.title}
                      </strong>
                      <span
                        style={{
                          color:
                            severityColour[item.severity] ??
                            "#607089",
                          fontWeight: 800,
                        }}
                      >
                        {label(item.severity)}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#607089",
                      }}
                    >
                      {organizationNames.get(
                        item.organization_id
                      ) ??
                        "Organisation"}
                      {" · "}
                      {label(item.source_type)}
                      {" · "}
                      Updated {formatDate(item.updated_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong
                      style={{
                        display: "block",
                        color: "#155eef",
                        fontSize: "20px",
                      }}
                    >
                      D{item.current_discipline}
                    </strong>
                    <span style={{ color: "#607089" }}>
                      {label(item.status)} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cfdae8",
  borderRadius: "10px",
  background: "white",
  color: "#061a35",
  padding: "14px 15px",
  font: "inherit",
};
