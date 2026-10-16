-- Read-only privileges required by the server-side
-- Cross-Standard Matrix engine.
--
-- This does not change customer permissions, RLS policies,
-- assessment results, Company Users or administrator accounts.

grant select
on table public.assessments
to service_role;

grant select
on table public.assessment_answers
to service_role;

grant select
on table public.organization_people
to service_role;

grant select
on table public.controlled_documents
to service_role;

grant select
on table public.cross_standard_control_groups
to service_role;

grant select
on table public.cross_standard_requirement_links
to service_role;

grant select,
      insert,
      update,
      delete
on table public.organization_cross_standard_controls
to service_role;

grant select,
      insert,
      update,
      delete
on table public.cross_standard_evidence_links
to service_role;

notify pgrst, 'reload schema';
