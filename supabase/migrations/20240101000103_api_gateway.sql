-- API Gateway : aligne les clés API & webhooks sur le tenant comptable
-- (company_id) et ajoute le support passerelle (rate limiting, index lookup).
--
-- Contexte : les tables api_keys / webhooks étaient scopées par organization_id
-- (profiles.organization_id), rarement renseigné, alors que toute la donnée
-- comptable (journal_entries, accounts, third_parties) est scopée par tenant_id
-- = profiles.company_id. On aligne donc la tenancy sur company_id.

alter table public.api_keys  add column if not exists tenant_id uuid;
alter table public.api_keys  add column if not exists rate_limit_per_hour integer not null default 5000;
alter table public.webhooks  add column if not exists tenant_id uuid;

-- organization_id était NOT NULL mais la tenancy applicative est company_id.
alter table public.api_keys  alter column organization_id drop not null;
alter table public.webhooks  alter column organization_id drop not null;

-- Backfill best-effort du tenant depuis le créateur.
update public.api_keys k set tenant_id = p.company_id
  from public.profiles p
  where p.id = k.user_id and k.tenant_id is null and p.company_id is not null;
update public.webhooks w set tenant_id = p.company_id
  from public.profiles p
  where p.id = w.created_by and w.tenant_id is null and p.company_id is not null;

-- Lookups performants pour la passerelle.
create index if not exists idx_api_keys_key_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_tenant on public.api_keys(tenant_id);
create index if not exists idx_api_logs_key_created on public.api_logs(api_key_id, created_at desc);
create index if not exists idx_webhooks_tenant on public.webhooks(tenant_id);

-- Remplace les policies org-scoped par des policies company-scoped.
drop policy if exists api_keys_select on public.api_keys;
drop policy if exists api_keys_insert on public.api_keys;
drop policy if exists api_keys_update on public.api_keys;
drop policy if exists api_keys_delete on public.api_keys;

create policy api_keys_tenant_select on public.api_keys for select
  using (tenant_id = public.get_user_company_id());
create policy api_keys_tenant_insert on public.api_keys for insert
  with check (tenant_id = public.get_user_company_id() and user_id = auth.uid());
create policy api_keys_tenant_update on public.api_keys for update
  using (tenant_id = public.get_user_company_id())
  with check (tenant_id = public.get_user_company_id());
create policy api_keys_tenant_delete on public.api_keys for delete
  using (tenant_id = public.get_user_company_id());

drop policy if exists webhooks_select on public.webhooks;
drop policy if exists webhooks_insert on public.webhooks;
drop policy if exists webhooks_update on public.webhooks;
drop policy if exists webhooks_delete on public.webhooks;

create policy webhooks_tenant_select on public.webhooks for select
  using (tenant_id = public.get_user_company_id());
create policy webhooks_tenant_insert on public.webhooks for insert
  with check (tenant_id = public.get_user_company_id());
create policy webhooks_tenant_update on public.webhooks for update
  using (tenant_id = public.get_user_company_id())
  with check (tenant_id = public.get_user_company_id());
create policy webhooks_tenant_delete on public.webhooks for delete
  using (tenant_id = public.get_user_company_id());
