export default function WorkplaceInspectionChecklistSummary({checklist, preview = false}) {
  if (!checklist) return null;
  return <section className="wpiChecklist" aria-label={preview ? 'Live checklist preview' : 'Selected checklist packs'}>
    <style>{`
      .wpiChecklist{margin-top:16px;padding:22px;border:1px solid #cfdeea;border-radius:14px;background:#fff;color:#0a2645}
      .wpiChecklistHead{display:flex;align-items:start;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .wpiChecklistHead h2{margin:0;font-size:22px}.wpiChecklistHead p{margin:8px 0 16px;color:#60778f;line-height:1.5;font-size:13px}
      .wpiChecklistTotal{padding:10px 13px;border-radius:10px;background:#edf8f5;color:#087662;font-weight:850;white-space:nowrap}
      .wpiChecklistGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .wpiChecklistPack{min-width:0;padding:14px;border:1px solid #cfe1e9;border-radius:11px;background:#f7fbfd}
      .wpiChecklistPack summary{cursor:pointer;list-style:revert;line-height:1.5}.wpiChecklistPack summary strong{font-size:14px}
      .wpiChecklistPack small{display:block;margin:6px 0;color:#60778f;font-size:12px;line-height:1.5}
      .wpiChecklistPack ol{padding-left:19px;font-size:13px;line-height:1.55}.wpiChecklistPack li{margin:10px 0;overflow-wrap:anywhere}
      .wpiChecklistNote{margin:14px 0 0;color:#60778f;font-size:12px;line-height:1.5}
      .wpiChecklistProblems{margin:10px 0 16px;padding:14px 17px;border:1px solid #efaaa5;border-radius:10px;background:#fff2f1;color:#9b2823;font-size:13px}
      .wpiChecklistProblems ul{margin:8px 0 0;padding-left:20px}.wpiChecklistProblems li{margin:5px 0}
      @media(max-width:1000px){.wpiChecklistGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.wpiChecklist{padding:16px}.wpiChecklistGrid{grid-template-columns:1fr}}
    `}</style>
    <div className="wpiChecklistHead"><div><h2>{preview ? 'Live checklist preview' : 'Selected checklist packs'}</h2><p>{preview ? 'Updates as you select hazards or change the template. Expand a pack to see its questions.' : 'These are the saved programme selections, checked against its inspection template. Expand a pack to review the actual questions.'}</p></div><div className="wpiChecklistTotal" role="status" aria-live="polite">{checklist.questionCount} distinct {checklist.questionCount === 1 ? "question" : "questions"} · {checklist.packs.length} {checklist.packs.length === 1 ? "pack" : "packs"}</div></div>
    {checklist.blockers.length ? <div className="wpiChecklistProblems" role="alert"><strong>Checklist review required before scheduling</strong><ul>{checklist.blockers.map((item,index)=><li key={item.code+'-'+index}>{item.message}</li>)}</ul></div> : null}
    <div className="wpiChecklistGrid">{checklist.packs.map(pack=><details className="wpiChecklistPack" key={pack.id}>
      <summary><strong>{pack.title || pack.pack_code}</strong>
      <small>{pack.pack_code} · {pack.questionCount} {pack.questionCount === 1 ? 'question' : 'questions'}</small>
      <small>{pack.pack_code === 'CORE_WORKPLACE' ? 'Mandatory baseline' : `${pack.additionalQuestionCount} beyond core · ${pack.sharedWithCoreCount} shared with core`}</small></summary>
      {pack.selection_reason ? <small>{pack.selection_reason}</small> : null}
      <ol>{pack.questions.map(question=><li key={question.id}><strong>{question.question_code}</strong> — {question.question_text}</li>)}</ol>
    </details>)}</div>
    <p className="wpiChecklistNote">{checklist.sharedQuestionCount ? 'Questions shared between packs appear only once in the combined checklist. ' : ''}{preview ? 'Connected risk signals may add packs when the plan is saved or refreshed. ' : ''}Changes apply to newly generated inspections. Existing checklists, answers and evidence remain as recorded.</p>
  </section>;
}
