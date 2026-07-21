-- ============================================================================
-- L0 — Ossature d'intégration Suite Atlas : traçabilité source + séquence
--
-- Réf. docs/integration-suite-atlas/DESIGN.md § L0
--
-- Migration 100 % ADDITIVE et IDEMPOTENTE (rejouable sans erreur).
-- Aucune donnée existante n'est modifiée : les écritures déjà en base
-- prennent source_system = 'manual' (défaut), idempotency_key = NULL.
--
-- Objectif : le Grand Livre doit pouvoir répondre à « d'où vient cette
-- écriture ? ». Sans ces colonnes, aucun drill-down inter-application,
-- aucune idempotence, aucune réconciliation auxiliaire.
-- ============================================================================

-- ─── 1. Traçabilité à la source sur journal_entries ─────────────────────────

alter table public.journal_entries
  add column if not exists source_system   text not null default 'manual';
alter table public.journal_entries
  add column if not exists source_doc_type text;
alter table public.journal_entries
  add column if not exists source_doc_id   text;
alter table public.journal_entries
  add column if not exists idempotency_key text;
-- Empreinte du payload de l'événement source : entre dans la chaîne de hash
-- du GL (L7) pour rendre la preuve opposable de bout en bout.
alter table public.journal_entries
  add column if not exists source_payload_hash text;

do $$
begin
  alter table public.journal_entries
    drop constraint if exists journal_entries_source_system_check;
  alter table public.journal_entries
    add constraint journal_entries_source_system_check
    check (source_system in (
      'manual',        -- saisie utilisateur
      'atlas_trade',   -- ventes
      'atlas_procure', -- achats
      'atlas_people',  -- SIRH / paie
      'stock',         -- module Stock interne
      'assets',        -- module Immobilisations interne
      'closure',       -- écritures système de clôture
      'treasury',      -- module Trésorerie interne
      'import'         -- migration / reprise de données
    ));
end $$;

-- Garantie d'idempotence DURE : un rejeu du même événement ne peut pas créer
-- une seconde écriture. C'est la contrainte qui rend le bus rejouable.
create unique index if not exists journal_entries_idempotency_uidx
  on public.journal_entries (tenant_id, idempotency_key)
  where idempotency_key is not null;

-- Drill-down : Bilan → écriture → document source.
create index if not exists journal_entries_source_doc_idx
  on public.journal_entries (tenant_id, source_system, source_doc_id);

-- Réconciliation auxiliaire : compter/agréger par système source.
create index if not exists journal_entries_source_system_idx
  on public.journal_entries (tenant_id, source_system, date);

comment on column public.journal_entries.source_system   is 'Système émetteur du fait de gestion (manual, atlas_trade, atlas_procure, atlas_people, stock, assets, closure, treasury, import)';
comment on column public.journal_entries.source_doc_type is 'Type de document source (sale_invoice, goods_receipt, payroll_run…)';
comment on column public.journal_entries.source_doc_id   is 'Identifiant du document dans le système source';
comment on column public.journal_entries.idempotency_key is 'Clé d''idempotence stable fournie par le satellite — UNIQUE par tenant';
comment on column public.journal_entries.source_payload_hash is 'SHA-256 du payload canonique de l''événement source (chaîne de preuve)';

-- ─── 2. Séquence serveur de numéro de pièce ─────────────────────────────────
-- La numérotation était applicative (index calculé côté client). Sous
-- concurrence multi-satellite, deux flux simultanés visent le même numéro →
-- violation de UNIQUE(tenant_id, entry_number) et écriture perdue.
-- La séquence serveur rend l'attribution atomique.

create table if not exists public.entry_sequences (
  tenant_id    uuid   not null references public.societes(id) on delete cascade,
  journal_code text   not null,
  fiscal_year  text   not null,
  last_value   bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (tenant_id, journal_code, fiscal_year)
);

alter table public.entry_sequences enable row level security;

-- Convention projet : get_user_company_id(). Policy FOR ALL (using + with check)
-- → couvre SELECT/INSERT/UPDATE/DELETE, pas de trou U/D.
do $$ begin
  drop policy if exists entry_sequences_all on public.entry_sequences;
  create policy entry_sequences_all on public.entry_sequences
    using (tenant_id = get_user_company_id())
    with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

-- Attribution atomique du numéro suivant.
-- SECURITY DEFINER + search_path figé (règle projet : jamais de search_path
-- mutable sur une fonction SECURITY DEFINER).
create or replace function public.next_entry_number(
  p_tenant_id uuid,
  p_journal text,
  p_fy      text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  if p_tenant_id is null or p_journal is null or p_fy is null then
    raise exception 'next_entry_number: paramètres obligatoires manquants';
  end if;

  insert into public.entry_sequences (tenant_id, journal_code, fiscal_year, last_value, updated_at)
  values (p_tenant_id, p_journal, p_fy, 1, now())
  on conflict (tenant_id, journal_code, fiscal_year)
    do update set last_value = public.entry_sequences.last_value + 1,
                  updated_at = now()
  returning last_value into v;

  return p_journal || '-' || p_fy || '-' || lpad(v::text, 6, '0');
end $$;

comment on function public.next_entry_number(uuid, text, text)
  is 'Attribution atomique du numéro de pièce par (tenant, journal, exercice). Remplace la numérotation applicative non concurrente.';

-- ─── 3. Solde d'un compte (guard caisse) ────────────────────────────────────
-- safeAddEntry vérifiait le solde 57x en chargeant TOUTES les écritures puis
-- en bouclant sur toutes les lignes (O(n·m) par écriture). Sous flux satellite
-- c'est un mur. RPC ciblée, indexée, hors brouillons.

-- ⚠️ p_include_drafts : le guard caisse doit voir les brouillons.
-- Un comptable saisit sa journée de caisse en brouillon (encaissements PUIS
-- décaissements) avant de valider le lot ; ignorer les brouillons bloquerait
-- le premier décaissement au motif d'un solde nul. Le guard passe donc `true`.
-- La valeur par défaut reste `false` (doctrine projet : les brouillons ne
-- comptent JAMAIS dans un chiffre restitué) pour qu'une réutilisation de cette
-- fonction en reporting soit correcte par défaut.
create or replace function public.get_single_account_balance(
  p_tenant_id uuid,
  p_account text,
  p_as_of   date default null,
  p_include_drafts boolean default false
) returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(jl.debit - jl.credit), 0)::numeric
  from public.journal_lines jl
  join public.journal_entries je on je.id = jl.entry_id
  where jl.tenant_id = p_tenant_id
    and jl.account_code = p_account
    and (p_include_drafts or je.status in ('validated', 'posted'))
    and (p_as_of is null or je.date <= p_as_of);
$$;

comment on function public.get_single_account_balance(uuid, text, date, boolean)
  is 'Solde (débit - crédit) d''un compte exact. Brouillons exclus par défaut ; p_include_drafts=true pour le guard caisse 57x.';

create index if not exists journal_lines_account_tenant_idx
  on public.journal_lines (tenant_id, account_code);

-- ─── 4. Dernière écriture (chaînage de hash) ────────────────────────────────
-- Le chaînage lisait tout le journal pour trouver le maillon précédent.

create index if not exists journal_entries_chain_idx
  on public.journal_entries (tenant_id, date desc, created_at desc);

-- ─── 5. save_journal_entry : persistance des champs de traçabilité ──────────
-- La RPC énumère explicitement ses colonnes : sans cette mise à jour, les
-- champs source_* envoyés par le moteur d'intégration seraient SILENCIEUSEMENT
-- perdus (le drill-down et l'idempotence ne fonctionneraient jamais).
--
-- Ajoute aussi le court-circuit d'IDEMPOTENCE : si une écriture existe déjà
-- pour la même (tenant, idempotency_key), on la RENVOIE au lieu de lever une
-- violation d'unicité. C'est ce qui rend le bus rejouable sans effet de bord.

create or replace function public.save_journal_entry(
  p_entry jsonb,
  p_lines jsonb
)
returns journal_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant  uuid;
  v_id      uuid;
  v_idem    text;
  v_entry   journal_entries;
  v_existing journal_entries;
begin
  v_tenant := get_user_company_id();
  if v_tenant is null then
    raise exception 'Accès refusé : aucun tenant associé à l''utilisateur courant.';
  end if;

  v_idem := nullif(p_entry->>'idempotencyKey', '');

  -- Court-circuit d'idempotence : rejeu du même événement → même écriture.
  if v_idem is not null then
    select * into v_existing
    from journal_entries
    where tenant_id = v_tenant and idempotency_key = v_idem
    limit 1;
    if found then
      return v_existing;
    end if;
  end if;

  v_id := coalesce(nullif(p_entry->>'id', '')::uuid, gen_random_uuid());

  insert into journal_entries (
    id, tenant_id, entry_number, journal, date, reference, label, status,
    total_debit, total_credit, reversal_of, reversal_reason,
    hash, previous_hash, created_by, created_at, updated_at,
    source_system, source_doc_type, source_doc_id, idempotency_key, source_payload_hash
  ) values (
    v_id,
    v_tenant,
    p_entry->>'entryNumber',
    p_entry->>'journal',
    (p_entry->>'date')::date,
    p_entry->>'reference',
    p_entry->>'label',
    coalesce(nullif(p_entry->>'status', ''), 'draft'),
    coalesce((p_entry->>'totalDebit')::numeric, 0),
    coalesce((p_entry->>'totalCredit')::numeric, 0),
    nullif(p_entry->>'reversalOf', '')::uuid,
    p_entry->>'reversalReason',
    p_entry->>'hash',
    p_entry->>'previousHash',
    auth.uid(),
    now(),
    now(),
    coalesce(nullif(p_entry->>'sourceSystem', ''), 'manual'),
    nullif(p_entry->>'sourceDocType', ''),
    nullif(p_entry->>'sourceDocId', ''),
    v_idem,
    nullif(p_entry->>'sourcePayloadHash', '')
  )
  returning * into v_entry;

  insert into journal_lines (
    id, entry_id, tenant_id, account_code, account_name,
    third_party_code, third_party_name, label, debit, credit,
    analytical_code, lettrage_code
  )
  select
    coalesce(nullif(l->>'id', '')::uuid, gen_random_uuid()),
    v_id,
    v_tenant,
    l->>'accountCode',
    coalesce(l->>'accountName', l->>'accountCode'),
    l->>'thirdPartyCode',
    l->>'thirdPartyName',
    l->>'label',
    coalesce((l->>'debit')::numeric, 0),
    coalesce((l->>'credit')::numeric, 0),
    l->>'analyticalCode',
    l->>'lettrageCode'
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) as l;

  return v_entry;
end $$;
