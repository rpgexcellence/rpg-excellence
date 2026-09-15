import Link from "next/link";

const hubData = {
  continuity: {
    eyebrow: "BUSINESS CONTINUITY PLANNING · ISO 22301",
    title: "Prepare for disruption. Prove that recovery can work.",
    lead: "Connect ISO 22301 readiness, business-impact priorities, disruption risk, continuity arrangements, exercises and improvement in one evidence-led journey.",
    accent: "#6d45d8", dark: "#211858", pale: "#f3efff",
    primary: "/portal/business-continuity",
    primaryLabel: "Open BCP Hub →",
    secondary: "/iso-22301", secondaryLabel: "View ISO 22301 guide",
    capabilities: [
      ["01","ISO 22301 Gap Analysis","Assess every auditable requirement across Clauses 4–10 with evidence, findings and weighted readiness."],
      ["02","Business Impact Analysis","Define priority activities, disruption impacts, dependencies, recovery timeframes and minimum operating needs."],
      ["03","Disruption Risk","Evaluate threats, vulnerabilities, single points of failure and existing resilience arrangements."],
      ["04","Continuity Strategy","Select practical people, premises, technology, supplier, information and recovery solutions."],
      ["05","Plans and Response","Translate strategy into clear activation, command, communication, response and recovery arrangements."],
      ["06","Exercises and Improvement","Test assumptions, capture evidence, record lessons and verify that actions strengthen capability."],
    ],
    stages: ["Understand impacts","Assess disruption risk","Select strategy","Build plans","Exercise and improve"],
    note: "ISO 22301 gap analysis is available now. The structured BCP planning workflow and supporting case studies will follow.",
  },
  security: {
    eyebrow: "INFORMATION SECURITY · ISO/IEC 27001",
    title: "Connect security risk, controls and assurance.",
    lead: "Bring ISO/IEC 27001 readiness, risk assessment and treatment, the Statement of Applicability and objective evidence into one controlled ISMS workspace.",
    accent: "#07859a", dark: "#073f55", pale: "#eaf8fa",
    primary: "/portal?standard=ISO%2FIEC%2027001%3A2022%2FAmd%201%3A2024#new-assessment", primaryLabel: "Open ISO 27001 assessment →",
    secondary: "/portal/soa", secondaryLabel: "Open SoA register",
    capabilities: [
      ["01","ISO 27001 Gap Analysis","Review management-system requirements, retain evidence and convert material gaps into owned improvement."],
      ["02","Security Risk Register","Record assets, threats, vulnerabilities, consequences, controls, treatment and residual-risk decisions."],
      ["03","Statement of Applicability","Determine applicability across 93 Annex A controls with justification, ownership and implementation evidence."],
      ["04","Risk Treatment","Connect control selection and action to the assessed information-security risk and accountable acceptance."],
      ["05","Evidence Control","Maintain policies, procedures, records, approvals and implementation evidence in a controlled library."],
      ["06","Management Insight","See risk exposure, incomplete controls, open findings and assurance priorities across the ISMS."],
    ],
    stages: ["Define scope","Assess risk","Select controls","Implement treatment","Monitor and improve"],
    note: "Gap analysis, risk management and the controlled Statement of Applicability are available now.",
  },
  aerospace: {
    eyebrow: "AS9100 · AEROSPACE, AVIATION, MILITARY & DEFENCE",
    title: "Specialist assurance for high-consequence supply chains.",
    lead: "A future connected workspace for aerospace quality, product safety, configuration management, operational risk and evidence-led assurance.",
    accent: "#d48416", dark: "#202c3d", pale: "#fff5e7",
    primary: "/contact", primaryLabel: "Register interest →",
    secondary: "/iso-9001", secondaryLabel: "Explore quality guidance",
    capabilities: [
      ["01","AS9100 Readiness","Structured assessment of applicable aerospace quality-management requirements and implementation evidence."],
      ["02","Product Safety","Connect product-safety risks, responsibilities, controls, communication and assurance decisions."],
      ["03","Configuration Management","Maintain visibility of configuration status, authorised change and controlled technical information."],
      ["04","Operational Risk","Address risk-based operational planning, special processes, suppliers and production controls."],
      ["05","Counterfeit Prevention","Support proportionate prevention, detection, reporting and control of suspect or counterfeit parts."],
      ["06","Assurance Reporting","Bring audits, findings, actions, evidence and management attention into a traceable view."],
    ],
    stages: ["Understand requirements","Assess readiness","Control operational risk","Verify evidence","Sustain assurance"],
    note: "This specialist hub is in development. Register interest to follow its release.",
  },
};

export default function AssuranceHubLanding({ hub, locale }) {
  const data = hubData[hub];
  const secondaryHref=data.secondary.startsWith("/portal")?data.secondary:`/${locale}${data.secondary}`;
  return <main className="ahl" style={{"--accent":data.accent,"--dark":data.dark,"--pale":data.pale}}>
    <section className="ahlHero"><div><span className="ahlEyebrow">RPG EXCELLENCE · {data.eyebrow}</span><h1>{data.title}</h1><p>{data.lead}</p><div className="ahlActions"><Link className="ahlButton primary" href={data.primary}>{data.primaryLabel}</Link><Link className="ahlButton secondary" href={secondaryHref}>{data.secondaryLabel}</Link></div></div><aside className="ahlPreview"><header><span>CONNECTED ASSURANCE HUB</span><b>{hub === "aerospace" ? "COMING SOON" : "AVAILABLE NOW"}</b></header><div className="ahlRadar"><i/><i/><i/><i/><strong>{hub === "continuity" ? "BCP" : hub === "security" ? "ISMS" : "AS9100"}</strong></div><div className="ahlSignals"><span>Requirements</span><span>Risk</span><span>Evidence</span><span>Action</span></div></aside></section>
    <section className="ahlRibbon"><strong>One controlled assurance journey</strong>{data.stages.map((stage,index)=><span key={stage}><i>{String(index+1).padStart(2,"0")}</i>{stage}</span>)}</section>
    <section className="ahlSection"><span className="ahlEyebrow">HUB CAPABILITY</span><div className="ahlHeading"><h2>From requirement to evidence-led decision.</h2><p>{data.note}</p></div><div className="ahlGrid">{data.capabilities.map(([number,title,text])=><article key={number}><b>{number}</b><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="ahlCta"><div><span className="ahlEyebrow">RPG EXCELLENCE</span><h2>{data.note}</h2></div><Link className="ahlButton primary" href={data.primary}>{data.primaryLabel}</Link></section>
    <style>{styles}</style>
  </main>;
}

const styles=`
  .ahl{color:#071d3a;background:#f7f9fc}.ahlHero{max-width:1370px;margin:auto;padding:78px 34px 66px;display:grid;grid-template-columns:1.04fr .96fr;gap:60px;align-items:center}.ahlEyebrow{display:block;color:var(--accent);font-size:11px;font-weight:950;letter-spacing:.14em}.ahlHero h1{max-width:790px;margin:14px 0 22px;font-size:clamp(44px,5.4vw,76px);line-height:.98;letter-spacing:-.052em}.ahlHero>div>p{max-width:750px;color:#4f6680;font-size:19px;line-height:1.62}.ahlActions{display:flex;gap:11px;flex-wrap:wrap;margin-top:29px}.ahlButton{display:inline-flex;align-items:center;justify-content:center;min-height:49px;padding:0 20px;border-radius:9px;text-decoration:none;font-weight:900}.ahlButton.primary{background:var(--accent);color:#fff}.ahlButton.secondary{border:1px solid #b9c9da;background:#fff;color:#092746}.ahlPreview{padding:25px;border:1px solid #cedce8;border-radius:21px;background:#fff;box-shadow:0 25px 65px #0828441c}.ahlPreview header{display:flex;justify-content:space-between;gap:14px;align-items:center;padding-bottom:14px;border-bottom:1px solid #e1e9ef}.ahlPreview header span{color:var(--accent);font-size:9px;font-weight:950;letter-spacing:.1em}.ahlPreview header b{padding:7px 9px;border-radius:999px;background:var(--pale);color:var(--accent);font-size:8px}.ahlRadar{position:relative;height:220px;margin:18px 0;border-radius:13px;background:radial-gradient(circle,var(--pale) 0 19%,transparent 20% 38%,var(--pale) 39% 40%,transparent 41% 59%,var(--pale) 60% 61%,transparent 62%),linear-gradient(135deg,#f9fbfd,#edf3f7)}.ahlRadar i{position:absolute;width:11px;height:11px;border-radius:50%;background:var(--accent)}.ahlRadar i:nth-child(1){left:25%;top:28%}.ahlRadar i:nth-child(2){right:21%;top:23%}.ahlRadar i:nth-child(3){left:18%;bottom:21%}.ahlRadar i:nth-child(4){right:25%;bottom:25%}.ahlRadar strong{position:absolute;inset:0;display:grid;place-items:center;color:var(--dark);font-size:25px}.ahlSignals{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.ahlSignals span{padding:9px 5px;border-radius:7px;background:var(--pale);color:var(--dark);text-align:center;font-size:9px;font-weight:850}.ahlRibbon{display:grid;grid-template-columns:1.45fr repeat(5,1fr);gap:10px;align-items:center;padding:17px max(34px,calc((100% - 1302px)/2));background:var(--dark);color:#fff}.ahlRibbon span{display:flex;align-items:center;gap:8px;color:#d6e1ed;font-size:10px;font-weight:800}.ahlRibbon i{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:var(--accent);font-size:8px;font-style:normal}.ahlSection{max-width:1256px;margin:auto;padding:76px 0}.ahlHeading{display:grid;grid-template-columns:1.4fr .7fr;gap:50px;align-items:end}.ahlHeading h2,.ahlCta h2{margin:10px 0 18px;font-size:clamp(33px,4vw,52px);line-height:1.04;letter-spacing:-.04em}.ahlHeading p{color:#5b7085;line-height:1.6}.ahlGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:33px}.ahlGrid article{padding:24px;border:1px solid #d5e0e9;border-radius:15px;background:#fff}.ahlGrid article>b{color:var(--accent);font-size:11px}.ahlGrid h3{margin:18px 0 9px}.ahlGrid p{margin:0;color:#586f85;line-height:1.58}.ahlCta{max-width:1190px;margin:0 auto 72px;padding:34px;display:grid;grid-template-columns:1fr auto;gap:35px;align-items:center;border-radius:18px;background:var(--dark);color:#fff}.ahlCta h2{max-width:850px;font-size:30px}.ahlCta .ahlEyebrow{color:#fff}@media(max-width:950px){.ahlHero,.ahlHeading,.ahlCta{grid-template-columns:1fr}.ahlSection{padding-left:24px;padding-right:24px}.ahlGrid{grid-template-columns:1fr 1fr}.ahlRibbon{grid-template-columns:1fr 1fr}.ahlRibbon>strong{grid-column:1/-1}}@media(max-width:620px){.ahlHero{padding:54px 18px}.ahlGrid{grid-template-columns:1fr}.ahlSection{padding:56px 18px}.ahlCta{margin:0 18px 50px;padding:25px}.ahlHero h1{font-size:44px}.ahlSignals{grid-template-columns:1fr 1fr}}
`;
