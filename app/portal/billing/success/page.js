import Link from "next/link";

export const metadata = {
  title: "Subscription Successful",
};

export default function BillingSuccessPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        padding: "40px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          maxWidth: "700px",
          width: "100%",
          borderRadius: "18px",
          padding: "50px",
          textAlign: "center",
          boxShadow:
            "0 15px 40px rgba(0,0,0,.08)",
        }}
      >
        <div
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            background: "#18b66b",
            color: "#ffffff",
            fontSize: "46px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 25px",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            color: "#071A33",
            marginBottom: "20px",
          }}
        >
          Welcome to RPG Intelligence
        </h1>

        <p
          style={{
            fontSize: "19px",
            color: "#617087",
            lineHeight: 1.7,
            marginBottom: "35px",
          }}
        >
          Your subscription has been
          created successfully.

          <br />
          <br />

          Your 7-day free trial has now
          started.

          <br />
          <br />

          You can begin creating
          organisations, completing ISO
          assessments and generating
          Executive Reports immediately.
        </p>

        <div
          style={{
            display: "flex",
            gap: "15px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/portal"
            style={{
              background: "#1459D9",
              color: "#ffffff",
              padding: "14px 24px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Go to Dashboard
          </Link>

          <Link
            href="/portal/history"
            style={{
              background: "#071A33",
              color: "#ffffff",
              padding: "14px 24px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Assessment History
          </Link>
        </div>

        <hr
          style={{
            margin: "40px 0",
            border: 0,
            borderTop:
              "1px solid #e2e8f0",
          }}
        />

        <h3
          style={{
            color: "#071A33",
          }}
        >
          What happens next?
        </h3>

        <div
          style={{
            textAlign: "left",
            marginTop: "20px",
            lineHeight: 2,
            color: "#617087",
          }}
        >
          ✅ Create your organisation

          <br />

          ✅ Complete an assessment

          <br />

          ✅ Review your Business Assurance Score

          <br />

          ✅ Generate an Executive Summary

          <br />

          ✅ Download your PDF Report

          <br />

          ✅ Receive AI recommendations
        </div>
      </div>
    </main>
  );
}
