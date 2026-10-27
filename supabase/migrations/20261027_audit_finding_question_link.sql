-- RPG Excellence | Assessment-style audit fieldwork and shared findings
-- File 1: source-question traceability. Run the COMPLETE file in Supabase SQL Editor.
-- Repository: supabase/migrations/20261027_audit_finding_question_link.sql
-- Additive migration: no record deletion, bulk reclassification, role or RLS changes.
-- Apply before the application replacements in this update.

BEGIN;

DO $preflight$
DECLARE missing text;
BEGIN
  SELECT string_agg(required.name, ', ' ORDER BY required.name)
  INTO missing
  FROM (VALUES
    ('internal_audit_findings'), ('internal_audits'),
    ('internal_audit_questions'), ('internal_audit_answers'),
    ('internal_audit_selected_standards'), ('internal_audit_question_scope_links')
  ) AS required(name)
  WHERE to_regclass('public.' || required.name) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Required existing audit tables are missing: %', missing;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'internal_audit_findings'
      AND column_name = 'source_audit_id'
  ) THEN
    RAISE EXCEPTION 'Apply the earlier NC source audit traceability migration first (20261026_nc_source_audit_traceability.sql).';
  END IF;
END
$preflight$;

ALTER TABLE public.internal_audit_findings
  ADD COLUMN IF NOT EXISTS source_audit_question_id uuid,
  ADD COLUMN IF NOT EXISTS source_audit_question_code text,
  ADD COLUMN IF NOT EXISTS reported_by_user_id uuid;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.internal_audit_findings'::regclass
      AND conname = 'nc_source_audit_question_fk'
  ) THEN
    ALTER TABLE public.internal_audit_findings
      ADD CONSTRAINT nc_source_audit_question_fk
      FOREIGN KEY (source_audit_question_id)
      REFERENCES public.internal_audit_questions(id) ON DELETE SET NULL;
  END IF;
END
$constraints$;

CREATE INDEX IF NOT EXISTS nc_source_audit_question_idx
  ON public.internal_audit_findings
    (organization_id, source_audit_id, source_audit_question_id)
  WHERE source_audit_question_id IS NOT NULL;

COMMENT ON COLUMN public.internal_audit_findings.source_audit_question_id IS
  'Originating audit question. Existing answer_id and audit_id links remain supported. Multiple genuine findings may refer to one question.';
COMMENT ON COLUMN public.internal_audit_findings.source_audit_question_code IS
  'Historical question reference captured from the source bank. Retained if the question is renamed or removed.';
COMMENT ON COLUMN public.internal_audit_findings.reported_by_user_id IS
  'Authenticated reporter identity supplied by the authorised server action, not an editable form field.';

CREATE OR REPLACE FUNCTION public.guard_nc_source_audit_question()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  source_audit record;
  source_question record;
  origin_changed boolean;
BEGIN
  -- Legacy and non-audit findings are unaffected. A removed source question
  -- retains its saved display reference through ON DELETE SET NULL.
  IF NEW.source_audit_question_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_audit_id IS NULL THEN
    RAISE EXCEPTION 'An originating audit is required for an audit question link.';
  END IF;
  IF NEW.audit_id IS NOT NULL AND NEW.audit_id <> NEW.source_audit_id THEN
    RAISE EXCEPTION 'The finding and source question cannot refer to different audits.';
  END IF;

  SELECT id, owner_id, organization_id, plan_approved, current_gate, status
    INTO source_audit
    FROM public.internal_audits WHERE id = NEW.source_audit_id;
  IF NOT FOUND OR source_audit.owner_id IS DISTINCT FROM NEW.owner_id
     OR source_audit.organization_id IS DISTINCT FROM NEW.organization_id
     OR NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'The source audit must belong to the same owner and organisation as the finding.';
  END IF;

  SELECT id, question_code, clause, active
    INTO source_question
    FROM public.internal_audit_questions WHERE id = NEW.source_audit_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The originating audit question does not exist.';
  END IF;

  origin_changed := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN
    origin_changed := NEW.source_audit_question_id IS DISTINCT FROM OLD.source_audit_question_id
      OR NEW.source_audit_id IS DISTINCT FROM OLD.source_audit_id
      OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id;
  END IF;

  -- Check source eligibility when first linking. Later question retirement or
  -- audit progression does not invalidate the existing historical connection.
  IF origin_changed THEN
    IF source_audit.plan_approved IS DISTINCT FROM true
       OR source_audit.current_gate IS DISTINCT FROM 'fieldwork'
       OR source_audit.status = 'closed' THEN
      RAISE EXCEPTION 'New source-question links require approved, open audit fieldwork.';
    END IF;
    IF source_question.active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'The originating audit question is not active.';
    END IF;
    IF NEW.finding_type NOT IN ('major_nc', 'minor_nc', 'observation', 'ofi') THEN
      RAISE EXCEPTION 'Select Major NC, Minor NC, Observation or OFI.';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.internal_audit_question_scope_links AS mapping
      JOIN public.internal_audit_selected_standards AS selection
        ON selection.standard_id = mapping.standard_id
      WHERE mapping.question_id = NEW.source_audit_question_id
        AND selection.audit_id = NEW.source_audit_id
        AND selection.owner_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'The originating question is not mapped to a selected audit standard.';
    END IF;

    NEW.source_audit_question_code := COALESCE(
      NULLIF(btrim(source_question.question_code), ''),
      NULLIF(btrim(source_question.clause), ''),
      source_question.id::text
    );
  ELSE
    -- A display reference supplied by a browser must not rewrite source history.
    NEW.source_audit_question_code := COALESCE(
      OLD.source_audit_question_code,
      NULLIF(btrim(source_question.question_code), ''),
      NULLIF(btrim(source_question.clause), ''),
      source_question.id::text
    );
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS nc_guard_source_audit_question ON public.internal_audit_findings;
CREATE TRIGGER nc_guard_source_audit_question
  BEFORE INSERT OR UPDATE OF source_audit_question_id, source_audit_id,
    source_audit_question_code, owner_id, organization_id, audit_id
  ON public.internal_audit_findings
  FOR EACH ROW EXECUTE FUNCTION public.guard_nc_source_audit_question();

-- This is a trigger helper, not a public callable reporting endpoint.
REVOKE ALL ON FUNCTION public.guard_nc_source_audit_question() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Result 1: the three new fields should all report READY.
SELECT expected.column_name,
       CASE WHEN actual.column_name IS NOT NULL THEN 'READY' ELSE 'MISSING' END AS readiness
FROM (VALUES
  ('source_audit_question_id'), ('source_audit_question_code'), ('reported_by_user_id')
) AS expected(column_name)
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = 'public'
 AND actual.table_name = 'internal_audit_findings'
 AND actual.column_name = expected.column_name
ORDER BY expected.column_name;

-- Result 2: question-bank coverage diagnostics for existing selected standards.
-- These counts diagnose missing mappings; they do not certify clause completeness.
WITH selected AS (
  SELECT DISTINCT standard_id FROM public.internal_audit_selected_standards
), native_questions AS (
  SELECT standard_id, count(*) AS active_questions
  FROM public.internal_audit_questions WHERE active IS TRUE GROUP BY standard_id
), mapped_questions AS (
  SELECT mapping.standard_id,
    count(DISTINCT question.id) FILTER (WHERE question.active IS TRUE) AS active_mapped_questions,
    count(DISTINCT mapping.clause) FILTER (
      WHERE question.active IS TRUE AND NULLIF(btrim(mapping.clause), '') IS NOT NULL
    ) AS mapped_clause_references,
    count(*) FILTER (WHERE question.id IS NULL) AS broken_question_links
  FROM public.internal_audit_question_scope_links AS mapping
  LEFT JOIN public.internal_audit_questions AS question ON question.id = mapping.question_id
  GROUP BY mapping.standard_id
)
SELECT catalogue.standard_code,
       COALESCE(native.active_questions, 0) AS active_native_questions,
       COALESCE(mapped.active_mapped_questions, 0) AS active_mapped_questions,
       COALESCE(mapped.mapped_clause_references, 0) AS mapped_clause_references,
       COALESCE(mapped.broken_question_links, 0) AS broken_question_links,
       CASE
         WHEN COALESCE(mapped.broken_question_links, 0) > 0 THEN 'REVIEW BROKEN LINKS'
         WHEN COALESCE(mapped.active_mapped_questions, 0) = 0 THEN 'REVIEW MISSING QUESTION MAPPINGS'
         ELSE 'MAPPINGS PRESENT - CLAUSE COVERAGE STILL REQUIRES REVIEW'
       END AS coverage_diagnostic
FROM selected
JOIN public.internal_audit_standard_catalogue AS catalogue ON catalogue.id = selected.standard_id
LEFT JOIN native_questions AS native ON native.standard_id = selected.standard_id
LEFT JOIN mapped_questions AS mapped ON mapped.standard_id = selected.standard_id
ORDER BY catalogue.standard_code;
