"use client";

import { useMemo, useState } from "react";
import { AUDITOR_ASSESSMENT_CRITERIA, SCORE_GUIDANCE, calculateAuditorAssessment } from "./assessmentModel";

export default function VerificationAssessmentForm({ action, auditors, audits, organizationId, selectedAuditorId, quarterly }) {
  const [scores, setScores] = useState(Object.fromEntries(AUDITOR_ASSESSMENT_CRITERIA.map((item) => [item.number, ""])))
  const calculation = useMemo(() => calculateAuditorAssessment(scores), [scores]);

  return <form action={action} className="avAssessment">
    <input type="hidden" name="organization_id" value={organizationId} />
    <input type="hidden" name="selection_type" value={quarterly ? "quarterly_random" : "manual"} />
    <input type="hidden" name="outcome" value={calculation.outcome} />
    <div className="avGrid3">
      <label><span>Auditor being assessed *</span><select name="auditor_id" required defaultValue={selectedAuditorId || ""}><option value="">Select auditor</option>{auditors.map((auditor) => <option key={auditor.id} value={auditor.id}>{auditor.full_name} · {auditor.auditor_reference}</option>)}</select></label>
      <label><span>Completed audit sampled *</span><select name="sampled_audit_id" required defaultValue=""><option value="">Select completed audit</option>{audits.map((audit) => <option key={audit.id} value={audit.id}>{audit.audit_reference} · {audit.title}</option>)}</select></label>
      <label><span>Assessing lead auditor *</span><input name="assessor_name" required /></label>
    </div>
    <div className="avScoreGuide"><b>Scoring:</b>{Object.entries(SCORE_GUIDANCE).map(([score, text]) => <span key={score}><strong>{score.toUpperCase()}</strong> {text}</span>)}</div>
    <div className="avCriteria">
      {AUDITOR_ASSESSMENT_CRITERIA.map((criterion) => <article key={criterion.number} className={criterion.critical ? "critical" : ""}>
        <div className="avCriterionContext">
          <div className="avCriterionTitle"><b>{String(criterion.number).padStart(2, "0")}</b><div><strong>{criterion.title}</strong><small>Weight {criterion.weight}{criterion.critical ? " · Critical control" : ""}</small></div></div>
          <p className="avCriterionPrompt"><strong>Assess:</strong> {criterion.criteria}</p>
          <p className="avEvidenceExpected"><strong>Evidence expected:</strong> {criterion.evidence}</p>
          <div className="avSpecificScores" aria-label={`Scoring guidance for ${criterion.title}`}>
            <p><b>2</b><span>{criterion.scores[2]}</span></p>
            <p><b>1</b><span>{criterion.scores[1]}</span></p>
            <p><b>0</b><span>{criterion.scores[0]}</span></p>
            <p><b>N/A</b><span>Use only when this activity genuinely did not arise within the sampled audit; explain why exclusion does not weaken the assessment.</span></p>
          </div>
        </div>
        <label><span>Score *</span><select name={`score_${criterion.number}`} required value={scores[criterion.number]} onChange={(event) => setScores((current) => ({ ...current, [criterion.number]: event.target.value }))}><option value="">Select</option><option value="2">2 — demonstrated</option><option value="1">1 — partial</option><option value="0">0 — not demonstrated</option><option value="na">N/A — justified</option></select></label>
        <label><span>Objective evidence / assessor rationale *</span><textarea name={`notes_${criterion.number}`} required rows={3} placeholder={scores[criterion.number] === "na" ? "Explain why this criterion did not arise and why exclusion does not weaken the assessment." : "Reference the records sampled and explain why they support the selected score."} /></label>
      </article>)}
    </div>
    <section className={`avResult ${calculation.outcome}`}><div><small>Controlled result</small><strong>{calculation.complete ? `${calculation.percentage}% · ${calculation.outcome.replace("_", " ")}` : "Complete all 18 criteria"}</strong></div><div><small>Weighted score</small><strong>{calculation.total} / {calculation.maximum}</strong></div><div><small>Critical zeros</small><strong>{calculation.criticalZeros}</strong></div></section>
    <section style={{padding:"18px 20px",border:"1px solid #b9cce2",borderLeft:"5px solid #1761e8",borderRadius:12,background:"#f7faff"}} aria-live="polite">
      <small style={{display:"block",marginBottom:8,color:"#1761e8",fontWeight:900,letterSpacing:".08em"}}>AUTOMATED SCORE EXPLANATION</small>
      <p style={{margin:0,whiteSpace:"pre-line",color:"#29445f",fontSize:14,lineHeight:1.65}}>{calculation.explanation}</p>
      <input type="hidden" name="automated_score_explanation" value={calculation.explanation} />
    </section>
    <div className="avGrid2">
      <label><span>Evidence reviewed *</span><textarea name="evidence_reviewed" required placeholder="Audit plan, agenda, completed checklist, evidence records, findings, report and meeting records." /></label>
      <label><span>Lead-auditor conclusion *</span><textarea name="assessor_conclusion" required placeholder="Explain why the evidence supports the decision and any competence limitations." /></label>
      <label><span>Coaching, mentoring or restrictions</span><textarea name="coaching_actions" placeholder="Required for a failed or conditional result and any critical zero." /></label>
      <label><span>Verification validity</span><select name="validity_months" defaultValue="12"><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option></select></label>
    </div>
    <label className="avConfirm"><input type="checkbox" name="lead_confirmation" required /><span>I confirm I reviewed the sampled audit record and objective evidence, applied the controlled scoring criteria, considered independence and accept accountability for this verification decision.</span></label>
    <button className="avPrimary" disabled={!calculation.complete || calculation.outcome === "pending"}>Record Controlled Verification</button>
  </form>;
}
