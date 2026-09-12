import Link from "next/link";

const matrix = [
  [5, 10, 15, 20, 25],
  [4, 8, 12, 16, 20],
  [3, 6, 9, 12, 15],
  [2, 4, 6, 8, 10],
  [1, 2, 3, 4, 5],
];

function riskTone(score) {
  if (score >= 15) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

const features = [
  ["assessment", "Risk Assessments"],
  ["matrix", "Interactive 5×5 Matrix"],
  ["actions", "Action Tracking"],
  ["training", "Training & Certificates"],
];

export default function HsHubFeature({ locale = "en" }) {
  return <section className="homeHsHub" aria-labelledby="home-hs-hub-title">
    <style>{`
      .homeHsHub{padding:28px clamp(20px,4vw,56px) 0;background:#fff}.homeHsHubInner{position:relative;overflow:hidden;max-width:1600px;margin:auto;padding:40px;border:1px solid #cfe0ef;border-radius:22px;background:radial-gradient(circle at 78% 20%,#dcecff 0,transparent 28%),linear-gradient(120deg,#f2f8fd,#eaf4fb);box-shadow:0 18px 45px #17395d12}.homeHsHubInner:after{content:"";position:absolute;width:360px;height:360px;border:55px solid #ffffff70;border-radius:50%;right:-190px;bottom:-260px}.homeHsHubLayout{position:relative;z-index:1;display:grid;grid-template-columns:1.14fr .86fr;gap:38px;align-items:center}.homeHsHubEyebrow{display:flex;align-items:center;gap:9px;color:#1459d9;font-size:11px;font-weight:950;letter-spacing:.15em}.homeHsHubEyebrow b{padding:6px 8px;border-radius:999px;background:#079669;color:#fff;font-size:9px;letter-spacing:.1em}.homeHsHub h2{max-width:760px;margin:14px 0 13px;color:#071d3a;font-size:clamp(36px,4vw,58px);line-height:1.02;letter-spacing:-.045em}.homeHsHub h2 span{color:#078d65}.homeHsHubLead{max-width:730px;margin:0;color:#49627b;font-size:17px;line-height:1.62}.homeHsHubActions{display:flex;gap:11px;flex-wrap:wrap;margin-top:23px}.homeHsHubButton{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 18px;border-radius:10px;background:#079669;color:#fff;font-weight:900;box-shadow:0 9px 20px #087c5723}.homeHsHubButton.secondary{background:#fff;color:#1459d9;border:1px solid #9cbce4;box-shadow:none}.homeHsHubFeatures{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:25px}.homeHsHubFeature{display:flex;align-items:center;gap:9px;min-height:58px;padding:10px;border:1px solid #d8e5f0;border-radius:11px;background:#ffffffbf;color:#183b5e;font-size:11px;font-weight:850}.homeHsHubIcon{position:relative;flex:0 0 30px;width:30px;height:30px;border-radius:8px;background:#e5efff}.homeHsHubIcon:before,.homeHsHubIcon:after{content:"";position:absolute}.homeHsHubIcon.assessment:before{inset:7px 8px;border:2px solid #1762ef;border-radius:3px}.homeHsHubIcon.assessment:after{width:8px;height:4px;border-left:2px solid #079669;border-bottom:2px solid #079669;transform:rotate(-45deg);left:11px;top:11px}.homeHsHubIcon.matrix:before{inset:7px;background:linear-gradient(90deg,#1762ef 42%,transparent 42% 58%,#1762ef 58%),linear-gradient(#1762ef 42%,transparent 42% 58%,#1762ef 58%);border-radius:2px}.homeHsHubIcon.actions:before{left:9px;top:8px;width:13px;height:2px;background:#1762ef;box-shadow:0 6px #1762ef,0 12px #1762ef}.homeHsHubIcon.actions:after{left:6px;top:8px;width:2px;height:2px;background:#079669;box-shadow:0 6px #079669,0 12px #079669}.homeHsHubIcon.training:before{left:6px;top:8px;border-left:9px solid transparent;border-right:9px solid transparent;border-top:7px solid #1762ef}.homeHsHubIcon.training:after{left:10px;top:14px;width:10px;height:7px;border-bottom:3px solid #079669;border-radius:0 0 5px 5px}.homeHsHubVisual{padding:17px;border:1px solid #d2e1ed;border-radius:17px;background:#fff;box-shadow:0 20px 42px #173a6020}.homeHsHubVisualHead{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:12px}.homeHsHubVisualHead strong{color:#071d3a;font-size:17px}.homeHsHubPrice{padding:7px 9px;border-radius:999px;background:#e4f7ef;color:#087b59;font-size:10px;font-weight:900}.homeHsHubMatrixWrap{display:grid;grid-template-columns:22px 1fr;gap:7px}.homeHsHubY{display:grid;place-items:center;color:#5f7489;font-size:8px;font-weight:900;writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:.08em}.homeHsHubMatrix{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}.homeHsHubCell{aspect-ratio:1.38;border-radius:5px;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:900}.homeHsHubCell.low{background:#35a56f}.homeHsHubCell.medium{background:#f0b429;color:#3a2800}.homeHsHubCell.high{background:#e35d2f}.homeHsHubCell.critical{background:#b42318}.homeHsHubX{text-align:center;margin:7px 0 0 29px;color:#5f7489;font-size:8px;font-weight:900;letter-spacing:.08em}.homeHsHubLegend{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:13px}.homeHsHubLegend span{padding:6px 3px;border-radius:7px;text-align:center;background:#f1f5f9;color:#50657b;font-size:8px;font-weight:850}.homeHsHubVisualFoot{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:14px;padding-top:13px;border-top:1px solid #e5edf4}.homeHsHubVisualFoot div{display:flex;gap:16px}.homeHsHubVisualFoot span{color:#60768d;font-size:9px}.homeHsHubVisualFoot b{color:#079669;font-size:10px}.homeHsHubBridge{max-width:1600px;margin:18px auto 0;display:flex;align-items:center;gap:14px;color:#46627d;font-size:11px;font-weight:800;letter-spacing:.03em}.homeHsHubBridge:before,.homeHsHubBridge:after{content:"";height:1px;flex:1;background:#d8e4ef}@media(max-width:1050px){.homeHsHubLayout{grid-template-columns:1fr}.homeHsHubFeatures{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.homeHsHub{padding:18px 14px 0}.homeHsHubInner{padding:25px 18px}.homeHsHubFeatures{grid-template-columns:1fr}.homeHsHubVisualFoot{display:block}.homeHsHubVisualFoot div{margin-bottom:8px}.homeHsHubBridge{text-align:center}.homeHsHub h2{font-size:38px}}
    `}</style>
    <style>{`
      .homeHsHub{padding-left:3.3vw;padding-right:3.3vw}
      .homeHsHubInner{width:100%;max-width:none;margin:0;padding-left:clamp(34px,3vw,58px);padding-right:clamp(34px,3vw,58px)}
      .homeHsHubLayout{grid-template-columns:minmax(0,1.08fr) minmax(440px,.92fr);gap:clamp(38px,4vw,78px)}
      .homeHsHub h2{max-width:820px}
      .homeHsHubLead{max-width:790px}
      .homeHsHubBridge{width:100%;max-width:none;margin-left:0;margin-right:0}
      @media(max-width:1050px){.homeHsHubLayout{grid-template-columns:1fr}}
      @media(max-width:620px){.homeHsHub{padding-left:14px;padding-right:14px}.homeHsHubInner{padding-left:18px;padding-right:18px}}
    `}</style>
    <div className="homeHsHubInner">
      <div className="homeHsHubLayout">
        <div>
          <div className="homeHsHubEyebrow"><b>NEW</b> HEALTH & SAFETY</div>
          <h2>H&S Hub: turn workplace risk into <span>controlled action.</span></h2>
          <p className="homeHsHubLead">Create, approve, communicate and review workplace risk assessments—then build capable assessors through practical interactive training.</p>
          <div className="homeHsHubActions">
            <Link className="homeHsHubButton" href={`/${locale}/hs-hub`}>Explore the H&S Hub →</Link>
            <Link className="homeHsHubButton secondary" href={`/${locale}/hs-hub/training`}>Start Risk Assessment Training</Link>
          </div>
          <div className="homeHsHubFeatures">
            {features.map(([icon,label])=><div className="homeHsHubFeature" key={label}><i className={`homeHsHubIcon ${icon}`}/><span>{label}</span></div>)}
          </div>
        </div>
        <div className="homeHsHubVisual" aria-label="Risk matrix preview">
          <div className="homeHsHubVisualHead"><strong>Interactive 5×5 Risk Matrix</strong><span className="homeHsHubPrice">Training from £19.99 + VAT</span></div>
          <div className="homeHsHubMatrixWrap"><div className="homeHsHubY">LIKELIHOOD</div><div className="homeHsHubMatrix">{matrix.flatMap((row,rowIndex)=>row.map((score,columnIndex)=><span className={`homeHsHubCell ${riskTone(score)}`} key={`${rowIndex}-${columnIndex}`}>{score}</span>))}</div></div>
          <div className="homeHsHubX">SEVERITY →</div>
          <div className="homeHsHubLegend"><span>Acceptable 1–4</span><span>Adequate 5–9</span><span>Inadequate 10–14</span><span>Unacceptable 15–25</span></div>
          <div className="homeHsHubVisualFoot"><div><span>Assess</span><span>Control</span><span>Train</span><span>Improve</span></div><b>Suitable and sufficient →</b></div>
        </div>
      </div>
    </div>
    <div className="homeHsHubBridge"><span>Operational tools work alongside your management systems</span></div>
  </section>;
}
