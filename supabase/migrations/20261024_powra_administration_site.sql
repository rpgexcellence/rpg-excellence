-- RPG Excellence: separate Administration site link for new POWRA reports.
-- Run in Supabase SQL Editor before uploading the updated application files.
-- Existing BCP site links, site labels, records and access policies are preserved.

DO $migration$
BEGIN
  IF to_regclass('public.hs_powra_assessments') IS NULL
     OR to_regclass('public.organization_sites') IS NULL THEN
    RAISE EXCEPTION 'POWRA and Administration Site Profile tables must exist first.';
  END IF;

  ALTER TABLE public.hs_powra_assessments
    ADD COLUMN IF NOT EXISTS administration_location_id uuid
      REFERENCES public.organization_sites(id) ON DELETE RESTRICT;

  -- Some installations added this legacy column outside the base migration.
  -- Keep its values and foreign key; new Administration-linked records leave it null.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hs_powra_assessments'
      AND column_name = 'site_profile_id'
  ) THEN
    ALTER TABLE public.hs_powra_assessments
      ALTER COLUMN site_profile_id DROP NOT NULL;
  END IF;

  CREATE INDEX IF NOT EXISTS hs_powra_administration_location_idx
    ON public.hs_powra_assessments (organization_id, administration_location_id);

  COMMENT ON COLUMN public.hs_powra_assessments.administration_location_id IS
    'Administration organization_sites ID. Legacy BCP site_profile_id links remain separate and are not automatically mapped.';
END
$migration$;

CREATE OR REPLACE FUNCTION public.validate_powra_administration_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  -- Existing reports may still be reviewed after a site becomes inactive.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.administration_location_id IS NOT DISTINCT FROM OLD.administration_location_id
       AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.administration_location_id IS NOT NULL THEN
    IF NEW.organization_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.organization_sites AS site
      WHERE site.id = NEW.administration_location_id
        AND site.organization_id = NEW.organization_id
        AND site.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Select an active Administration site belonging to this organisation.'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS hs_powra_validate_administration_location
  ON public.hs_powra_assessments;
CREATE TRIGGER hs_powra_validate_administration_location
  BEFORE INSERT OR UPDATE OF administration_location_id, organization_id
  ON public.hs_powra_assessments
  FOR EACH ROW EXECUTE FUNCTION public.validate_powra_administration_location();

REVOKE ALL ON FUNCTION public.validate_powra_administration_location() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hs_powra_assessments'
  AND column_name IN ('administration_location_id', 'site_profile_id')
ORDER BY column_name;
