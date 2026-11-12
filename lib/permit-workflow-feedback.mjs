const STAGES = new Set(['definition', 'verification', 'issue', 'handback']);

export function permitWorkflowRedirect(id, message, stage = 'verification', blockers = []) {
  const query = new URLSearchParams({workflowError: message, workflowStage: STAGES.has(stage) ? stage : 'verification'});
  if (blockers.length) query.set('workflowBlockers', JSON.stringify([...new Set(blockers)]));
  return `/portal/health-safety/permits/${encodeURIComponent(id)}?${query}`;
}

export function permitWorkflowFeedback(query, {id, canEditDefinition = false} = {}) {
  if (!query?.workflowError) return null;
  const stage = STAGES.has(query.workflowStage) ? query.workflowStage : 'verification';
  let blockers = [];
  try {
    const parsed = JSON.parse(query.workflowBlockers || '[]');
    if (Array.isArray(parsed)) blockers = [...new Set(parsed.filter(value => typeof value === 'string' && value.trim()))];
  } catch {}
  const edit = stage === 'definition' && canEditDefinition;
  return {
    message: String(query.workflowError), blockers,
    href: `/portal/health-safety/permits/${encodeURIComponent(id)}/${edit ? 'edit' : 'controls'}`,
    label: edit ? 'Edit draft permit' : 'Open Safety controls',
    instruction: stage === 'definition'
      ? edit ? 'Complete these items in the draft, save it and then submit it again.' : 'Ask a permit contributor to complete the draft before progressing.'
      : 'Complete the outstanding checks and then return to the permit.',
  };
}
