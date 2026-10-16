import Link from "next/link";
import { requirePeopleAdmin } from "../people/actions";
import IntegrationKeyManager from "./IntegrationKeyManager";

export const dynamic = "force-dynamic";

export default async function EnterpriseIntegrationsPage() {
  const { admin, organization } =
    await requirePeopleAdmin();

  const { data: clients, error } = await admin
    .from("integration_api_clients")
    .select(
      "id,client_name,key_prefix,environment,permissions,active,expires_at,last_used_at,revoked_at,created_at",
    )
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <main className="integrationPage">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .integrationPage {
          min-height: 100vh;
          padding: 34px clamp(18px, 4vw, 64px) 70px;
          background: #edf3f9;
          color: #071b35;
        }

        .integrationShell {
          max-width: 1380px;
          margin: 0 auto;
        }

        .integrationTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 23px;
        }

        .integrationTop small {
          display: block;
          margin-bottom: 7px;
          color: #5a45df;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .12em;
        }

        .integrationTop h1 {
          margin: 0;
          color: #071b35;
          font-size: clamp(32px, 4vw, 49px);
          letter-spacing: -.045em;
        }

        .integrationTop p {
          max-width: 820px;
          margin: 9px 0 0;
          color: #58708a;
          line-height: 1.55;
        }

        .integrationTopActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .integrationBack,
        .integrationDocs {
          display: inline-flex;
          align-items: center;
          padding: 12px 16px;
          border: 1px solid #c7d6e6;
          border-radius: 10px;
          background: #fff;
          color: #0a2c52;
          text-decoration: none;
          font-weight: 900;
          white-space: nowrap;
        }

        .integrationDocs {
          border-color: #315fe8;
          background: #315fe8;
          color: #fff;
        }

        .integrationHero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns:
            minmax(0, 1.4fr)
            minmax(260px, .6fr);
          gap: 25px;
          padding: 33px 35px;
          border-radius: 21px;
          background:
            linear-gradient(120deg, #071b38, #0b4279);
          color: #fff;
          box-shadow: 0 18px 45px #061a3520;
        }

        .integrationHero::after {
          content: "";
          position: absolute;
          right: -80px;
          top: -120px;
          width: 360px;
          height: 360px;
          border: 1px solid #58e0d445;
          border-radius: 50%;
        }

        .integrationHero span {
          color: #5ce3d8;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .11em;
        }

        .integrationHero h2 {
          margin: 7px 0 10px;
          color: #fff;
          font-size: 29px;
        }

        .integrationHero p {
          max-width: 760px;
          margin: 0;
          color: #d1e0ef;
          line-height: 1.6;
        }

        .integrationEndpoint {
          position: relative;
          z-index: 1;
          padding: 20px;
          border: 1px solid #ffffff25;
          border-radius: 15px;
          background: #ffffff0d;
        }

        .integrationEndpoint strong,
        .integrationEndpoint code,
        .integrationEndpoint small {
          display: block;
        }

        .integrationEndpoint strong {
          margin-bottom: 11px;
        }

        .integrationEndpoint code {
          overflow-wrap: anywhere;
          padding: 11px;
          border-radius: 8px;
          background: #031329;
          color: #66e8dd;
        }

        .integrationEndpoint small {
          margin-top: 10px;
          color: #b9cee1;
        }

        .integrationPrinciples {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin: 16px 0;
        }

        .integrationPrinciples article {
          padding: 19px 21px;
          border: 1px solid #d2dfeb;
          border-radius: 14px;
          background: #fff;
        }

        .integrationPrinciples strong,
        .integrationPrinciples span {
          display: block;
        }

        .integrationPrinciples strong {
          margin-bottom: 5px;
        }

        .integrationPrinciples span {
          color: #6a7e93;
          font-size: 13px;
          line-height: 1.45;
        }

        .integrationPanel {
          margin-top: 17px;
          overflow: hidden;
          border: 1px solid #d2dfeb;
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 12px 34px #071b350a;
        }

        .integrationPanelHead {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          padding: 25px 28px;
          border-bottom: 1px solid #e3eaf2;
          background:
            linear-gradient(115deg, #fff, #f4f8fd);
        }

        .integrationPanelHead span {
          color: #1761e8;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .12em;
        }

        .integrationPanelHead h2 {
          margin: 5px 0;
          color: #071b35;
          font-size: 24px;
        }

        .integrationPanelHead p {
          max-width: 780px;
          margin: 0;
          color: #647a91;
        }

        .integrationPanelHead > b {
          align-self: flex-start;
          padding: 8px 11px;
          border-radius: 999px;
          background: #e9f0ff;
          color: #1555c6;
          font-size: 11px;
          text-transform: uppercase;
        }

        .integrationForm {
          display: grid;
          grid-template-columns: 1.4fr .8fr .8fr;
          gap: 16px;
          padding: 27px;
        }

        .integrationForm > label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #17324f;
          font-size: 12px;
          font-weight: 900;
        }

        .integrationForm input,
        .integrationForm select {
          width: 100%;
          min-height: 46px;
          padding: 11px 12px;
          border: 1px solid #c7d6e5;
          border-radius: 9px;
          background: #fff;
          color: #071b35;
          font: inherit;
        }

        .integrationForm label small {
          color: #75889b;
          font-weight: 500;
          line-height: 1.4;
        }

        .integrationPermissions {
          grid-column: 1 / -1;
          margin: 2px 0 0;
          padding: 20px;
          border: 1px solid #ccdaea;
          border-radius: 13px;
        }

        .integrationPermissions legend {
          padding: 0 7px;
          font-weight: 950;
        }

        .integrationPermissions > p {
          margin: 0 0 16px;
          color: #63788e;
          font-size: 13px;
        }

        .integrationPermissionGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .integrationPermissionGroup {
          display: grid;
          gap: 9px;
          padding: 17px;
          border-radius: 11px;
          background: #f3f7fb;
        }

        .integrationPermissionGroup > strong {
          margin-bottom: 3px;
        }

        .integrationPermissionGroup label {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #29435d;
          font-size: 13px;
        }

        .integrationPermissionGroup input {
          width: 17px;
          min-height: 17px;
          margin: 0;
        }

        .integrationPrimary {
          justify-self: start;
          min-height: 47px;
          padding: 0 19px;
          border: 0;
          border-radius: 9px;
          background: #315fe8;
          color: #fff;
          font-weight: 950;
          cursor: pointer;
        }

        .integrationPrimary:disabled {
          opacity: .55;
        }

        .integrationMessage {
          grid-column: 1 / -1;
          padding: 12px 14px;
          border-radius: 9px;
        }

        .integrationMessage.error,
        .integrationInlineError {
          background: #fff0ee;
          color: #ac2b20;
        }

        .integrationSecret {
          margin: 0 27px 27px;
          padding: 22px;
          border: 1px solid #74cdbd;
          border-radius: 14px;
          background: #eafaf6;
        }

        .integrationSecret span {
          color: #08725e;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .12em;
        }

        .integrationSecret h3 {
          margin: 5px 0;
        }

        .integrationSecret p {
          margin: 0;
          color: #476b65;
        }

        .integrationSecret code {
          display: block;
          overflow-wrap: anywhere;
          margin: 17px 0;
          padding: 14px;
          border-radius: 8px;
          background: #071b35;
          color: #67e5d7;
        }

        .integrationSecret button {
          padding: 10px 15px;
          border: 0;
          border-radius: 8px;
          background: #07836c;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .integrationClientList {
          display: grid;
        }

        .integrationClient {
          display: grid;
          grid-template-columns:
            minmax(280px, 1.3fr)
            minmax(170px, .6fr)
            auto;
          gap: 20px;
          align-items: center;
          padding: 21px 27px;
          border-top: 1px solid #e7edf3;
        }

        .integrationClient:first-child {
          border-top: 0;
        }

        .integrationClient strong,
        .integrationClient code,
        .integrationClient small {
          display: block;
        }

        .integrationClient code {
          margin: 7px 0;
          color: #275580;
        }

        .integrationClient small {
          color: #718497;
          line-height: 1.45;
        }

        .integrationClientMeta {
          display: grid;
          gap: 5px;
        }

        .integrationClientMeta > span {
          justify-self: start;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .integrationClientMeta .active {
          background: #e8f8ef;
          color: #08704a;
        }

        .integrationClientMeta .revoked {
          background: #f1f2f4;
          color: #697481;
        }

        .integrationRevokeForm {
          text-align: right;
        }

        .integrationDanger {
          padding: 10px 13px;
          border: 1px solid #f0b8b2;
          border-radius: 8px;
          background: #fff4f2;
          color: #ac2b20;
          font-weight: 900;
          cursor: pointer;
        }

        .integrationDanger:disabled {
          border-color: #d9e0e6;
          background: #f2f4f6;
          color: #87929d;
          cursor: not-allowed;
        }

        .integrationInlineError {
          display: block;
          margin-top: 6px;
          padding: 5px;
          border-radius: 5px;
        }

        .integrationEmpty {
          padding: 37px;
          text-align: center;
          color: #6b8095;
        }

        .integrationGuide {
          margin-top: 17px;
          padding: 28px;
          border: 1px solid #d2dfeb;
          border-radius: 19px;
          background: #071b35;
          color: #dce8f4;
          box-shadow: 0 12px 34px #071b3515;
        }

        .integrationGuide > header span {
          color: #5ce3d8;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .12em;
        }

        .integrationGuide > header h2 {
          margin: 6px 0;
          color: #fff;
          font-size: 25px;
        }

        .integrationGuide > header p {
          max-width: 850px;
          margin: 0;
          color: #b9cadb;
          line-height: 1.55;
        }

        .integrationGuideGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
          margin-top: 21px;
        }

        .integrationGuide details {
          overflow: hidden;
          border: 1px solid #ffffff20;
          border-radius: 12px;
          background: #ffffff08;
        }

        .integrationGuide summary {
          padding: 16px 18px;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .integrationGuide details > div {
          padding: 0 18px 18px;
          color: #c9d8e7;
        }

        .integrationGuide p {
          line-height: 1.55;
        }

        .integrationGuide code {
          overflow-wrap: anywhere;
          color: #66e8dd;
        }

        .integrationGuide pre {
          overflow: auto;
          padding: 14px;
          border-radius: 9px;
          background: #031126;
          color: #dce8f4;
          font-size: 12px;
          line-height: 1.55;
        }

        .integrationGuide ul {
          padding-left: 19px;
          line-height: 1.75;
        }

        .integrationGuideWarning {
          margin-top: 15px;
          padding: 14px;
          border-left: 4px solid #f3ba36;
          border-radius: 8px;
          background: #ffffff0b;
          color: #f3dfad;
        }

        @media (max-width: 900px) {
          .integrationHero {
            grid-template-columns: 1fr;
          }

          .integrationPrinciples,
          .integrationGuideGrid {
            grid-template-columns: 1fr;
          }

          .integrationForm {
            grid-template-columns: 1fr 1fr;
          }

          .integrationForm > label:first-child {
            grid-column: 1 / -1;
          }

          .integrationClient {
            grid-template-columns: 1fr 1fr;
          }

          .integrationRevokeForm {
            grid-column: 1 / -1;
            text-align: left;
          }
        }

        @media (max-width: 620px) {
          .integrationPage {
            padding: 22px 13px 55px;
          }

          .integrationTop {
            display: block;
          }

          .integrationTopActions {
            justify-content: flex-start;
            margin-top: 15px;
          }

          .integrationBack,
          .integrationDocs {
            margin: 0;
          }

          .integrationHero {
            padding: 25px 21px;
          }

          .integrationPanelHead {
            display: block;
            padding: 21px;
          }

          .integrationPanelHead > b {
            display: inline-block;
            margin-top: 12px;
          }

          .integrationForm,
          .integrationPermissionGrid,
          .integrationClient {
            grid-template-columns: 1fr;
          }

          .integrationForm {
            padding: 21px;
          }

          .integrationForm > label:first-child {
            grid-column: auto;
          }

          .integrationSecret {
            margin: 0 20px 20px;
          }

          .integrationClient {
            padding: 20px;
          }

          .integrationRevokeForm {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="integrationShell">
        <header className="integrationTop">
          <div>
            <small>
              ADMINISTRATION · ENTERPRISE INTEGRATIONS
            </small>

            <h1>Enterprise Integration</h1>

            <p>
              Connect approved business systems to RPG
              Excellence through controlled,
              organisation-scoped API credentials and an
              auditable integration trail.
            </p>
          </div>

          <div className="integrationTopActions">
            <a
              href="/api/v1/integration/openapi"
              className="integrationDocs"
              target="_blank"
              rel="noopener noreferrer"
            >
              API documentation ↗
            </a>

            <Link
              href="/portal"
              className="integrationBack"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        <section className="integrationHero">
          <div>
            <span>VENDOR-NEUTRAL FOUNDATION</span>

            <h2>Secure access before connectors</h2>

            <p>
              The integration layer establishes governed API
              access for ERP, maintenance, audit and
              business-intelligence platforms. It does not
              grant unrestricted database access and it does
              not change existing Company User permissions.
            </p>
          </div>

          <div className="integrationEndpoint">
            <strong>API v1 status endpoint</strong>

            <code>/api/v1/integration/health</code>

            <small>
              Authenticate with an RPG Bearer API key.
            </small>
          </div>
        </section>

        <section className="integrationPrinciples">
          <article>
            <strong>Organisation isolated</strong>
            <span>
              Every credential is bound to one controlled
              organisation.
            </span>
          </article>

          <article>
            <strong>Least privilege</strong>
            <span>
              Read and write permissions are granted
              independently by module.
            </span>
          </article>

          <article>
            <strong>Traceable use</strong>
            <span>
              Requests record client, endpoint, status,
              timestamp and source metadata.
            </span>
          </article>
        </section>

        <IntegrationKeyManager clients={clients || []} />

        <section className="integrationGuide">
          <header>
            <span>API V1 · QUICK START</span>

            <h2>
              Connect and verify an approved system
            </h2>

            <p>
              Use a test credential first. Replace the example
              host and key locally, never in source control,
              support messages or screenshots.
            </p>
          </header>

          <div className="integrationGuideGrid">
            <details open>
              <summary>1. Authentication</summary>

              <div>
                <p>
                  Send the complete key in the HTTP
                  Authorization header:
                </p>

                <pre>
                  {`Authorization: Bearer rpg_test_…`}
                </pre>

                <p>
                  The complete secret is displayed once. RPG
                  Excellence stores only its cryptographic
                  digest.
                </p>
              </div>
            </details>

            <details>
              <summary>2. Verify the connection</summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/health" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  A valid key returns the API version, client,
                  organisation, permissions and request
                  reference without exposing customer records.
                </p>
              </div>
            </details>

            <details>
              <summary>3. Read controlled audits</summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/audits?page=1&page_size=25" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>audits:read</code>. Filters include{" "}
                  <code>status</code>,{" "}
                  <code>audit_type</code>,{" "}
                  <code>planned_from</code> and{" "}
                  <code>planned_to</code>.
                </p>
              </div>
            </details>

            <details>
              <summary>
                4. Read controlled CAPA-8D cases
              </summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/capa-8d?page=1&page_size=25&case_type=capa" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>capa:read</code>. Filters include{" "}
                  <code>case_type</code>,{" "}
                  <code>status</code>,{" "}
                  <code>severity</code>,{" "}
                  <code>source_type</code> and{" "}
                  <code>target_before</code>.
                </p>
              </div>
            </details>

            <details>
              <summary>5. Read controlled assets</summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/assets?page=1&page_size=25&ppm_status=overdue" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>assets:read</code>. Filters include{" "}
                  <code>asset_type</code>,{" "}
                  <code>status</code>,{" "}
                  <code>criticality</code> and{" "}
                  <code>ppm_status</code>.
                </p>
              </div>
            </details>

            <details>
              <summary>6. Read controlled suppliers</summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/suppliers?page=1&page_size=25&approval_status=approved" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>suppliers:read</code>. Filters include{" "}
                  <code>approval_status</code>,{" "}
                  <code>criticality</code> and{" "}
                  <code>review_status</code>.
                </p>
              </div>
            </details>

            <details>
              <summary>
                7. Read controlled Company Users
              </summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/people?page=1&page_size=25&account_status=active" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>people:read</code>. Filters include{" "}
                  <code>account_status</code>,{" "}
                  <code>site</code> and{" "}
                  <code>department</code>. Authentication and
                  invitation data are never returned.
                </p>
              </div>
            </details>

            <details>
              <summary>8. Read controlled findings</summary>

              <div>
                <pre>{`curl --request GET \\
  "https://www.rpgexcellence.com/api/v1/integration/findings?page=1&page_size=25&finding_type=major_nc" \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</pre>

                <p>
                  The credential requires{" "}
                  <code>findings:read</code>. Supported finding
                  types are <code>major_nc</code> and{" "}
                  <code>minor_nc</code>.
                </p>
              </div>
            </details>

            <details>
              <summary>
                9. Filters, responses and errors
              </summary>

              <div>
                <ul>
                  <li>
                    <code>page</code>: 1 or greater
                  </li>
                  <li>
                    <code>page_size</code>: 1–100
                  </li>
                  <li>
                    <code>status</code>: open, assigned,
                    in_progress, submitted, returned or closed
                  </li>
                  <li>
                    <code>401</code>: invalid, expired or
                    revoked key
                  </li>
                  <li>
                    <code>403</code>: missing permission or
                    blocked source address
                  </li>
                  <li>
                    <code>400</code>: unsupported filter value
                  </li>
                </ul>
              </div>
            </details>
          </div>

          <div className="integrationGuideWarning">
            <strong>Credential control:</strong> use separate
            test and live keys, grant the minimum permissions,
            set an expiry where practical and revoke access
            immediately when an integration or supplier
            relationship ends.
          </div>
        </section>
      </div>
    </main>
  );
}
