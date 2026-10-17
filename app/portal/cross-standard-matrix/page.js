import Link from "next/link";
import CrossStandardMatrix from "../../../components/CrossStandardMatrix";
import { loadCrossStandardMatrix } from "../../../lib/cross-standard-matrix";
import { requireOrganizationAccess } from "../../../lib/organization-access";
import { requirePlanAccess } from "../../../lib/plan-access";

export const metadata = {
  title:
    "Cross-Standard Matrix | RPG Excellence",
};

export const dynamic = "force-dynamic";

export default async function CrossStandardMatrixPage() {
  const access =
    await requireOrganizationAccess(
      "assessments",
      "view",
      "/portal/cross-standard-matrix",
    );

  const { organization, user } = access;

  await requirePlanAccess(
    user,
    "professional",
    "Cross-Standard Matrix",
  );

  const data =
    await loadCrossStandardMatrix(
      organization,
    );

  const controlled = data.groups.filter(
    (group) => group.control,
  ).length;

  const effective = data.groups.filter(
    (group) =>
      group.control
        ?.implementation_status ===
      "effective",
  ).length;

  const gaps = data.groups.filter(
    (group) =>
      group.control
        ?.implementation_status ===
      "gap",
  ).length;

  const assessmentLinks =
    data.groups
      .flatMap(
        (group) => group.requirements,
      )
      .filter(
        (item) => item.assessment,
      ).length;

  return (
    <main className="matrixPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .matrixPage {
          min-height: 100vh;
          padding: 32px clamp(16px, 4vw, 60px) 72px;
          background: #edf3f9;
          color: #071b35;
        }

        .matrixShell {
          max-width: 1500px;
          margin: 0 auto;
        }

        .matrixTop {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .matrixTop small {
          display: block;
          color: #5b43df;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .matrixTop h1 {
          margin: 6px 0 8px;
          font-size: clamp(32px, 4vw, 50px);
          letter-spacing: -0.045em;
        }

        .matrixTop p {
          max-width: 900px;
          margin: 0;
          color: #5d748c;
          line-height: 1.55;
        }

        .matrixActions {
          display: flex;
          gap: 9px;
        }

        .matrixActions a {
          padding: 12px 15px;
          border: 1px solid #c6d5e5;
          border-radius: 10px;
          background: #fff;
          color: #0a2d53;
          text-decoration: none;
          font-weight: 900;
          white-space: nowrap;
        }

        .matrixHero {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(300px, 0.65fr);
          gap: 28px;
          margin-top: 24px;
          padding: 34px 36px;
          border-radius: 22px;
          background:
            linear-gradient(
              120deg,
              #061c3a,
              #0a4177
            );
          color: #fff;
          box-shadow:
            0 18px 45px #071b351d;
        }

        .matrixHero span {
          color: #59e2d7;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.11em;
        }

        .matrixHero h2 {
          margin: 7px 0 10px;
          color: #fff;
          font-size: 31px;
        }

        .matrixHero p {
          max-width: 790px;
          margin: 0;
          color: #d4e2ef;
          line-height: 1.6;
        }

        .matrixHeroGuide {
          padding: 20px;
          border:
            1px solid #ffffff26;
          border-radius: 15px;
          background: #ffffff0d;
        }

        .matrixHeroGuide strong,
        .matrixHeroGuide small {
          display: block;
        }

        .matrixHeroGuide small {
          margin-top: 8px;
          color: #bdd0e3;
          line-height: 1.5;
        }

        .matrixMetrics {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 13px;
          margin: 16px 0;
        }

        .matrixMetrics div {
          padding: 19px 21px;
          border:
            1px solid #d4e0eb;
          border-radius: 15px;
          background: #fff;
        }

        .matrixMetrics strong,
        .matrixMetrics span {
          display: block;
        }

        .matrixMetrics strong {
          font-size: 30px;
        }

        .matrixMetrics span {
          margin-top: 4px;
          color: #697f95;
          font-size: 12px;
        }

        .matrixToolbar {
          display: grid;
          grid-template-columns:
            1.3fr 0.8fr auto;
          gap: 14px;
          align-items: end;
          padding: 20px 22px;
          border:
            1px solid #d2dfeb;
          border-radius: 16px;
          background: #fff;
        }

        .matrixToolbar label {
          display: grid;
          gap: 6px;
        }

        .matrixToolbar label span {
          font-size: 12px;
          font-weight: 900;
        }

        .matrixToolbar input,
        .matrixToolbar select,
        .matrixControlForm input,
        .matrixControlForm select,
        .matrixControlForm textarea,
        .matrixEvidenceForm input {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border:
            1px solid #c7d6e5;
          border-radius: 9px;
          background: #fff;
          color: #071b35;
          font: inherit;
        }

        .matrixToolbar > div {
          min-width: 150px;
          padding: 7px 13px;
          border-left:
            1px solid #dce5ee;
        }

        .matrixToolbar > div strong,
        .matrixToolbar > div span {
          display: block;
        }

        .matrixToolbar > div strong {
          font-size: 25px;
        }

        .matrixToolbar > div span {
          color: #708398;
          font-size: 11px;
        }

        .matrixList {
          display: grid;
          gap: 13px;
          margin-top: 15px;
        }

        .matrixGroup {
          overflow: hidden;
          border:
            1px solid #d2dfeb;
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 8px 25px #071b3508;
        }

        .matrixGroup[open] {
          box-shadow:
            0 16px 38px #071b3512;
        }

        .matrixGroup > summary {
          display: grid;
          grid-template-columns:
            74px minmax(0, 1fr)
            auto 25px;
          gap: 17px;
          align-items: center;
          padding: 21px 23px;
          cursor: pointer;
          list-style: none;
        }

        .matrixGroup
          > summary::-webkit-details-marker {
          display: none;
        }

        .matrixCode {
          display: grid;
          place-items: center;
          min-height: 48px;
          border-radius: 11px;
          background: #e9f0ff;
          color: #245ee7;
          font-weight: 950;
        }

        .matrixGroup summary small,
        .matrixGroup summary strong,
        .matrixGroup summary p {
          display: block;
        }

        .matrixGroup summary small {
          color: #647b93;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .matrixGroup summary strong {
          margin: 3px 0;
          font-size: 17px;
        }

        .matrixGroup summary p {
          margin: 0;
          color: #6a7f95;
          font-size: 13px;
        }

        .matrixGroup summary > b {
          font-size: 22px;
        }

        .matrixStatus {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef1f4;
          color: #697583;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .matrixStatus.gap {
          background: #ffebe8;
          color: #ad2b20;
        }

        .matrixStatus.developing {
          background: #fff4d9;
          color: #886000;
        }

        .matrixStatus.implemented {
          background: #e8f1ff;
          color: #1755bd;
        }

        .matrixStatus.effective {
          background: #e4f8ed;
          color: #087047;
        }

        .matrixBody {
          padding: 0 23px 24px;
          border-top:
            1px solid #e4ebf2;
        }

        .matrixGuidance {
          margin: 19px 0;
          padding: 17px 19px;
          border-left:
            4px solid #18a99c;
          border-radius: 10px;
          background: #edf8f6;
        }

        .matrixGuidance strong,
        .matrixGuidance small {
          display: block;
        }

        .matrixGuidance p {
          margin: 5px 0;
          color: #385d61;
        }

        .matrixGuidance small {
          color: #5f797c;
        }

        .matrixRequirements {
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .matrixRequirements > article {
          display: flex;
          flex-direction: column;
          min-height: 255px;
          padding: 16px;
          border:
            1px solid #d7e2ec;
          border-radius: 13px;
          background: #fbfdff;
        }

        .matrixRequirements article header {
          display: flex;
          justify-content:
            space-between;
          gap: 8px;
        }

        .matrixRequirements
          article
          header
          strong {
          font-size: 13px;
        }

        .matrixRequirements
          article
          header
          span {
          color: #74889c;
          font-size: 10px;
        }

        .matrixRequirements article > b {
          margin-top: 12px;
          color: #244f7f;
          font-size: 12px;
        }

        .matrixRequirements article > p {
          flex: 1;
          margin: 6px 0 10px;
          color: #4e667e;
          font-size: 12px;
          line-height: 1.45;
        }

        .matrixRelationship {
          align-self: flex-start;
          padding: 4px 7px;
          border-radius: 999px;
          background: #eaf1ff;
          color: #2257bc;
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .matrixRelationship.standard_specific {
          background: #fff0dc;
          color: #8d5900;
        }

        .matrixAssessment {
          display: grid;
          gap: 2px;
          margin-top: 11px;
          padding: 9px;
          border-radius: 8px;
          background: #edf7f5;
          color: #075d53;
          text-decoration: none;
        }

        .matrixAssessment small {
          font-size: 9px;
          text-transform: uppercase;
        }

        .matrixAssessment strong {
          font-size: 11px;
        }

        .matrixAssessment span {
          font-size: 10px;
          text-transform: capitalize;
        }

        .matrixAssessment.empty {
          background: #f2f5f8;
          color: #6e7d8d;
        }

        .matrixControlPanel {
          margin-top: 15px;
          border:
            1px solid #d5e1ec;
          border-radius: 15px;
          background: #f8fbfe;
        }

        .matrixControlForm {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 13px;
          padding: 20px;
        }

        .matrixControlForm label {
          display: grid;
          gap: 6px;
        }

        .matrixControlForm label > span,
        .matrixEvidenceForm label > span {
          font-size: 11px;
          font-weight: 950;
        }

        .matrixControlForm label > small {
          color: #75889b;
          font-size: 10px;
        }

        .matrixControlForm textarea {
          resize: vertical;
          line-height: 1.45;
        }

        .wide {
          grid-column: 1 / -1;
        }

        .matrixFormFooter {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 15px;
        }

        .matrixFormFooter small {
          color: #6e8297;
        }

        .matrixFormFooter button,
        .matrixEvidenceForm button {
          min-height: 42px;
          padding: 0 16px;
          border: 0;
          border-radius: 8px;
          background: #315fe8;
          color: #fff;
          font-weight: 950;
          cursor: pointer;
        }

        .matrixFormFooter button:disabled,
        .matrixEvidenceForm button:disabled {
          opacity: 0.55;
        }

        .matrixMessage {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
        }

        .matrixMessage.error {
          background: #ffebe8;
          color: #a9271e;
        }

        .matrixMessage.success {
          background: #e5f8ee;
          color: #087047;
        }

        .matrixEvidence {
          padding: 19px 20px;
          border-top:
            1px solid #dce6ef;
          background: #fff;
        }

        .matrixEvidence > header {
          display: flex;
          justify-content:
            space-between;
          gap: 15px;
          align-items: center;
        }

        .matrixEvidence > header strong,
        .matrixEvidence > header small {
          display: block;
        }

        .matrixEvidence > header small {
          margin-top: 3px;
          color: #71869b;
        }

        .matrixEvidence > header a {
          color: #245dde;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .matrixEvidenceForm {
          display: grid;
          grid-template-columns:
            1.2fr 1fr auto;
          gap: 11px;
          align-items: end;
          margin-top: 13px;
        }

        .matrixEvidenceForm label {
          display: grid;
          gap: 5px;
        }

        .matrixEvidenceForm .matrixMessage {
          grid-column: 1 / -1;
        }

        .matrixEmpty {
          padding: 45px;
          border:
            1px solid #d5e1ec;
          border-radius: 16px;
          background: #fff;
          text-align: center;
          color: #6e8195;
        }

        .matrixBoundary {
          margin-top: 17px;
          padding: 18px 21px;
          border:
            1px solid #f0d79e;
          border-radius: 13px;
          background: #fff8e9;
          color: #715311;
          font-size: 13px;
          line-height: 1.55;
        }

        @media (max-width: 1180px) {
          .matrixRequirements {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .matrixMetrics {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .matrixPage {
            padding: 21px 13px 55px;
          }

          .matrixTop {
            display: block;
          }

          .matrixActions {
            margin-top: 15px;
            overflow: auto;
          }

          .matrixHero {
            grid-template-columns: 1fr;
            padding: 26px 21px;
          }

          .matrixMetrics,
          .matrixToolbar,
          .matrixControlForm,
          .matrixEvidenceForm {
            grid-template-columns: 1fr;
          }

          .matrixToolbar > div {
            border-left: 0;
            border-top:
              1px solid #dce5ee;
          }

          .matrixGroup > summary {
            grid-template-columns:
              55px minmax(0, 1fr);
            padding: 18px 15px;
          }

          .matrixGroup
            > summary
            > .matrixStatus,
          .matrixGroup
            > summary
            > b {
            display: none;
          }

          .matrixBody {
            padding: 0 14px 17px;
          }

          .matrixRequirements {
            grid-template-columns: 1fr;
          }

          .wide {
            grid-column: auto;
          }

          .matrixFormFooter,
          .matrixEvidence > header {
            align-items: flex-start;
            flex-direction: column;
          }

          .matrixFormFooter button {
            width: 100%;
          }
        }
      `}</style>

      <div className="matrixShell">
        <header className="matrixTop">
          <div>
            <small>
              INTEGRATED MANAGEMENT SYSTEM
              · CONTROLLED MAPPING
            </small>

            <h1>
              Cross-Standard Matrix
            </h1>

            <p>
              See where requirements can
              share governance and
              evidence, where
              discipline-specific
              controls must remain
              separate, and how current
              gap assessments support
              the implementation view.
            </p>
          </div>

          <div className="matrixActions">
            <Link href="/portal/history">
              Gap Assessments
            </Link>

            <Link href="/portal/internal-audits">
              Internal Audits
            </Link>

            <Link href="/portal">
              ← Dashboard
            </Link>
          </div>
        </header>

        <section className="matrixHero">
          <div>
            <span>
              DYNAMIC ASSURANCE ENGINE
            </span>

            <h2>
              One control framework.
              Five distinct conformity
              decisions.
            </h2>

            <p>
              The matrix connects ISO
              9001, ISO 14001, ISO 45001,
              ISO 22301 and ISO/IEC
              27001 at control level. It
              draws in the latest
              matching assessment result
              while preserving each
              standard&apos;s scope,
              evidence, findings and
              specialist requirements.
            </p>
          </div>

          <div className="matrixHeroGuide">
            <strong>
              How to use this view
            </strong>

            <small>
              Open a control group,
              review each clause
              relationship, compare
              current assessments,
              assign an accountable
              Company User and link
              approved documented
              information. Never treat a
              shared document as
              automatic proof of
              conformity.
            </small>
          </div>
        </section>

        <section className="matrixMetrics">
          <div>
            <strong>
              {data.groups.length}
            </strong>

            <span>
              controlled requirement
              groups
            </span>
          </div>

          <div>
            <strong>{controlled}</strong>

            <span>
              organisation controls
              reviewed
            </span>
          </div>

          <div>
            <strong>{effective}</strong>

            <span>
              verified as effective
            </span>
          </div>

          <div>
            <strong>{gaps}</strong>

            <span>
              integrated control gaps
            </span>
          </div>
        </section>

        <CrossStandardMatrix
          {...data}
        />

        <div className="matrixBoundary">
          <strong>
            Assessment boundary:
          </strong>{" "}
          mappings are implementation
          aids, not reproduced standard
          text and not a declaration
          that requirements are
          equivalent. Auditors and
          leaders must verify the
          applicable licensed edition,
          organisation scope, objective
          evidence and
          discipline-specific criteria
          before reaching a conformity
          decision. {assessmentLinks}{" "}
          current assessment
          relationships are available in
          this view.
        </div>
      </div>
    </main>
  );
}
