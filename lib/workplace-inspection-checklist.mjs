// Pure checklist policy: shared by server scheduling and the programme preview.
// This module never writes programmes, inspections, answers or evidence.
export const INSPECTION_PROFILE_PACKS = Object.freeze({
  core: 'CORE_WORKPLACE',
  gas_cylinders: 'COMPRESSED_GASES',
  hazardous_substances: 'CHEMICALS_COSHH',
  machinery: 'MACHINERY_PUWER',
  lifting_equipment: 'LIFTING_LOLER',
  pressure_systems: 'PRESSURE_SYSTEMS',
  welding_hot_work: 'WELDING_HOT_WORK',
  radiation_lasers: 'RADIATION_LASER',
  biological_hazards: 'BIOLOGICAL',
  noise_vibration: 'NOISE_VIBRATION',
  work_at_height: 'WORK_AT_HEIGHT',
  confined_spaces: 'CONFINED_SPACES',
  enhanced_fire_risk: 'FIRE_EMERGENCY',
  material_environmental_aspects: 'ENVIRONMENTAL',
  office_welfare: 'OFFICE_WELFARE',
});

export const INSPECTION_PACK_LABELS = Object.freeze({
  CORE_WORKPLACE: 'Core workplace',
  COMPRESSED_GASES: 'Compressed gases',
  CHEMICALS_COSHH: 'Hazardous substances',
  MACHINERY_PUWER: 'Machinery and equipment',
  LIFTING_LOLER: 'Lifting operations',
  PRESSURE_SYSTEMS: 'Pressure systems',
  WELDING_HOT_WORK: 'Welding and hot work',
  RADIATION_LASER: 'Radiation and lasers',
  BIOLOGICAL: 'Biological hazards',
  NOISE_VIBRATION: 'Noise and vibration',
  WORK_AT_HEIGHT: 'Work at height',
  CONFINED_SPACES: 'Confined spaces',
  FIRE_EMERGENCY: 'Fire and emergency controls',
  ENVIRONMENTAL: 'Environmental controls',
  OFFICE_WELFARE: 'Office and welfare',
});

const unique = values => [...new Set(values.filter(Boolean))];
const inOrganisation = (row, organisationId) =>
  row.organization_id === null || row.organization_id === organisationId;
const orderedQuestions = (a, b) =>
  Number(a.display_order || 0) - Number(b.display_order || 0) ||
  String(a.question_code).localeCompare(String(b.question_code)) ||
  String(a.id).localeCompare(String(b.id));

export function inspectionPackCodes(areaProfile = {}, signalPackCodes = []) {
  const known = new Set(Object.values(INSPECTION_PROFILE_PACKS));
  return unique([
    INSPECTION_PROFILE_PACKS.core,
    ...Object.entries(INSPECTION_PROFILE_PACKS)
      .filter(([key]) => key !== 'core' &&
        (areaProfile?.[key] === true || areaProfile?.[key] === 'true'))
      .map(([, code]) => code),
    ...signalPackCodes.filter(code => known.has(code)),
  ]);
}

/**
 * Resolve a catalogue for exactly one organisation and one controlled template.
 * memberships is the PostgREST shape {pack_id, question: {...}}.
 * selectedPackIds, when supplied, represents the SAVED programme selections:
 * those identities are checked and never silently replaced by another pack.
 * Without saved identities, a unique organisation pack overrides a system pack.
 * Additional-question counts compare each pack with the core pack. Overlap
 * between two specialist packs is counted once in the combined checklist.
 */
export function compileInspectionChecklist({
  organizationId,
  templateId,
  templates = [],
  packCodes = [],
  packs = [],
  memberships = [],
  selectedPackIds = null,
} = {}) {
  if (!organizationId || !templateId) {
    throw new Error('An organisation and inspection template are required.');
  }
  const blockers = [];
  const addBlocker = (code, packCode, message) => {
    if (!blockers.some(item => item.code === code && item.packCode === packCode && item.message === message)) {
      blockers.push({code, packCode, message});
    }
  };
  const output = selected => ({
    ready: blockers.length === 0,
    blockers,
    packs: selected,
    questions: [],
    questionCount: 0,
    sharedQuestionCount: 0,
  });
  const template = templates.find(row => row.id === templateId && inOrganisation(row, organizationId));
  if (!template || template.status !== 'active') {
    addBlocker('template_unavailable', null, 'The selected inspection template is unavailable, inactive or outside this organisation.');
    return output([]);
  }
  const requested = unique(['CORE_WORKPLACE', ...packCodes]);
  const savedIds = selectedPackIds === null ? null : unique(selectedPackIds);
  const visible = packs.filter(row => inOrganisation(row, organizationId));
  if (savedIds !== null) {
    for (const id of savedIds) {
      const pack = visible.find(row => row.id === id && row.active === true);
      if (!pack || !requested.includes(pack.pack_code)) {
        addBlocker('saved_pack_unavailable', null, 'A saved pack selection is unavailable, inactive or outside this programme. Refresh the programme before scheduling.');
      }
    }
  }
  const selected = [];
  for (const code of requested) {
    let candidates = visible.filter(row => row.pack_code === code && row.active === true);
    if (savedIds !== null) {
      candidates = candidates.filter(row => savedIds.includes(row.id));
    } else {
      const local = candidates.filter(row => row.organization_id === organizationId);
      if (local.length) candidates = local;
    }
    if (candidates.length !== 1) {
      addBlocker(candidates.length ? 'ambiguous_pack' : 'missing_pack', code,
        `${INSPECTION_PACK_LABELS[code] || code}: ${candidates.length ? 'more than one active pack matches' : 'no active pack is selected or available'}. Review the programme and question bank.`);
      continue;
    }
    const pack = candidates[0];
    const questions = new Map();
    for (const link of memberships) {
      if (link.pack_id !== pack.id) continue;
      const question = link.question;
      if (!question || question.active !== true || question.template_id !== templateId) continue;
      if (!question.id || !String(question.question_code || '').trim() || !String(question.question_text || '').trim()) {
        addBlocker('invalid_question', code, `${pack.title || code}: an active question is missing its identity, code or text.`);
        continue;
      }
      if (question.response_type && !['yes_no_na', 'pass_fail_na'].includes(question.response_type)) {
        addBlocker('unsupported_response_type', code, `${pack.title || code}: question ${question.question_code} uses a response type this inspection form does not support.`);
      }
      questions.set(question.id, {...question});
    }
    if (!questions.size) {
      addBlocker('empty_pack', code, `${pack.title || code}: no active questions belong to the selected template. Scheduling is blocked until the question bank is corrected.`);
    }
    selected.push({...pack, questions: [...questions.values()].sort(orderedQuestions)});
  }
  const coreIds = new Set(selected.find(row => row.pack_code === 'CORE_WORKPLACE')?.questions.map(row => row.id) || []);
  const questionById = new Map();
  const codeToId = new Map();
  let totalMemberships = 0;
  const resultPacks = selected.map(pack => {
    for (const question of pack.questions) {
      totalMemberships++;
      if (codeToId.has(question.question_code) && codeToId.get(question.question_code) !== question.id) {
        addBlocker('duplicate_question_code', pack.pack_code, `Question code ${question.question_code} identifies different questions. Correct the bank before scheduling.`);
      }
      codeToId.set(question.question_code, question.id);
      const existing = questionById.get(question.id) || {...question, packs: []};
      if (!existing.packs.some(row => row.id === pack.id)) {
        existing.packs.push({id: pack.id, pack_code: pack.pack_code, title: pack.title});
      }
      questionById.set(question.id, existing);
    }
    const additional = pack.questions.filter(row => !coreIds.has(row.id)).length;
    return {
      ...pack,
      questionCount: pack.questions.length,
      additionalQuestionCount: pack.pack_code === 'CORE_WORKPLACE' ? pack.questions.length : additional,
      sharedWithCoreCount: pack.questions.filter(row => coreIds.has(row.id)).length,
    };
  });
  const questions = [...questionById.values()].sort(orderedQuestions);
  if (!questions.length) {
    addBlocker('no_questions', null, 'The programme has no usable inspection questions. No inspection can be scheduled.');
  }
  return {
    ready: blockers.length === 0,
    blockers,
    packs: resultPacks,
    questions,
    questionCount: questions.length,
    sharedQuestionCount: totalMemberships - questions.length,
  };
}

export function requireInspectionChecklist(checklist) {
  if (!checklist?.ready || !checklist.questionCount) {
    throw new Error(checklist?.blockers?.map(item => item.message).join(' ') || 'The inspection checklist is unavailable.');
  }
  return checklist;
}
