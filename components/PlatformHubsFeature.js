import Link from "next/link";

const auditRows = [
  ["QMS processes", "In progress"],
  ["H&S operations", "Planned"],
  ["Supplier assurance", "Complete"],
];

const sharedServices = ["Evidence Control", "Action Tracking", "Executive Insight", "Documents", "Notifications"];

function AuditPreview() {
  return <div className="phPreview phAuditPreview">
    <div className="phPreviewTitle"><strong>Audit programme</strong><span>2026</span></div>
    {auditRows.map(([name, status]) => <div className="phAuditRow" key={name}><span>{name}</span><em className={status.toLowerCase().replace(" ", "-")}>{status}</em></div>)}
    <div className="phCommercial"><b>Internal Auditor Refresher</b><span>£19.99</span></div>
  </div>;
}

function CapaPreview() {
  return <div className="phPreview phCapaPreview">
    <div className="phPreviewTitle"><strong>Interactive RCA-8D</strong><span>Guided</span></div>
    <div className="phEightD">{["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"].map((step, index) => <span className={index < 4 ? "active" : ""} key={step}>{step}</span>)}</div>
    <div className="phCause"><i/><div><b>Evidence</b><small>Cause and effect</small></div><i/><div><b>Action</b><small>Verified effectiveness</small></div></div>
    <div className="phCommercial"><b>RCA Practitioner Training</b><span>£49.99</span></div>
  </div>;
}

function SafetyPreview() {
  const cells = [5,10,15,20,25,4,8,12,16,20,3,6,9,12,15,2,4,6,8,10,1,2,3,4,5];
  return <div className="phPreview phSafetyPreview">
    <div className="phPreviewTitle"><strong>Risk assessment matrix</strong><span>5 × 5</span></div>
    <div className="phSafetyBody"><div className="phMiniMatrix">{cells.map((score, index) => <span className={score >= 15 ? "red" : score >= 10 ? "orange" : score >= 5 ? "amber" : "green"} key={`${score}-${index}`}>{score}</span>)}</div><div className="phSafetySteps"><span>Identify</span><span>Assess</span><span>Control</span><span>Review</span></div></div>
    <div className="phCommercial"><b>Interactive training</b><span>From £12.99</span></div>
  </div>;
}

function ContinuityPreview() {
  return <div className="phPreview phContinuityPreview">
    <div className="phPreviewTitle"><strong>ISO 22301 readiness</strong><span>56 checks</span></div>
    <div className="phJourney"><span><b>01</b>BIA</span><span><b>02</b>Risk</span><span><b>03</b>Strategy</span><span><b>04</b>Exercise</span></div>
    <div className="phReadiness"><div><strong>Clauses 4–10</strong><small>Evidence-led gap analysis</small></div><b>ISO 22301</b></div>
    <div className="phCommercial"><b>Business continuity assessment</b><span>Available now</span></div>
  </div>;
}

function SecurityPreview() {
  return <div className="phPreview phSecurityPreview">
    <div className="phPreviewTitle"><strong>Information security assurance</strong><span>ISO/IEC 27001</span></div>
    <div className="phSecurityGrid"><span><b>Gap</b><small>Readiness</small></span><span><b>Risk</b><small>Treatment</small></span><span><b>SoA</b><small>93 controls</small></span></div>
    <div className="phControlLine"><span>Identify</span><i/><span>Assess</span><i/><span>Treat</span><i/><span>Assure</span></div>
    <div className="phCommercial"><b>Connected ISMS workspace</b><span>Explore now</span></div>
  </div>;
}

function AerospacePreview() {
  return <div className="phPreview phAerospacePreview">
    <div className="phPreviewTitle"><strong>AS9100 assurance</strong><span>Coming soon</span></div>
    <div className="phAerospaceMark"><span>AS</span><strong>9100</strong><small>Aerospace · Aviation · Defence</small></div>
    <div className="phLaunch"><span>Quality</span><span>Product safety</span><span>Configuration</span><span>Risk</span></div>
    <div className="phCommercial"><b>New specialist hub</b><span>Follow development</span></div>
  </div>;
}

const hubs = [
  {
    number: "01",
    tone: "audit",
    eyebrow: "AUDIT & ASSURANCE",
    title: "Internal Audit Hub",
    text: "Plan audit programmes, test objective evidence, control findings and verify follow-up in one traceable workspace.",
    points: ["Audit programme", "Fieldwork and evidence", "Findings and reports"],
    href: "/internal-audit",
    training: "£19.99 refresher training",
    preview: <AuditPreview/>,
  },
  {
    number: "02",
    tone: "capa",
    eyebrow: "PROBLEM SOLVING",
    title: "CAPA-8D Hub",
    text: "Move from containment to evidence-based causal analysis, accountable action and independent effectiveness review.",
    points: ["Guided D1–D8 workflow", "Cause analysis tools", "Effectiveness verification"],
    href: "/capa-8d",
    training: "£49.99 practitioner training",
    preview: <CapaPreview/>,
  },
  {
    number: "03",
    tone: "safety",
    eyebrow: "HEALTH & SAFETY",
    title: "Health & Safety Hub",
    text: "Control workplace risk through structured assessment, owned action, management attention and practical competence.",
    points: ["Risk assessments", "Actions and verification", "Training and certificates"],
    href: "/hs-hub",
    training: "Training from £12.99",
    preview: <SafetyPreview/>,
  },
  {
    number: "04",
    tone: "continuity",
    eyebrow: "BUSINESS RESILIENCE",
    title: "Business Continuity Planning Hub",
    text: "Assess ISO 22301 readiness, connect evidence to continuity priorities and turn plans into demonstrated response and recovery capability.",
    points: ["ISO 22301 gap analysis", "Business impact and disruption risk", "Plans and exercising"],
    href: "/business-continuity",
    training: "ISO 22301 available now",
    preview: <ContinuityPreview/>,
  },
  {
    number: "05",
    tone: "security",
    eyebrow: "INFORMATION SECURITY",
    title: "Information Security Hub",
    text: "Connect ISO/IEC 27001 gap analysis, information-security risk and the Statement of Applicability in one evidence-led assurance journey.",
    points: ["ISO/IEC 27001 gap analysis", "Risk assessment and treatment", "Statement of Applicability"],
    href: "/information-security",
    training: "Gap analysis · Risk · SoA",
    preview: <SecurityPreview/>,
  },
  {
    number: "06",
    tone: "aerospace",
    eyebrow: "SPECIALIST ASSURANCE",
    title: "AS9100 Aerospace & Defence Hub",
    text: "A specialist assurance workspace for aerospace, aviation, military and defence quality, product-safety and operational-control requirements.",
    points: ["Aerospace quality", "Product safety", "Configuration and risk"],
    href: "/as9100-hub",
    training: "Register interest",
    linkLabel: "Coming soon · Follow development →",
    preview: <AerospacePreview/>,
  },
];

export default function PlatformHubsFeature({ locale = "en" }) {
  return <section className="platformHubs" id="platform-hubs" aria-labelledby="platform-hubs-title">
    <style>{`
      .platformHubs{padding:54px 3.3vw 48px;background:linear-gradient(180deg,#f7fbff,#fff)}.phHeading{display:flex;align-items:end;justify-content:space-between;gap:28px;margin-bottom:25px}.phKicker{color:#1762ef;font-size:11px;font-weight:950;letter-spacing:.17em}.phHeading h2{margin:8px 0 0;color:#071d3a;font-size:clamp(34px,3.5vw,55px);line-height:1;letter-spacing:-.045em}.phHeading>p{max-width:520px;margin:0;color:#5b728a;line-height:1.55}.phGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.phCard{position:relative;overflow:hidden;display:flex;flex-direction:column;min-width:0;padding:23px;border-radius:19px;color:#fff;box-shadow:0 18px 42px #092d541c}.phCard:after{content:"";position:absolute;width:220px;height:220px;border:34px solid #ffffff0c;border-radius:50%;right:-130px;top:-120px}.phCard.audit{background:linear-gradient(145deg,#075ccf,#123f91)}.phCard.capa{background:linear-gradient(145deg,#078b75,#075e56)}.phCard.safety{background:linear-gradient(145deg,#07385c,#086e69)}.phCard.continuity{background:linear-gradient(145deg,#5634b8,#2f237d)}.phCard.security{background:linear-gradient(145deg,#08758d,#06455f)}.phCard.aerospace{background:linear-gradient(145deg,#27364d,#101c2d)}.phCardTop{position:relative;z-index:1;display:grid;grid-template-columns:43px 1fr;gap:12px}.phNumber{display:grid;place-items:center;width:43px;height:43px;border:1px solid #ffffff75;border-radius:50%;font-size:13px;font-weight:950}.phEyebrow{display:block;margin-bottom:4px;color:#cde2ff;font-size:9px;font-weight:950;letter-spacing:.13em}.phCard h3{margin:0;font-size:25px;line-height:1.05}.phCard>p{position:relative;z-index:1;min-height:65px;margin:15px 0 12px;color:#e5f0fb;font-size:13px;line-height:1.5}.phPoints{position:relative;z-index:1;display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.phPoints span{padding:6px 8px;border:1px solid #ffffff38;border-radius:999px;background:#ffffff0f;font-size:9px;font-weight:800}.phPreview{position:relative;z-index:1;min-height:205px;margin-top:auto;padding:14px;border-radius:13px;background:#fff;color:#0c2949;box-shadow:0 10px 24px #03183026}.phPreviewTitle{display:flex;justify-content:space-between;gap:10px;align-items:center;padding-bottom:9px;border-bottom:1px solid #e1e9f0}.phPreviewTitle strong{font-size:13px}.phPreviewTitle span{padding:4px 7px;border-radius:999px;background:#edf3f8;color:#536d84;font-size:8px;font-weight:850}.phAuditRow{display:flex;justify-content:space-between;gap:9px;padding:9px 2px;border-bottom:1px solid #edf2f6;font-size:10px}.phAuditRow em{padding:3px 6px;border-radius:999px;background:#eef3f8;color:#546b80;font-style:normal;font-size:8px}.phAuditRow em.complete{background:#dcf6eb;color:#06734f}.phAuditRow em.in-progress{background:#e6efff;color:#1757bd}.phCommercial{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:11px;padding:8px;border-radius:8px;background:#eef5ff}.phCommercial b{font-size:10px}.phCommercial span{color:#075f43;font-size:9px;font-weight:950}.phEightD{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:15px}.phEightD span{display:grid;place-items:center;height:36px;border-radius:5px;background:#e5eeed;color:#68827f;font-size:9px;font-weight:950}.phEightD span.active{background:#13a184;color:#fff}.phCause{display:grid;grid-template-columns:25px 1fr 25px 1fr;gap:8px;align-items:center;margin-top:18px;padding:12px;border-radius:9px;background:#eef8f5}.phCause i{width:20px;height:20px;border-radius:50%;background:conic-gradient(#0b8b74 0 70%,#cfe7e1 70%)}.phCause b,.phCause small{display:block}.phCause b{font-size:10px}.phCause small{margin-top:2px;color:#667e7a;font-size:8px}.phSafetyBody{display:grid;grid-template-columns:1.2fr .8fr;gap:11px;margin-top:12px}.phMiniMatrix{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}.phMiniMatrix span{display:grid;place-items:center;min-height:24px;border-radius:3px;color:#fff;font-size:7px;font-weight:950}.phMiniMatrix .green{background:#36a875}.phMiniMatrix .amber{background:#efb82f;color:#3f2a00}.phMiniMatrix .orange{background:#e96435}.phMiniMatrix .red{background:#bd2b21}.phSafetySteps{display:grid;gap:4px}.phSafetySteps span{display:flex;align-items:center;padding:5px;border-radius:5px;background:#edf5f6;color:#326463;font-size:8px;font-weight:850}.phJourney{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px}.phJourney span,.phSecurityGrid span{display:grid;gap:5px;place-items:center;padding:13px 5px;border-radius:7px;background:#eef0ff;color:#4b369d;font-size:8px;font-weight:900}.phJourney b{font-size:13px}.phReadiness{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:12px;border-radius:9px;background:#f2efff}.phReadiness strong,.phReadiness small{display:block}.phReadiness small{margin-top:3px;color:#6f668d;font-size:8px}.phReadiness>b{color:#5535b4;font-size:12px}.phSecurityGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:14px}.phSecurityGrid span{background:#e9f7fa;color:#09657a}.phSecurityGrid b,.phSecurityGrid small{display:block}.phSecurityGrid b{font-size:13px}.phSecurityGrid small{color:#5a7a82;font-size:8px}.phControlLine{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:18px;color:#426978;font-size:8px;font-weight:850}.phControlLine i{flex:1;height:2px;background:#add5dc}.phAerospaceMark{display:grid;grid-template-columns:auto 1fr;align-items:baseline;margin-top:14px;padding:14px;border-radius:9px;background:#edf1f6}.phAerospaceMark span{color:#3e536c;font-size:14px;font-weight:950}.phAerospaceMark strong{color:#12243a;font-size:32px}.phAerospaceMark small{grid-column:1/-1;color:#617387;font-size:8px}.phLaunch{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}.phLaunch span{padding:8px;border-radius:6px;background:#f2f5f8;color:#41566d;font-size:8px;font-weight:850}.phLink{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;margin-top:15px;color:#fff;font-size:13px;font-weight:950}.phLink small{color:#cde3ee;font-size:9px}.phShared{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-top:16px;padding:16px 20px;border:1px solid #ccdeed;border-radius:14px;background:#edf6ff}.phSharedTitle{white-space:nowrap;color:#0c3b72;font-size:13px;font-weight:950}.phServices{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.phServices span{display:grid;place-items:center;min-height:37px;padding:7px;border-radius:8px;background:#fff;color:#345776;text-align:center;font-size:9px;font-weight:850}.phProcess{display:grid;grid-template-columns:auto repeat(5,1fr);gap:10px;align-items:center;margin-top:16px;padding:13px 16px;border-top:1px solid #d5e3ee;border-bottom:1px solid #d5e3ee}.phProcess>strong{color:#102e4f;font-size:12px}.phProcess span{display:flex;align-items:center;justify-content:center;gap:7px;color:#42627e;font-size:10px;font-weight:850}.phProcess i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#e8f0ff;color:#1762ef;font-size:8px;font-style:normal}.phProof{display:grid;grid-template-columns:1.1fr repeat(3,.7fr) 1.4fr;gap:10px;align-items:center;margin-top:15px;padding:16px 20px;border-radius:14px;background:#092b53;color:#fff}.phProofLead strong,.phProofLead span{display:block}.phProofLead span{margin-top:3px;color:#bcd0e4;font-size:9px}.phMetric{padding-left:13px;border-left:1px solid #ffffff2e}.phMetric b,.phMetric span{display:block}.phMetric b{font-size:18px}.phMetric span{margin-top:3px;color:#c7d7e7;font-size:8px}.phProofLink{justify-self:end;padding:10px 13px;border-radius:8px;background:#1762ef;color:#fff;font-size:10px;font-weight:900}@media(max-width:1100px){.phGrid{grid-template-columns:1fr}.phCard>p{min-height:0}.phPreview{min-height:0}.phShared{grid-template-columns:1fr}.phServices{grid-template-columns:repeat(3,1fr)}.phProof{grid-template-columns:1fr repeat(3,1fr)}.phProofLink{grid-column:1/-1;justify-self:start}}@media(max-width:700px){.platformHubs{padding:38px 18px}.phHeading{display:block}.phHeading>p{margin-top:15px}.phServices{grid-template-columns:1fr 1fr}.phProcess{grid-template-columns:1fr 1fr}.phProcess>strong{grid-column:1/-1}.phProof{grid-template-columns:1fr}.phMetric{padding:8px 0 0;border-left:0;border-top:1px solid #ffffff2e}.phProofLink{grid-column:auto}.phCard{padding:18px}}
    `}</style>
    <header className="phHeading"><div><span className="phKicker">RPG EXCELLENCE PLATFORM</span><h2 id="platform-hubs-title">One platform. Six connected assurance hubs.</h2></div><p>Choose the workspace that matches the work. Shared evidence, actions and insight connect the full assurance process.</p></header>
    <div className="phGrid">{hubs.map((hub) => <article className={`phCard ${hub.tone}`} key={hub.title}><div className="phCardTop"><span className="phNumber">{hub.number}</span><div><span className="phEyebrow">{hub.eyebrow}</span><h3>{hub.title}</h3></div></div><p>{hub.text}</p><div className="phPoints">{hub.points.map((point) => <span key={point}>{point}</span>)}</div>{hub.preview}<Link className="phLink" href={hub.href.startsWith("/portal") ? hub.href : `/${locale}${hub.href}`}><span>{hub.linkLabel || "Explore hub →"}</span><small>{hub.training}</small></Link></article>)}</div>
    <div className="phShared"><strong className="phSharedTitle">SHARED PLATFORM SERVICES</strong><div className="phServices">{sharedServices.map((service) => <span key={service}>{service}</span>)}</div></div>
    <div className="phProcess"><strong>Controlled improvement process</strong>{[["01","Assess"],["02","Evidence"],["03","Improve"],["04","Verify"],["05","Sustain"]].map(([number,label]) => <span key={number}><i>{number}</i>{label}</span>)}</div>
    <div className="phProof"><div className="phProofLead"><strong>Evidence that supports decisions</strong><span>One controlled record across every hub</span></div><div className="phMetric"><b>6</b><span>Assurance hubs</span></div><div className="phMetric"><b>5</b><span>Shared services</span></div><div className="phMetric"><b>1</b><span>Assurance record</span></div><Link className="phProofLink" href="/portal">Open the platform →</Link></div>
  </section>;
}
