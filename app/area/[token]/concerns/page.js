import Link from "next/link";
import IncidentIntakeForm from "../../../../components/IncidentForm";
import { publicReportZone, issueReportTicket } from "../../../../lib/incidents";
import { reportZoneConcern } from "./actions";
import "../../../portal/incidents/incidents.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Report an incident or concern | RPG Excellence",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function ConcernPage({ params }) {
  const { token } = await params;
  const { zone, site } = await publicReportZone(token);
  return (
    <main className="incidentPage incidentPublic">
      <header className="incidentHead">
        <span className="incidentEyebrow">
          RPG EXCELLENCE · SPEAK UP, PREVENT HARM
        </span>
        <h1>Report an incident or concern</h1>
        <p>
          {site.site_name} / {zone.reference} · {zone.name}
        </p>
        <p>No sign-in required. You can remain anonymous.</p>
      </header>
      <p className="incidentNotice">
        <strong>Immediate danger or active security incident?</strong> Follow
        site emergency procedures and contact the responsible team directly.
        This form is not continuously monitored and does not summon emergency
        assistance.
      </p>
      <section className="incidentCard">
        <IncidentIntakeForm
          action={reportZoneConcern}
          token={token}
          ticket={issueReportTicket(token)}
        />
      </section>
      <Link href={`/area/${token}/concerns/status`}>
        Already reported? Check progress with your private key →
      </Link>
    </main>
  );
}
