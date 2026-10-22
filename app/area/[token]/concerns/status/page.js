import { IncidentActionForm } from "../../../../../components/IncidentForm";
import { publicReportZone } from "../../../../../lib/incidents";
import { checkReportProgress } from "../actions";
import "../../../../portal/incidents/incidents.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Report progress | RPG Excellence",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function StatusPage({ params }) {
  const { token } = await params;
  await publicReportZone(token);
  return (
    <main className="incidentPage incidentPublic">
      <header className="incidentHead">
        <h1>Check report progress</h1>
        <p>
          Only the status and an administrator-approved update are shown. Your
          private key stays out of the page address.
        </p>
      </header>
      <section className="incidentCard">
        <IncidentActionForm action={checkReportProgress} label="Check progress">
          <input type="hidden" name="token" value={token} />
          <label>
            Report reference
            <input
              name="reference"
              required
              maxLength={50}
              autoComplete="off"
            />
          </label>
          <label>
            Private access key
            <input
              name="receipt"
              required
              maxLength={60}
              autoComplete="off"
              type="password"
            />
          </label>
        </IncidentActionForm>
      </section>
    </main>
  );
}
