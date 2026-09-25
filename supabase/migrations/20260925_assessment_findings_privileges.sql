begin;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
on table public.assessment_findings
to authenticated;

grant all privileges
on table public.assessment_findings
to service_role;

commit;
