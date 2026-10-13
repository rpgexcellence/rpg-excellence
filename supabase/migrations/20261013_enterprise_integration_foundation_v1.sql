-- RPG Excellence enterprise integration foundation v1.
-- Vendor-neutral API clients, scoped permissions, webhook subscriptions and
-- immutable integration events. No existing customer access is altered.

create table if not exists public.integration_api_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_name text not null check (char_length(client_name) between 3 and 120),
  environment text not null default 'live' check (environment in ('test','live')),
  key_prefix text not null unique,
  secret_hash text not null unique,
  permissions text[] not null default '{}'::text[],
  allowed_ip_ranges text[] not null default '{}'::text[],
  active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_ip inet,
  created_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_api_permissions_valid check (
    permissions <@ array[
      'audits:read','audits:write',
      'findings:read','findings:write',
      'capa:read','capa:write',
      'assets:read','assets:write',
      'suppliers:read','suppliers:write',
      'people:read',
      'webhooks:manage'
    ]::text[]
  )
);

create table if not exists public.integration_webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  api_client_id uuid not null references public.integration_api_clients(id) on delete cascade,
  endpoint_url text not null check (endpoint_url ~ '^https://'),
  signing_secret_hash text not null,
  signing_secret_prefix text not null,
  event_types text[] not null default '{}'::text[],
  active boolean not null default true,
  last_delivery_at timestamptz,
  last_delivery_status integer,
  consecutive_failures integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  api_client_id uuid references public.integration_api_clients(id) on delete set null,
  direction text not null check (direction in ('inbound','outbound')),
  event_type text not null,
  resource_type text,
  resource_id text,
  request_id text,
  http_method text,
  endpoint text,
  response_status integer,
  payload_digest text,
  error_summary text,
  source_ip inet,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists integration_clients_org_idx on public.integration_api_clients(organization_id,active,created_at desc);
create index if not exists integration_webhooks_org_idx on public.integration_webhook_subscriptions(organization_id,active);
create index if not exists integration_events_org_idx on public.integration_events(organization_id,occurred_at desc);
create index if not exists integration_events_request_idx on public.integration_events(request_id) where request_id is not null;

alter table public.integration_api_clients enable row level security;
alter table public.integration_webhook_subscriptions enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists "Organisation administrators manage API clients" on public.integration_api_clients;
create policy "Organisation administrators manage API clients" on public.integration_api_clients
for all to authenticated
using (exists (select 1 from public.organizations o where o.id=integration_api_clients.organization_id and integration_api_clients.owner_id=o.owner_id and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))))
with check (exists (select 1 from public.organizations o where o.id=integration_api_clients.organization_id and integration_api_clients.owner_id=o.owner_id and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))));

drop policy if exists "Organisation administrators manage webhooks" on public.integration_webhook_subscriptions;
create policy "Organisation administrators manage webhooks" on public.integration_webhook_subscriptions
for all to authenticated
using (exists (select 1 from public.organizations o where o.id=integration_webhook_subscriptions.organization_id and integration_webhook_subscriptions.owner_id=o.owner_id and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))))
with check (exists (select 1 from public.organizations o where o.id=integration_webhook_subscriptions.organization_id and integration_webhook_subscriptions.owner_id=o.owner_id and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))));

drop policy if exists "Organisation administrators view integration events" on public.integration_events;
create policy "Organisation administrators view integration events" on public.integration_events
for select to authenticated
using (
  exists (
    select 1 from public.organizations o
    where o.id=integration_events.organization_id
      and (o.owner_id=auth.uid() or public.is_organization_people_admin(o.id))
  )
);

grant select,insert,update,delete on public.integration_api_clients to authenticated,service_role;
grant select,insert,update,delete on public.integration_webhook_subscriptions to authenticated,service_role;
grant select,insert on public.integration_events to service_role;
grant select on public.integration_events to authenticated;

comment on table public.integration_api_clients is 'Hashed organisation-scoped credentials for the RPG Excellence REST integration API.';
comment on column public.integration_api_clients.secret_hash is 'SHA-256 digest only. Plain API secrets are displayed once and never stored.';
comment on table public.integration_events is 'Append-only integration audit trail containing metadata and payload digests, not API secrets.';
