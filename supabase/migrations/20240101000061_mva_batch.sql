-- ============================================================================
-- MVA Lot 5 Vague A — Validation des écritures en BATCH (Doc Maître Partie D).
-- Le bordereau (journal_batch) = 1 dossier wf_instance ; le contrôle humain se
-- concentre sur les EXCEPTIONS extraites automatiquement avant soumission.
-- Intégrité : root_hash (Merkle simplifié) sur les lignes incluses. Rejet partiel
-- = exclusion de lignes + recalcul du root_hash. Homogène par construction
-- (un journal, une période, une source). Souverain serveur.
-- ============================================================================

-- Lignes d'un bordereau (une ligne = une écriture du lot).
create table if not exists public.wf_batch_line (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null,
  instance_id         uuid not null references public.wf_instance(id),
  position            int  not null,
  line_ref            text not null,
  journal_code        text,
  account_code        text,
  label               text,
  amount_xof          bigint not null default 0,
  line_hash           text not null,
  included            boolean not null default true,   -- false = exclue (exception ou rejet partiel)
  is_exception        boolean not null default false,  -- extraite en dossier individuel
  exception_reason    text,
  extracted_instance_id uuid references public.wf_instance(id),
  created_at          timestamptz not null default now()
);
create index if not exists idx_wf_batch_line_instance on public.wf_batch_line(instance_id, position);

-- Règles d'extraction des exceptions (par tenant).
create table if not exists public.wf_exception_rule (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,
  object_type      text not null default 'journal_batch',
  amount_gte       bigint,                    -- montant >= seuil → exception
  account_prefixes text[] not null default '{}',   -- compte sensible (préfixe) → exception
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table public.wf_batch_line     enable row level security;
alter table public.wf_exception_rule enable row level security;
do $$ begin
  create policy wbl_sel on public.wf_batch_line     for select using (tenant_id = get_user_company_id());
  create policy wer_sel on public.wf_exception_rule for select using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.wf_batch_line, public.wf_exception_rule from authenticated, anon;
