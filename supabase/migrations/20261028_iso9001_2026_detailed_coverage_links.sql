-- RPG Excellence | Review of four existing ISO 9001:2026 reference mappings.
-- Repository: supabase/migrations/20261028_iso9001_2026_detailed_coverage_links.sql
-- Uses the organisation's existing controlled Assessment content, not an
-- assertion that the bank exhaustively represents the published standard.
-- Reuses QMS26-8.7 and QMS26-10.2. No questions, answers, findings, approvals,
-- identities, entitlements or RLS policies are created, deleted or rewritten.
-- Existing parent mappings and their process allocations remain unchanged.
-- Revises the confirmed three-column UNIQUE key to include clause.
-- The primary key, row identities, lookup index and foreign keys are retained.

BEGIN;

DO $coverage$
DECLARE
  target_standard uuid;
  target_question uuid;
  item record;
  question_count integer;
  missing_links integer;
  reference_text text;
  mapping_constraint oid;
  mapping_key smallint[];
  key_columns text[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('rpg_iso9001_2026_detailed_coverage_20261028'));
  LOCK TABLE public.internal_audit_question_scope_links IN SHARE ROW EXCLUSIVE MODE;

  SELECT count(*), (array_agg(id))[1]
    INTO question_count, target_standard
  FROM public.internal_audit_standard_catalogue
  WHERE standard_code = 'ISO 9001:2026' AND active IS TRUE;
  IF question_count <> 1 THEN
    RAISE EXCEPTION 'Expected one ISO 9001:2026 catalogue record; found %. No coverage changes saved.', question_count;
  END IF;

  -- Live schema confirmed by the administrator: this key currently permits
  -- only one clause per question / standard / process. Preserve its name and
  -- widen only this known unique constraint. Do not use CASCADE.
  SELECT c.oid, c.conkey INTO mapping_constraint, mapping_key
  FROM pg_constraint c
  WHERE c.conrelid = 'public.internal_audit_question_scope_links'::regclass
    AND c.conname = 'internal_audit_question_scope_question_id_standard_id_scope_key'
    AND c.contype = 'u';
  IF mapping_constraint IS NULL THEN
    RAISE EXCEPTION 'The confirmed mapping unique constraint is unavailable. No schema or coverage changes saved.';
  END IF;
  SELECT array_agg(a.attname::text ORDER BY k.position) INTO key_columns
  FROM unnest(mapping_key) WITH ORDINALITY AS k(column_number, position)
  JOIN pg_attribute a ON a.attrelid = 'public.internal_audit_question_scope_links'::regclass
    AND a.attnum = k.column_number;

  IF key_columns = ARRAY['question_id','standard_id','scope_key']::text[] THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint fk
      WHERE fk.contype = 'f'
        AND fk.confrelid = 'public.internal_audit_question_scope_links'::regclass
        AND fk.confkey = mapping_key
    ) THEN
      RAISE EXCEPTION 'A foreign key depends on the existing three-column mapping key. No schema or coverage changes saved; review the dependency first.';
    END IF;
    ALTER TABLE public.internal_audit_question_scope_links
      DROP CONSTRAINT internal_audit_question_scope_question_id_standard_id_scope_key;
    ALTER TABLE public.internal_audit_question_scope_links
      ADD CONSTRAINT internal_audit_question_scope_question_id_standard_id_scope_key
      UNIQUE (question_id, standard_id, scope_key, clause);
  ELSIF key_columns <> ARRAY['question_id','standard_id','scope_key','clause']::text[] THEN
    RAISE EXCEPTION 'The mapping key has an unexpected definition (%). No schema or coverage changes saved.', key_columns;
  END IF;

  FOR item IN
    SELECT * FROM (VALUES
      ('QMS26-8.7', '8.7', '8.7.1', 'e73ee2e2-bde3-47a3-881a-a719d23ab77c'::uuid),
      ('QMS26-8.7', '8.7', '8.7.2', '732b40db-3379-496d-83d4-6249f3df76c8'::uuid),
      ('QMS26-10.2', '10.2', '10.2.1', '5ecdc1bf-a8e8-4711-8481-d0fa044448cf'::uuid),
      ('QMS26-10.2', '10.2', '10.2.2', '58483cfd-5c04-41d1-9d34-644095c14be9'::uuid)
    ) AS reviewed(question_code, parent_clause, detailed_clause, reference_id)
  LOOP
    SELECT count(*), (array_agg(q.id))[1]
      INTO question_count, target_question
    FROM public.internal_audit_questions q
    WHERE q.standard_id = target_standard
      AND q.question_code = item.question_code
      AND q.clause = item.parent_clause
      AND q.active IS TRUE;
    IF question_count <> 1 THEN
      RAISE EXCEPTION 'Expected one active % question at clause %; found %. No coverage changes saved.',
        item.question_code, item.parent_clause, question_count;
    END IF;

    -- The exact existing reference identities were supplied in the live
    -- diagnostic. A missing, inactive or changed reference is not guessed.
    SELECT concat_ws(E'\n',
      'Requirement: ' || nullif(trim(q.requirement_summary), ''),
      'Audit test: ' || nullif(trim(q.question), ''),
      'Objective evidence: ' || nullif(trim(q.objective_evidence), '')
    ) INTO reference_text
    FROM public.assessment_questions q
    WHERE q.id = item.reference_id
      AND q.standard = 'ISO 9001:2026'
      AND q.active IS TRUE
      AND coalesce(nullif(trim(q.clause_reference), ''), q.question_number) = item.detailed_clause
      AND nullif(trim(q.question), '') IS NOT NULL
      AND nullif(trim(q.requirement_summary), '') IS NOT NULL
      AND nullif(trim(q.objective_evidence), '') IS NOT NULL;
    IF reference_text IS NULL THEN
      RAISE EXCEPTION 'Active controlled Assessment reference % (%) is unavailable or incomplete. No coverage changes saved.',
        item.detailed_clause, item.reference_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.internal_audit_question_scope_links l
      WHERE l.question_id = target_question AND l.standard_id = target_standard
        AND l.clause = item.parent_clause AND nullif(trim(l.scope_key), '') IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'No existing parent process mapping for %. No coverage changes saved.', item.question_code;
    END IF;

    -- Carry every existing parent process assignment forward, including both
    -- CAPA and nonconforming-output allocations where present. Do not replace
    -- or delete the parent, and do not introduce another audit question.
    INSERT INTO public.internal_audit_question_scope_links
      (question_id, standard_id, scope_key, clause, requirement_summary)
    SELECT DISTINCT target_question, target_standard, parent.scope_key,
      item.detailed_clause, reference_text
    FROM public.internal_audit_question_scope_links parent
    WHERE parent.question_id = target_question
      AND parent.standard_id = target_standard
      AND parent.clause = item.parent_clause
      AND nullif(trim(parent.scope_key), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.internal_audit_question_scope_links existing
        WHERE existing.question_id = target_question
          AND existing.standard_id = target_standard
          AND existing.scope_key = parent.scope_key
          AND existing.clause = item.detailed_clause
      )
    ON CONFLICT DO NOTHING;

    -- Never report success if a deployment-specific uniqueness constraint
    -- prevented one question from supporting more than one explicit clause.
    SELECT count(*) INTO missing_links
    FROM (
      SELECT DISTINCT scope_key FROM public.internal_audit_question_scope_links
      WHERE question_id = target_question AND standard_id = target_standard
        AND clause = item.parent_clause AND nullif(trim(scope_key), '') IS NOT NULL
    ) parent
    WHERE NOT EXISTS (
      SELECT 1 FROM public.internal_audit_question_scope_links detail
      WHERE detail.question_id = target_question AND detail.standard_id = target_standard
        AND detail.scope_key = parent.scope_key AND detail.clause = item.detailed_clause
    );
    IF missing_links <> 0 THEN
      RAISE EXCEPTION 'Existing mapping constraints prevent detailed links for %. All changes have been rolled back; inspect the mapping unique constraints before retrying.', item.detailed_clause;
    END IF;
  END LOOP;
END;
$coverage$;

COMMIT;

-- Each of these four reviewed references must report READY. This is a check
-- of these links only, not a declaration that every audit criterion is covered.
WITH reviewed(question_code, detailed_clause) AS (
  VALUES ('QMS26-8.7','8.7.1'), ('QMS26-8.7','8.7.2'),
         ('QMS26-10.2','10.2.1'), ('QMS26-10.2','10.2.2')
)
SELECT 'ISO 9001:2026' AS standard_code, r.detailed_clause AS clause,
  r.question_code, count(DISTINCT l.scope_key) AS mapped_processes,
  CASE WHEN count(DISTINCT l.scope_key) > 0 THEN 'READY' ELSE 'MISSING' END AS readiness
FROM reviewed r
LEFT JOIN public.internal_audit_standard_catalogue c ON c.standard_code = 'ISO 9001:2026' AND c.active IS TRUE
LEFT JOIN public.internal_audit_questions q
  ON q.standard_id = c.id AND q.question_code = r.question_code AND q.active IS TRUE
LEFT JOIN public.internal_audit_question_scope_links l
  ON l.question_id = q.id AND l.standard_id = c.id AND l.clause = r.detailed_clause
GROUP BY r.detailed_clause, r.question_code
ORDER BY r.detailed_clause;
