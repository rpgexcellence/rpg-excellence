import Link from "next/link";

export default function HomePartnerProgramme({ locale = "en" }) {
  return (
    <section className="homePartnerProgramme" aria-labelledby="home-partner-title">
      <div className="homePartnerInner">
        <div className="homePartnerCopy">
          <span className="homePartnerEyebrow">GROW WITH RPG EXCELLENCE</span>
          <h2 id="home-partner-title">Bring your expertise.<br /><span>Make improvement count.</span></h2>
          <p className="homePartnerLead">A partnership opportunity for consultants, independent practitioners and training providers who want to help clients turn findings into verified improvement.</p>
          <ul className="homePartnerBenefits">
            <li><strong>Broaden your client offering</strong><span>Connect your services with practical assessments, audit, risk and improvement tools.</span></li>
            <li><strong>Keep client work connected</strong><span>Bring findings, responsibilities, actions and effectiveness evidence into the same workflow.</span></li>
            <li><strong>Explore additional business opportunities</strong><span>Discuss referrals, consultancy delivery or licensed training resources, with responsibilities and commercial terms agreed individually.</span></li>
          </ul>
          <div className="homePartnerActions"><Link className="homePartnerPrimary" href={`/${locale}/partners`}>Explore partnerships <span aria-hidden="true">→</span></Link><Link className="homePartnerSecondary" href={`/${locale}/partners/apply`}>Become a partner →</Link></div>
          <p className="homePartnerNote">Referral · Consultancy · Training</p>
        </div>
        <div className="homePartnerPosters">
          <Link className="homePartnerPoster" href={`/${locale}/partners`} aria-label="Explore the RPG Excellence Partner Programme">
            <img src="/images/partners/rpg-partner-programme.png" width="1122" height="1402" loading="lazy" decoding="async" alt="RPG Excellence Partner Programme: referral, consultancy and training partnership routes." />
          </Link>
          <Link className="homePartnerPoster" href={`/${locale}/partners`} aria-label="Explore the business benefits of partnering with RPG Excellence">
            <img src="/images/partners/rpg-partner-benefits.png" width="1122" height="1402" loading="lazy" decoding="async" alt="Your expertise. More business potential. Expand your services, connect client work, strengthen your training and explore new opportunities. Terms agreed individually." />
          </Link>
        </div>
      </div>
      <style>{`
        .homePartnerProgramme{padding:54px 3.3vw;background:linear-gradient(180deg,#f7fbff,#eef5fc);color:#0b2443;border-top:1px solid #e0eaf3;border-bottom:1px solid #e0eaf3}
        .homePartnerInner{width:100%;margin:0;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(28px,3vw,48px);align-items:center}
        .homePartnerCopy{min-width:0}.homePartnerEyebrow{color:#1762ef;font-size:11px;font-weight:900;letter-spacing:.15em}
        .homePartnerCopy h2{margin:20px 0;font-size:clamp(32px,3vw,48px);line-height:1.1;letter-spacing:-.04em;color:#071d3a}.homePartnerCopy h2 span{color:#087e8b}
        .homePartnerLead{font-size:17px;line-height:1.75;color:#536e86;max-width:760px}
        .homePartnerBenefits{list-style:none;padding:0;margin:26px 0;display:grid;gap:18px}.homePartnerBenefits li{border-left:3px solid #0c8b96;padding-left:16px}.homePartnerBenefits strong{display:block;color:#123451;font-size:16px;margin-bottom:6px}.homePartnerBenefits li>span{display:block;color:#536e86;font-size:14px;line-height:1.7}
        .homePartnerActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.homePartnerPrimary,.homePartnerSecondary{display:inline-flex;align-items:center;justify-content:center;gap:20px;min-height:49px;padding:12px 20px;border-radius:8px;font-weight:850;font-size:14px;text-decoration:none}.homePartnerPrimary{background:#2563ed;color:#fff}.homePartnerSecondary{color:#1459d9;border:1px solid #b7cfe4;background:#fff}
        .homePartnerNote{font-size:12px;letter-spacing:.06em;color:#526f86;margin-top:22px}
        .homePartnerPosters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start;min-width:0}
        .homePartnerPoster{display:block;max-width:360px;width:100%;justify-self:center;border-radius:14px;overflow:hidden;border:1px solid #cadcea;box-shadow:0 14px 32px #092d5418}.homePartnerPoster img{display:block;width:100%;height:auto}
        .homePartnerProgramme a:focus-visible{outline:3px solid #1459d9;outline-offset:5px}
        @media(max-width:1100px){.homePartnerInner{grid-template-columns:1fr;gap:32px}.homePartnerProgramme{padding:42px 24px}.homePartnerPoster{max-width:360px}.homePartnerCopy h2{font-size:clamp(34px,6vw,48px)}}
        @media(max-width:700px){.homePartnerProgramme{padding:38px 18px}}
        @media(max-width:560px){.homePartnerPosters{grid-template-columns:1fr;gap:24px}.homePartnerPoster{max-width:360px}}
      `}</style>
    </section>
  );
}
