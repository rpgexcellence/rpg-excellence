"use client";

import { archiveAssessment, deleteDraftAssessment, restoreAssessment } from "./actions";

export default function AssessmentRecordControls({ assessmentId, completed, archived }) {
  if (archived) {
    return <form action={restoreAssessment}><input type="hidden" name="assessment_id" value={assessmentId}/><button className="gapUtility restore">Restore</button></form>;
  }
  return <div className="gapControls">
    <form action={archiveAssessment} onSubmit={(event) => { if (!window.confirm("Archive this assessment? It will move to the Archived view and can be restored.")) event.preventDefault(); }}><input type="hidden" name="assessment_id" value={assessmentId}/><button className="gapUtility">Archive</button></form>
    {!completed ? <form action={deleteDraftAssessment} onSubmit={(event) => { if (!window.confirm("Permanently delete this empty draft? This cannot be undone.")) event.preventDefault(); }}><input type="hidden" name="assessment_id" value={assessmentId}/><button className="gapUtility delete">Delete</button></form> : null}
  </div>;
}
