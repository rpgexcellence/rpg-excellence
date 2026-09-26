-- Module 8: controlled link to the authorised BCP Leader profile.
-- Resource and action owner profile IDs are retained inside their controlled JSON records.

begin;

alter table public.bcp_strategy_assessments
  add column if not exists approver_person_id uuid
  references public.organization_people(id) on delete set null;

create index if not exists bcp_strategy_assessments_approver_idx
  on public.bcp_strategy_assessments(approver_person_id);

grant select, insert, update, delete
  on table public.bcp_strategy_assessments
  to authenticated;

commit;

notify pgrst, 'reload schema';
