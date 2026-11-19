import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "../../../../components/PageShell";
import PublicationPurchaseButton from "../../../../components/PublicationPurchaseButton";
import { locales } from "../../../../lib/i18n";
import { createClient } from "../../../../lib/supabase/server";
import { isPlatformOwner } from "../../../../lib/portal-admin-access";
import { EIGHT_D_CODE, EIGHT_D_PUBLICATION as product } from "../../../../lib/eight-d-publication.mjs";
import { eightDFilesAreReady } from "../../../../lib/eight-d-publication-storage";
import styles from "../publications.module.css";

const price = "£" + (product.unitAmount / 100).toFixed(2);
export const dynamic = "force-dynamic";
export const metadata = {
  title: "8D That Works | RPG Excellence",
  description: product.description,
  openGraph: { title: "8D That Works | RPG Excellence", description: product.description, images: [product.image] },
  referrer: "no-referrer",
};

export default async function Page({ params, searchParams }) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: { user }, error }, ready] = await Promise.all([supabase.auth.getUser(), eightDFilesAreReady()]);
  const authenticated = !error && Boolean(user?.id);
  const owner = authenticated && isPlatformOwner(user);
  const sessionId = typeof query?.session_id === "string" && /^cs_(test|live)_[a-zA-Z0-9]+$/.test(query.session_id) ? query.session_id : null;
  const returnPath = "/" + locale + "/publications/" + product.slug;
  const confirmation = sessionId ? "?session_id=" + encodeURIComponent(sessionId) : "";
  const download = "/api/publications/8d-that-works/download";

  return <PageShell locale={locale}><main className="simplePage"><div className="simpleInner" style={{ maxWidth: 1100 }}>
    <Link href={`/${locale}/publications#quality-improvement`}>← All publications</Link>
    <div className={styles.productLayout}>
      <img className={styles.productCover} src={product.image} alt="8D That Works workbook cover" width="294" height="380" />
      <div>
        <p className="kicker">RPG EXCELLENCE · QUALITY IMPROVEMENT</p>
        <h1>{product.name}</h1>
        <p style={{fontSize:22}}>{product.subtitle}</p>
        <p>By Rafal Pereszczako</p>
        <p>{product.description}</p>
        <p><strong style={{fontSize:25}}>{price}</strong> · One-time purchase · English PDF workbook and printable poster pack</p>
        {!ready ? <p role="status">This publication is temporarily unavailable.</p> :
          owner || (sessionId && authenticated) ? <section aria-label="Publication downloads">
            <p>{owner ? "Your account has complimentary access to both files." : "Downloads are available after payment verification. Keep this confirmation link for future access."}</p>
            <div className={styles.actions}>
              <a className="button" href={download + confirmation}>Download workbook</a>
              <a className="button" href={download + "?asset=posters" + (sessionId ? "&session_id=" + encodeURIComponent(sessionId) : "")}>Download printable posters</a>
            </div>
          </section> : sessionId ? <Link className="button" href={"/portal/login?next=" + encodeURIComponent(returnPath + confirmation)}>Sign in to access your purchase</Link> :
          <><p>Sign in to buy and access your files. No subscription is required.</p><PublicationPurchaseButton publication={EIGHT_D_CODE} /></>}
        {query?.checkout === "cancelled" && <p role="status">Checkout was cancelled. You can return when you are ready.</p>}
      </div>
    </div>
    <h2>What’s inside</h2>
    <ul>
      <li>32 workbook pages covering D0–D8 and a worked manufacturing case from containment to independent closure.</li>
      <li>Ishikawa hypothesis testing and three-path 5 Whys for occurrence, escape and system causes.</li>
      <li>Pre-rollout challenge tests, effectiveness criteria, live-work sampling and read-across.</li>
      <li>Five worksheets and four separate colour posters for 8D, Ishikawa, three-path 5 Whys and effectiveness reviews.</li>
    </ul>
    <p>You may reproduce the worksheets and print the posters for internal use, with RPG Excellence attribution retained.</p>
  </div></main></PageShell>;
}
