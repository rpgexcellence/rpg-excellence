begin;

alter table public.integration_api_clients
  drop constraint if exists integration_api_permissions_valid;

alter table public.integration_api_clients
  add constraint integration_api_permissions_valid check (
    permissions <@ array[
      'audits:read','audits:write',
      'findings:read','findings:write',
      'capa:read','capa:write',
      'assets:read','assets:write',
      'suppliers:read','suppliers:write',
      'people:read',
      'security_incidents:read',
      'webhooks:manage'
    ]::text[]
  );

comment on constraint integration_api_permissions_valid on public.integration_api_clients is
  'Least-privilege API scopes, including organisation-isolated security incident access.';

commit;
