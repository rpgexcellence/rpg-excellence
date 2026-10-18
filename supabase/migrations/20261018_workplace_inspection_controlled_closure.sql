begin;

alter table public.hs_workplace_inspections
  add column if not exists review_decision text,
  add column if not exists review_comment text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_by_person_id uuid references public.organization_people(id) on delete set null,
  add column if not exists returned_at timestamptz,
  add column if not exists closure_requested_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by_user_id uuid references auth.users(id) on delete set null;

alter table public.hs_workplace_inspection_actions
  add column if not exists completion_evidence text,
  add column if not exists completion_comment text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists verification_comment text,
  add column if not exists effectiveness_result text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hs_workplace_inspections_review_decision_check'
  ) then
    alter table public.hs_workplace_inspections
      add constraint hs_workplace_inspections_review_decision_check
      check (
        review_decision is null
        or review_decision in ('approved', 'returned')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'hs_workplace_inspection_actions_effectiveness_check'
  ) then
    alter table public.hs_workplace_inspection_actions
      add constraint hs_workplace_inspection_actions_effectiveness_check
      check (
        effectiveness_result is null
        or effectiveness_result in ('effective', 'not_effective')
      );
  end if;
end
$$;

create index if not exists hs_workplace_inspections_reviewer_status_idx
  on public.hs_workplace_inspections (
    organization_id,
    reviewer_person_id,
    status,
    planned_start_at
  );

create index if not exists hs_workplace_inspection_actions_owner_status_idx
  on public.hs_workplace_inspection_actions (
    organization_id,
    responsible_person_id,
    status,
    target_date
  );

create index if not exists hs_workplace_inspection_actions_verifier_status_idx
  on public.hs_workplace_inspection_actions (
    organization_id,
    verifier_person_id,
    status,
    target_date
  );

comment on column public.hs_workplace_inspections.review_decision is
  'Independent reviewer decision. Approval is separate from fieldwork completion.';

comment on column public.hs_workplace_inspection_actions.completion_evidence is
  'Controlled reference or summary demonstrating completion of the assigned action.';

comment on column public.hs_workplace_inspection_actions.effectiveness_result is
  'Independent verification result. The action owner cannot verify their own action.';

commit;
