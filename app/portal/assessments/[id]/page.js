import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";

export default async function AssessmentPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !assessment) {
    redirect("/portal");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            color: "#1459D9",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          RPG Intelligence
        </p>

        <h1
          style={{
            color: "#071A33",
            marginBottom: "8px",
          }}
        >
          {assessment.standard} Assessment
        </h1>

        <p
          style={{
            color: "#617087",
            marginBottom: "30px",
          }}
        >
          Status: <strong>{assessment.status}</strong>
        </p>

        <section
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "14px",
            boxShadow: "0 10px 30px rgba(7, 26, 51, 0.06)",
          }}
        >
          <div
            style={{
              marginBottom: "28px",
              paddingBottom: "18px",
              borderBottom: "1px solid #e6ebf1",
            }}
          >
            <p
              style={{
                color: "#1459D9",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              CLAUSE 4
            </p>

            <h2
              style={{
                color: "#071A33",
                margin: 0,
              }}
            >
              Context of the Organization
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "30px",
            }}
          >
            <div>
              <h3
                style={{
                  color: "#071A33",
                  marginBottom: "10px",
                }}
              >
                4.1 Understanding the organization and its context
              </h3>

              <p
                style={{
                  color: "#617087",
                  lineHeight: 1.6,
                  marginBottom: "14px",
                }}
              >
                Has the organization determined the internal and external issues
                relevant to its purpose and strategic direction?
              </p>

              <select
                name="score_4_1"
                defaultValue=""
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d8e0ea",
                  background: "#fff",
                }}
              >
                <option value="" disabled>
                  Select score
                </option>
                <option value="0">0 — Not addressed</option>
                <option value="1">1 — Initial</option>
                <option value="2">2 — Partially implemented</option>
                <option value="3">3 — Implemented</option>
                <option value="4">4 — Effective</option>
                <option value="5">5 — Best practice</option>
              </select>

              <textarea
                name="evidence_4_1"
                placeholder="Evidence or notes"
                rows="4"
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d8e0ea",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                borderTop: "1px solid #e6ebf1",
                paddingTop: "26px",
              }}
            >
              <h3
                style={{
                  color: "#071A33",
                  marginBottom: "10px",
                }}
              >
                4.2 Needs and expectations of interested parties
              </h3>

              <p
                style={{
                  color: "#617087",
                  lineHeight: 1.6,
                  marginBottom: "14px",
                }}
              >
                Has the organization identified relevant interested parties and
                their applicable requirements?
              </p>

              <select
                name="score_4_2"
                defaultValue=""
                style={{
                  width: "100%",
                  maxWidth: "360px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d8e0ea",
                  background: "#fff",
                }}
              >
                <option value="" disabled>
                  Select score
                </option>
                <option value="0">0 — Not addressed</option>
                <option value="1">1 — Initial</option>
                <option value="2">2 — Partially implemented</option>
                <option value="3">3 — Implemented</option>
                <option value="4">4 — Effective</option>
                <option value="5">5 — Best practice</option>
              </select>

              <textarea
                name="evidence_4_2"
                placeholder="Evidence or notes"
                rows="4"
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #d8e0ea",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "32px",
              paddingTop: "22px",
              borderTop: "1px solid #e6ebf1",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/portal"
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border: "1px solid #d8e0ea",
                color: "#071A33",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Back to Dashboard
            </a>

            <button
              type="button"
              disabled
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border: "none",
                background: "#c8d2df",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "not-allowed",
              }}
            >
              Save Answers — Next Step
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
