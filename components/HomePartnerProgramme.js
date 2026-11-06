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
        <Link className="homePartnerPoster" href={`/${locale}/partners`} aria-label="Explore the RPG Excellence Partner Programme">
          <img src="/images/partners/rpg-partner-programme.png" width="1122" height="1402" loading="lazy" decoding="async" alt="RPG Excellence Partner Programme: bring your expertise, make improvement count. Referral, consultancy and training partnership routes." />
        </Link>
      </div>
      <style>{`
        .homePartnerProgramme{padding:72px clamp(20px,6vw,90px);background:linear-gradient(115deg,#071f3c,#123e65);color:#fff}
        .homePartnerInner{max-width:1240px;margin:auto;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:clamp(30px,5vw,70px);align-items:center}
        .homePartnerCopy{min-width:0}.homePartnerEyebrow{color:#4de2ce;font-size:11px;font-weight:900;letter-spacing:.15em}
        .homePartnerCopy h2{margin:20px 0;font-size:clamp(34px,3.8vw,54px);line-height:1.1;letter-spacing:-.04em;color:#fff}.homePartnerCopy h2 span{color:#4de2ce}
        .homePartnerLead{font-size:17px;line-height:1.75;color:#d5e4f1;max-width:640px}
        .homePartnerBenefits{list-style:none;padding:0;margin:26px 0;display:grid;gap:18px}.homePartnerBenefits li{border-left:3px solid #3ad9c3;padding-left:16px}.homePartnerBenefits strong{display:block;color:#fff;font-size:16px;margin-bottom:6px}.homePartnerBenefits li>span{display:block;color:#c6d9e8;font-size:14px;line-height:1.7}
        .homePartnerActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.homePartnerPrimary,.homePartnerSecondary{display:inline-flex;align-items:center;justify-content:center;gap:20px;min-height:49px;padding:12px 20px;border-radius:8px;font-weight:850;font-size:14px;text-decoration:none}.homePartnerPrimary{background:#2563ed;color:#fff}.homePartnerSecondary{color:#fff;border:1px solid #7a96ae}
        .homePartnerNote{font-size:12px;letter-spacing:.06em;color:#9fc0d8;margin-top:22px}
        .homePartnerPoster{display:block;max-width:440px;width:100%;justify-self:center;border-radius:14px;overflow:hidden;border:1px solid #486b8b;box-shadow:0 24px 55px #00172e66}.homePartnerPoster img{display:block;width:100%;height:auto}
        .homePartnerProgramme a:focus-visible{outline:3px solid #4de2ce;outline-offset:5px}
        @media(max-width:900px){.homePartnerInner{grid-template-columns:1fr;gap:32px}.homePartnerProgramme{padding-top:48px;padding-bottom:48px}.homePartnerPoster{max-width:400px}.homePartnerCopy h2{font-size:clamp(34px,6vw,48px)}}
      `}</style>
    </section>
  );
}
