const iconPaths = [
  "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  "M12 3 2 21h20L12 3zM12 9v5M12 17v.5",
  "M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4zM8 12l3 3 5-6",
  "M9 3H5v18h14V3h-4M9 2h6v4H9zM8 11h8M8 15h5",
  "M4 20V10M10 20V4M16 20v-7M22 20H2",
  "M4 5h16v14H4zM4 10h16M9 5v14",
  "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5",
];

export default function BCPModuleNavigation({ moduleNumber, title, percent, steps, checks = [], activeStep, onSelect, children }) {
  const progress = Math.max(0, Math.min(100, Number(percent) || 0));
  return <section className="bcpModuleNavigation" aria-label={`${title} navigation`}>
    <header className="bcpModuleHero">
      <div><small>BCP MODULE {moduleNumber}</small><h2>{title}</h2><p>Select a section to view and edit its information.</p></div>
      <div className="bcpModuleCompletion"><strong>{progress}%</strong><span>complete</span><div role="progressbar" aria-label="Module completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{width: `${progress}%`}} /></div></div>
      <div className="bcpModuleOutputs">{children}</div>
    </header>
    <nav className="bcpStepCards" aria-label={`Module ${moduleNumber} sections`}>
      {steps.map((item, index) => {
        const label = typeof item === "string" ? item : item.label;
        const hint = typeof item === "string" ? "" : item.hint;
        const complete = Boolean(checks[index]);
        return <button key={`${index}-${label}`} type="button" className={`bcpStepCard tone${index % 4}${activeStep === index ? " active" : ""}`} aria-current={activeStep === index ? "step" : undefined} onClick={() => onSelect(index)}>
          <svg className="bcpStepIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[index % iconPaths.length]} /></svg>
          <span className="bcpStepCopy"><strong>{label}</strong>{hint && <small>{hint}</small>}<em>{complete ? "✓ Complete" : "To complete"}{activeStep === index ? " · Current section" : ""}</em></span>
          <span className="bcpStepNumber" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        </button>;
      })}
    </nav>
    <style>{styles}</style>
  </section>;
}

const styles = `
.bcpCardLayout.bcpCardLayout{display:block!important;min-width:0;max-width:100%}
.bcpModuleNavigation.bcpModuleNavigation{margin:0 0 24px;min-width:0;color:#0a2342}
.bcpModuleNavigation .bcpModuleHero{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:20px;padding:24px;border-radius:17px;background:#0b2d56;color:white}
.bcpModuleHero small{color:#67e1d2;font-size:11px;font-weight:900;letter-spacing:.12em}
.bcpModuleHero h2{margin:7px 0;font-size:27px;line-height:1.2;color:white}
.bcpModuleHero p{margin:0;font-size:13px;line-height:1.5;color:#c2d4e5}
.bcpModuleCompletion{align-self:center}.bcpModuleCompletion strong{font-size:30px}.bcpModuleCompletion span{margin-left:8px;font-size:12px;color:#c2d4e5}
.bcpModuleCompletion>div{height:6px;margin-top:12px;border-radius:6px;background:#ffffff25;overflow:hidden}.bcpModuleCompletion i{display:block;height:100%;background:#55e1d4}
.bcpModuleNavigation .bcpModuleOutputs{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-top:1px solid #ffffff25;padding-top:14px;font-size:11px}
.bcpModuleOutputs>b,.bcpModuleOutputs>strong{margin-right:5px;color:#67e1d2}.bcpModuleOutputs>span{padding:7px 9px;border-radius:7px;background:#ffffff0c;color:#d5e3ef}.bcpModuleOutputs>span.ready{background:#0d715d;color:#dffff8}
.bcpModuleNavigation nav.bcpStepCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 0;overflow:visible}
.bcpModuleNavigation .bcpStepCards button.bcpStepCard{--accent:#315fe6;--tint:#eef3ff;position:relative;display:flex;align-items:flex-start;gap:12px;min-width:0;width:100%;min-height:108px;justify-content:flex-start;padding:16px;border:1px solid #ccdbe8;border-radius:12px;background:white;color:#173b60;text-align:left;font:inherit;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.bcpModuleNavigation .bcpStepCards .tone1{--accent:#098a76;--tint:#e7f8f3}.bcpModuleNavigation .bcpStepCards .tone2{--accent:#8050c3;--tint:#f3ecff}.bcpModuleNavigation .bcpStepCards .tone3{--accent:#ba7215;--tint:#fff5e5}
.bcpModuleNavigation .bcpStepCards button.active{border:2px solid #315fe6;padding:15px;box-shadow:0 0 0 3px #315fe610;background:#f8fbff}
.bcpModuleNavigation .bcpStepCards button:hover{border-color:var(--accent)}.bcpModuleNavigation .bcpStepCards button:focus-visible{outline:3px solid #168aab;outline-offset:3px}
.bcpStepIcon{flex:0 0 38px;width:38px;height:38px;padding:8px;border-radius:10px;background:var(--tint);color:var(--accent)}
.bcpModuleNavigation .bcpStepCards button>span.bcpStepNumber{display:block}.bcpModuleNavigation .bcpStepCards button>span.bcpStepCopy{display:grid;gap:5px;min-width:0;padding-right:12px}.bcpStepCopy strong{display:block;font-size:13px;line-height:1.4;overflow-wrap:anywhere}.bcpModuleNavigation .bcpStepCards .bcpStepCopy small{display:block;font-size:11px;line-height:1.4;color:#62788e}.bcpStepCopy em{font-size:10px;font-style:normal;color:#487260;line-height:1.4}
.bcpStepNumber{position:absolute;right:8px;top:8px;font-size:10px;color:#70879b}
@media(max-width:1100px){.bcpModuleNavigation nav.bcpStepCards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.bcpModuleNavigation nav.bcpStepCards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bcpModuleNavigation .bcpModuleHero{padding:18px;grid-template-columns:minmax(0,1fr)}.bcpModuleHero h2{font-size:24px}.bcpModuleCompletion{max-width:230px}.bcpModuleNavigation .bcpStepCards button.bcpStepCard{padding:13px;gap:8px;min-height:112px}.bcpModuleNavigation .bcpStepCards button.active{padding:12px}.bcpStepIcon{flex-basis:30px;width:30px;height:30px;padding:6px}.bcpStepCopy strong{font-size:12px}.bcpStepCopy small{font-size:10px}.bcpModuleNavigation{margin-bottom:16px!important}}
@media(max-width:360px){.bcpModuleNavigation nav.bcpStepCards{grid-template-columns:minmax(0,1fr)}}
@media print{.bcpModuleNavigation nav.bcpStepCards{display:none}.bcpModuleHero{break-inside:avoid}}
`;
