begin;

alter table public.hs_risk_actions
  add column if not exists responsible_person_id uuid
    references public.organization_people(id) on delete set null;

create index if not exists hs_risk_actions_responsible_person_idx
  on public.hs_risk_actions(organization_id, responsible_person_id);

commit;
