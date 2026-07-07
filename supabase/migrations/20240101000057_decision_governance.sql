-- ============================================================================
-- GOUVERNANCE DES DÉCISIONS DE BOUT EN BOUT (Document Maître Partie B, Lot 2).
-- Souveraineté serveur : ces tables N'ONT AUCUNE policy d'écriture 'authenticated'.
-- Seules les Edge Functions (service_role) écrivent. RLS SELECT tenant-scopée
-- (get_user_company_id()). space_approval_link : aucune policy SELECT client.
-- Montants en bigint _xof. Chaîne multi-validateurs (cumul DAF→DG), rejet,
-- matrice paramétrable par tenant, dimension decision_type, effets FNA, lien externe.
-- ============================================================================

-- ── B1.1 · Décision (objet figé, soumis à circuit) ───────────────────────────
create table if not exists public.space_decision (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null,
  space_id               uuid not null,                 -- collab_channels.id (espace)
  ref                    text,                          -- DEC-AAAA-NNN
  decision_type          text not null default 'regularisation',
  title                  text not null,
  body                   text,
  amount_xof             bigint,
  piece_ids              jsonb not null default '[]',   -- journal_entry_id référencés
  status                 text not null default 'in_approval'
                         check (status in ('in_approval','approved','rejected','cancelled')),
  content_hash           text,                          -- sha256(payload canonique)
  current_step           int  default 1,
  rule_id                uuid,
  rule_label             text,                          -- règle en clair
  chain                  text[],                        -- chaîne ordonnée figée
  supersedes_decision_id uuid references public.space_decision(id),
  author_id              text not null,
  rejected_by            text,
  rejected_at            timestamptz,
  reject_motive          text,
  reject_comment         text,
  effect_applied_at      timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_space_decision_space on public.space_decision(space_id);
create index if not exists idx_space_decision_tenant on public.space_decision(tenant_id, status);

-- ── B1.2 · Matrice de règles (paramétrable par tenant) ───────────────────────
create table if not exists public.space_approval_rule (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null,
  decision_type   text not null,
  min_amount_xof  bigint not null default 0,
  max_amount_xof  bigint,
  required_roles  text[] not null,          -- CHAÎNE ORDONNÉE : ['daf','dg']
  priority        int not null default 100, -- petit = spécifique
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  check (max_amount_xof is null or max_amount_xof > min_amount_xof),
  check (array_length(required_roles,1) >= 1)
);
create index if not exists idx_space_approval_rule on public.space_approval_rule (tenant_id, decision_type, active, priority);

-- ── B1.3 · Étapes de la chaîne d'approbation ─────────────────────────────────
create table if not exists public.space_decision_approval (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  decision_id    uuid not null references public.space_decision(id),
  position       int  not null,
  required_role  text not null,
  status         text not null default 'waiting'
                 check (status in ('waiting','pending','approved','rejected','obsolete')),
  approver_id    text,
  approver_name  text,
  acted_via      text,                       -- 'dock'|'space'|'mobile'|'external_link'
  on_behalf_of   text,
  signature_ref  uuid,
  acted_at       timestamptz,
  created_at     timestamptz not null default now(),
  unique (decision_id, position)
);
create index if not exists idx_sda_pending on public.space_decision_approval (tenant_id, status, required_role);

-- ── B1.4 · Registre des effets FNA à l'approbation finale ────────────────────
create table if not exists public.space_decision_effect (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  decision_type text not null,
  effect_key    text not null,   -- 'suspens.set_status'|'partner.flag_write_off'|'period.unlock_step'|'none'
  params        jsonb not null default '{}',
  active        boolean not null default true,
  unique (tenant_id, decision_type, effect_key)
);

-- ── B1.5 · Liens de validation externe (nominatifs, OTP) ─────────────────────
create table if not exists public.space_approval_link (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null,
  approval_id    uuid not null references public.space_decision_approval(id),
  decision_id    uuid not null references public.space_decision(id),
  token_hash     text not null,              -- sha256 ; token clair JAMAIS stocké
  contact_kind   text not null check (contact_kind in ('email','whatsapp','sms')),
  contact_value  text not null,
  display_name   text not null,
  content_hash   text not null,
  expires_at     timestamptz not null,       -- émission + 72 h
  otp_hash       text,
  otp_expires_at timestamptz,                -- OTP 10 min
  otp_attempts   int not null default 0,     -- max 5 puis gel
  used_at        timestamptz,
  revoked_at     timestamptz,
  created_by     text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_sal_token on public.space_approval_link (token_hash);

-- ── B2 · Résolution de la matrice (serveur, une fois à la soumission) ────────
create or replace function public.resolve_approval_chain(p_tenant uuid, p_type text, p_amount bigint)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'rule_id', r.id,
    'roles',   r.required_roles,
    'label',   r.decision_type || ' · ' || coalesce(p_amount,0)::text || ' FCFA'
               || case when r.min_amount_xof > 0 then ' ≥ ' || r.min_amount_xof::text else '' end
               || ' → ' || array_to_string(r.required_roles, ' puis ')
  )
  from (
    select * from public.space_approval_rule
    where tenant_id = p_tenant and active
      and decision_type in (p_type, '*')
      and min_amount_xof <= coalesce(p_amount, 0)
      and (max_amount_xof is null or coalesce(p_amount, 0) < max_amount_xof)
    order by (decision_type = p_type) desc, priority asc, min_amount_xof desc
    limit 1
  ) r;
$$;

-- ── B7 · RLS souveraine : lecture tenant, ZÉRO écriture client ───────────────
alter table public.space_decision          enable row level security;
alter table public.space_approval_rule     enable row level security;
alter table public.space_decision_approval enable row level security;
alter table public.space_decision_effect   enable row level security;
alter table public.space_approval_link     enable row level security;

do $$ begin
  -- SELECT tenant-scopé (les Edge Functions en service_role bypassent la RLS).
  create policy sd_select   on public.space_decision          for select using (tenant_id = get_user_company_id());
  create policy sar_select  on public.space_approval_rule     for select using (tenant_id = get_user_company_id());
  create policy sda_select  on public.space_decision_approval for select using (tenant_id = get_user_company_id());
  create policy sde_select  on public.space_decision_effect   for select using (tenant_id = get_user_company_id());
  -- space_approval_link : AUCUNE policy → invisible aux clients (service_role seul).
exception when duplicate_object then null; end $$;

-- Ceinture-bretelles : révocation des privilèges d'écriture au rôle applicatif.
revoke insert, update, delete on public.space_decision          from authenticated, anon;
revoke insert, update, delete on public.space_approval_rule     from authenticated, anon;
revoke insert, update, delete on public.space_decision_approval from authenticated, anon;
revoke insert, update, delete on public.space_decision_effect   from authenticated, anon;
revoke all                    on public.space_approval_link     from authenticated, anon;
