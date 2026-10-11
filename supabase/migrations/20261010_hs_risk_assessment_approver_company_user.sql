begin;

alter table public.hs_risk_assessments
  add column if not exists approver_person_id uuid
    references public.organization_people(id) on delete set null;

create index if not exists hs_risk_assessments_approver_person_idx
  on public.hs_risk_assessments(organization_id, approver_person_id);

commit;
