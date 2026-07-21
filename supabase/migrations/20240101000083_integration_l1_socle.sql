-- ============================================================================
-- L1 — Socle de l'ossature d'intégration Suite Atlas
--
-- Réf. docs/integration-suite-atlas/DESIGN.md § L1
--
-- 3 tables :
--   integration_events        journal APPEND-ONLY des faits de gestion reçus
--   posting_rules             détermination comptable éditable (généralise
--                             stock_gl_determination à tous les événements)
--   integration_dead_letters   supervision des échecs non résolus
--
-- Principe cardinal : le satellite envoie un FAIT DE GESTION, jamais une
-- écriture. Aucun numéro de compte SYSCOHADA ne quitte Atlas F&A.
--
-- Migration ADDITIVE et IDEMPOTENTE.
-- ============================================================================

-- ─── 1. Journal des faits de gestion ────────────────────────────────────────

create table if not exists public.integration_events (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.societes(id) on delete cascade,
  source_system    text not null,
  event_type       text not null,
  event_version    int  not null default 1,
  source_doc_id    text not null,
  idempotency_key  text not null,
  -- Date MÉTIER (celle du satellite), distincte de la date de réception :
  -- c'est elle qui détermine la période comptable.
  occurred_at      timestamptz not null,
  received_at      timestamptz not null default now(),
  payload          jsonb not null,
  payload_hash     text not null,
  status           text not null default 'pending'
                     check (status in ('pending','posted','rejected','ignored','deferred')),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  error_code       text,
  error_detail     text,
  attempts         int not null default 0,
  next_attempt_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists integration_events_pending_idx
  on public.integration_events (tenant_id, status, next_attempt_at)
  where status in ('pending', 'deferred');

create index if not exists integration_events_source_idx
  on public.integration_events (tenant_id, source_system, occurred_at desc);

create index if not exists integration_events_doc_idx
  on public.integration_events (tenant_id, source_system, source_doc_id);

comment on table public.integration_events
  is 'Journal append-only des faits de gestion reçus des satellites de la Suite Atlas. Source de vérité du bus d''intégration.';

-- ─── 2. Détermination comptable générique ───────────────────────────────────
-- Généralisation de stock_gl_determination (clés SAP BSX/GBB/WRX/PRD/UMB) à
-- TOUS les types d'événements. C'est ici — et NULLE PART ailleurs — que se
-- décide quel compte SYSCOHADA porte quel rôle.

create table if not exists public.posting_rules (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id) on delete cascade,
  event_type     text not null,
  -- Rôle fonctionnel de la ligne dans le fait de gestion (revenue, receivable,
  -- vat_collected, expense, payable, gross_salary, net_payable…).
  line_role      text not null,
  -- Discriminant : famille produit, code taxe, rubrique de paie, classe de
  -- valorisation… '' = règle par défaut du couple (event_type, line_role).
  match_key      text not null default '',
  debit_account  text,
  credit_account text,
  analytic       boolean not null default false,
  -- La ligne porte-t-elle un code tiers ? (411/401/42x → oui)
  third_party    boolean not null default false,
  priority       int not null default 100,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, event_type, line_role, match_key)
);

create index if not exists posting_rules_lookup_idx
  on public.posting_rules (tenant_id, event_type, active, priority);

comment on table public.posting_rules
  is 'Détermination comptable éditable par le comptable : (event_type, line_role, match_key) → comptes SYSCOHADA. Aucun compte codé en dur dans le moteur.';

-- ─── 3. Dead-letters ────────────────────────────────────────────────────────

create table if not exists public.integration_dead_letters (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id) on delete cascade,
  event_id    uuid not null references public.integration_events(id) on delete cascade,
  reason      text not null,
  payload     jsonb not null,
  resolved    boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists integration_dead_letters_open_idx
  on public.integration_dead_letters (tenant_id, resolved, created_at desc);

-- ─── 4. RLS ─────────────────────────────────────────────────────────────────
-- Policy FOR ALL (using + with check) → couvre SELECT/INSERT/UPDATE/DELETE.
-- Aucun trou U/D (défaut relevé par l'audit 360° sur d'autres tables).

do $$
declare t text;
begin
  foreach t in array array[
    'integration_events', 'posting_rules', 'integration_dead_letters'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format($p$create policy %I on public.%I
      using (tenant_id = get_user_company_id())
      with check (tenant_id = get_user_company_id())$p$, t || '_all', t);
    execute format('create index if not exists %I on public.%I (tenant_id)', 'idx_' || t || '_tenant', t);
  end loop;
end $$;

-- ─── 5. Append-only sur integration_events ──────────────────────────────────
-- Le payload reçu d'un satellite est une PIÈCE : il ne se réécrit pas. Seuls
-- les champs de cycle de vie (status, attempts, error_*, journal_entry_id,
-- next_attempt_at) évoluent. Sans ce garde-fou, la chaîne de preuve L7 est
-- réfutable — on pourrait réécrire l'événement après coup.

create or replace function public.integration_events_append_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payload        is distinct from old.payload        or
     new.payload_hash   is distinct from old.payload_hash   or
     new.source_system  is distinct from old.source_system  or
     new.event_type     is distinct from old.event_type     or
     new.source_doc_id  is distinct from old.source_doc_id  or
     new.idempotency_key is distinct from old.idempotency_key or
     new.occurred_at    is distinct from old.occurred_at    or
     new.tenant_id      is distinct from old.tenant_id
  then
    raise exception 'integration_events est append-only : le fait de gestion reçu ne peut pas être réécrit (event %)', old.id;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists integration_events_append_only_trg on public.integration_events;
create trigger integration_events_append_only_trg
  before update on public.integration_events
  for each row execute function public.integration_events_append_only();

-- ─── 6. Seeds SYSCOHADA des règles de détermination ─────────────────────────
-- Valeurs de DÉPART éditables par le comptable dans /settings/integration/posting-rules.
-- Insérées pour chaque société existante ; ON CONFLICT DO NOTHING → une règle
-- déjà personnalisée n'est jamais écrasée par un rejeu de la migration.

do $$
declare
  v_tenant uuid;
  r record;
begin
  for v_tenant in select id from public.societes loop
    for r in
      select * from (values
        -- ── Atlas Trade — ventes ──────────────────────────────────────────
        ('sale.invoice.issued',      'receivable',        '',       '411000', null,     true,  false),
        ('sale.invoice.issued',      'revenue',           '',       null,     '701000', false, true ),
        ('sale.invoice.issued',      'revenue',           'SERVICES', null,   '706000', false, true ),
        ('sale.invoice.issued',      'vat_collected',     '',       null,     '443000', false, false),
        ('sale.invoice.issued',      'withholding',       'AIRSI',  '447000', null,     false, false),
        ('sale.credit_note.issued',  'receivable',        '',       null,     '411000', true,  false),
        ('sale.credit_note.issued',  'revenue',           '',       '701000', null,     false, true ),
        ('sale.credit_note.issued',  'vat_collected',     '',       '443000', null,     false, false),
        ('sale.payment.received',    'cash',              '',       '521000', null,     false, false),
        ('sale.payment.received',    'receivable',        '',       null,     '411000', true,  false),

        -- ── Atlas Procure — achats ────────────────────────────────────────
        ('purchase.invoice.received','expense',           '',       '601000', null,     false, true ),
        ('purchase.invoice.received','expense',           'SERVICES','622000', null,    false, true ),
        ('purchase.invoice.received','vat_deductible',    '',       '445000', null,     false, false),
        ('purchase.invoice.received','payable',           '',       null,     '401000', true,  false),
        ('purchase.credit_note.received','payable',       '',       '401000', null,     true,  false),
        ('purchase.credit_note.received','expense',       '',       null,     '601000', false, true ),
        ('purchase.credit_note.received','vat_deductible','',       null,     '445000', false, false),
        ('purchase.payment.issued',  'payable',           '',       '401000', null,     true,  false),
        ('purchase.payment.issued',  'cash',              '',       null,     '521000', false, false),
        ('purchase.goods_receipt.posted','inventory',     '',       '311000', null,     false, true ),
        ('purchase.goods_receipt.posted','grni',          '',       null,     '408000', false, false),

        -- ── Atlas People — paie ───────────────────────────────────────────
        ('payroll.run.validated',    'gross_salary',      '',       '661000', null,     false, true ),
        ('payroll.run.validated',    'social_employer',   '',       '664000', null,     false, true ),
        ('payroll.run.validated',    'social_employee',   '',       null,     '431000', false, false),
        ('payroll.run.validated',    'income_tax_withheld','',      null,     '447000', false, false),
        ('payroll.run.validated',    'other_deductions',  '',       null,     '427000', true,  false),
        ('payroll.run.validated',    'net_payable',       '',       null,     '422000', true,  false),
        ('payroll.payment.issued',   'net_payable',       '',       '422000', null,     true,  false),
        ('payroll.payment.issued',   'cash',              '',       null,     '521000', false, false)
      ) as t(event_type, line_role, match_key, debit_account, credit_account, third_party, analytic)
    loop
      insert into public.posting_rules (
        tenant_id, event_type, line_role, match_key,
        debit_account, credit_account, third_party, analytic, priority, active
      ) values (
        v_tenant, r.event_type, r.line_role, r.match_key,
        r.debit_account, r.credit_account, r.third_party, r.analytic,
        case when r.match_key = '' then 100 else 50 end,  -- règle spécifique prioritaire
        true
      )
      on conflict (tenant_id, event_type, line_role, match_key) do nothing;
    end loop;
  end loop;
end $$;

-- ─── 7. Vue de réconciliation auxiliaire ↔ général (L5) ─────────────────────
-- Solde GL par compte collectif ET par système source : c'est la base de
-- l'écran qui prouve que la suite est auditable. Brouillons EXCLUS (doctrine
-- projet : un brouillon n'est jamais un chiffre restitué).

create or replace view public.v_subledger_reconciliation as
select
  jl.tenant_id,
  case
    when jl.account_code like '411%' then '411'
    when jl.account_code like '401%' then '401'
    when jl.account_code like '422%' then '422'
    when jl.account_code like '3%'   then '3xx'
    else 'other'
  end                                            as collective,
  coalesce(je.source_system, 'manual')           as source_system,
  count(distinct je.id)                          as entry_count,
  sum(jl.debit)::numeric                         as total_debit,
  sum(jl.credit)::numeric                        as total_credit,
  sum(jl.debit - jl.credit)::numeric             as solde
from public.journal_lines jl
join public.journal_entries je on je.id = jl.entry_id
where je.status in ('validated', 'posted')
  and (jl.account_code like '411%' or jl.account_code like '401%'
       or jl.account_code like '422%' or jl.account_code like '3%')
group by 1, 2, 3;

comment on view public.v_subledger_reconciliation
  is 'Soldes des comptes collectifs (411/401/422/3xx) ventilés par système source. Base de l''écran de réconciliation auxiliaire ↔ général.';
