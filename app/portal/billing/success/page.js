import Link from "next/link";
import Stripe from "stripe";

export const metadata = { title: "Payment Successful" };
export const dynamic = "force-dynamic";

async function getCheckout(sessionId) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Unable to retrieve successful checkout:", error);
    return null;
  }
}

export default async function BillingSuccessPage({ searchParams }) {
  const query = await searchParams;
  const sessionId = Array.isArray(query?.session_id) ? query.session_id[0] : query?.session_id;
  const session = await getCheckout(sessionId);
  const purchaseType = session?.metadata?.purchase_type;
  const isAssessment = purchaseType === "single_assessment";
  const isStandaloneSoa = purchaseType === "standalone_soa";
  const isTraining = purchaseType === "training_course";
  const standard = session?.metadata?.standard;
  const courseCode = session?.metadata?.course_code;

  const title = isTraining
    ? "Your training course is ready"
    : isStandaloneSoa
      ? "Your standalone SoA is ready"
      : isAssessment
        ? "Your assessment is ready"
        : "Welcome to RPG Intelligence";

  const description = isTraining
    ? "Your payment was successful and your personal training access is being activated."
    : isStandaloneSoa
      ? "Your one-time payment for the ISO/IEC 27001 Statement of Applicability workspace was successful."
      : isAssessment
        ? `Your one-time payment for the ${standard || "selected ISO"} assessment was successful.`
        : "Your subscription has been created successfully and your 7-day free trial has started.";

  const primaryHref = isTraining
    ? "/portal/health-safety/training"
    : isStandaloneSoa
      ? "/portal#standalone-soa"
      : isAssessment && standard
        ? `/portal?standard=${encodeURIComponent(standard)}#new-assessment`
        : "/portal";

  const primaryLabel = isTraining
    ? "Open My Training"
    : isStandaloneSoa
      ? "Create Standalone SoA"
      : isAssessment
        ? "Start Assessment"
        : "Go to Dashboard";

  const secondaryHref = isTraining
    ? "/en/hs-hub/training"
    : isStandaloneSoa
      ? "/portal/soa"
      : "/portal/history";

  const secondaryLabel = isTraining
    ? "Training Catalogue"
    : isStandaloneSoa
      ? "SoA Register"
      : "Assessment History";

  return (
    <main style={{ minHeight: "100vh", background: "#f4f7fb", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif", padding: 40 }}>
      <div style={{ background: "#fff", maxWidth: 700, width: "100%", borderRadius: 18, padding: 50, textAlign: "center", boxShadow: "0 15px 40px rgba(0,0,0,.08)" }}>
        <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#18b66b", color: "#fff", fontSize: 46, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 25px" }}>✓</div>
        <h1 style={{ color: "#071A33", marginBottom: 20 }}>{title}</h1>
        <p style={{ fontSize: 19, color: "#617087", lineHeight: 1.7, marginBottom: 35 }}>{description}</p>

        {isTraining && (
          <div style={{ background: "#eef6ff", border: "1px solid #cbdff8", borderRadius: 12, padding: 20, marginBottom: 30, color: "#173c67", lineHeight: 1.7 }}>
            <strong>{courseCode || "RPG Health & Safety Training"}</strong>
            <br />
            Your course includes 12 months of learner access, the final assessment and a verifiable certificate after you pass.
          </div>
        )}

        {(isAssessment || isStandaloneSoa) && (
          <div style={{ background: "#eef6ff", border: "1px solid #cbdff8", borderRadius: 12, padding: 20, marginBottom: 30, color: "#173c67", lineHeight: 1.7 }}>
            <strong>{isStandaloneSoa ? "ISO/IEC 27001:2022 · 93 Annex A controls" : standard}</strong>
            <br />
            {isStandaloneSoa
              ? "You have 30 days to complete and approve the SoA. Its executive report and controlled PDF remain available afterward as read-only records."
              : "You have 30 days to complete the assessment and 90 days to manage findings, linked CAPA or 8D actions and effectiveness verification. Your assessment and report remain available afterward as read-only records."}
          </div>
        )}

        <div style={{ display: "flex", gap: 15, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={primaryHref} style={{ background: "#1459D9", color: "#fff", padding: "14px 24px", borderRadius: 10, fontWeight: 700 }}>{primaryLabel}</Link>
          <Link href={secondaryHref} style={{ background: "#071A33", color: "#fff", padding: "14px 24px", borderRadius: 10, fontWeight: 700 }}>{secondaryLabel}</Link>
        </div>

        <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid #e2e8f0" }} />
        <h3 style={{ color: "#071A33" }}>What happens next?</h3>
        <div style={{ textAlign: "left", margin: "20px auto 0", maxWidth: 470, lineHeight: 2, color: "#617087" }}>
          {isTraining ? (
            <>
              <div>✅ Open your course from My Training</div>
              <div>✅ Complete each module in order</div>
              <div>✅ Take the final knowledge assessment</div>
              <div>✅ Achieve the required pass mark</div>
              <div>✅ Download your verifiable certificate</div>
            </>
          ) : isStandaloneSoa ? (
            <>
              <div>✅ Create your dedicated SoA workspace</div>
              <div>✅ Review all 93 Annex A controls</div>
              <div>✅ Record applicability, evidence and residual risk</div>
              <div>✅ Complete governance and approval</div>
              <div>✅ Generate the executive summary and controlled PDF</div>
            </>
          ) : isAssessment ? (
            <>
              <div>✅ Open your purchased standard</div>
              <div>✅ Complete the clause-by-clause assessment</div>
              <div>✅ Record evidence and controlled findings</div>
              <div>✅ Route findings to Management Action, CAPA or 8D</div>
              <div>✅ Verify corrective-action effectiveness</div>
              <div>✅ Generate and retain your assessment report</div>
            </>
          ) : (
            <>
              <div>✅ Create your organisation</div>
              <div>✅ Complete an assessment</div>
              <div>✅ Review your Business Assurance Score</div>
              <div>✅ Generate an Executive Summary</div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

