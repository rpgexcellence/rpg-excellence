-- Restore the server workflow grant missing from the original CAPA table.
-- Authenticated grants and RLS policies are preserved; no cross-company access is added.
begin;
grant select, insert, update, delete on public.rca_capa_stages to service_role;
-- Also retain the history-reader grant applied during the live C-Test retest.
grant select on public.internal_audit_events to service_role;
alter table public.hs_permits add column if not exists draft_form_data jsonb not null default '{}'::jsonb;
alter table public.hs_permits alter column valid_from drop not null;
alter table public.hs_permits alter column valid_until drop not null;
alter table public.hs_permits drop constraint if exists hs_permits_controlled_validity;
alter table public.hs_permits add constraint hs_permits_controlled_validity check (
 status in ('draft','cancelled') or (valid_from is not null and valid_until is not null and valid_until > valid_from)
);
-- BCP task readers are server-only and already constrained to the authorised company.
grant select on public.bcp_site_profiles,public.bcp_context_assessments,public.bcp_role_assessments,
 public.bcp_hazard_assessments,public.bcp_bia_assessments,public.bcp_outsourced_process_assessments,
 public.bcp_strategy_assessments,public.bcp_incident_management_assessments,public.bcp_plans to service_role;
alter table public.suppliers
 add column if not exists address_line_1 text,
 add column if not exists address_line_2 text,
 add column if not exists city text,
 add column if not exists region text,
 add column if not exists postal_code text;
alter table public.isms_risks add column if not exists risk_owner_person_id uuid references public.organization_people(id) on delete set null;
commit;
