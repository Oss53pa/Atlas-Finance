-- ============================================================================
-- Analytique · Lot A·3 v1 — Cycle de vie & publication du run + statut section.
--
-- 1) fna_allocation_run : phase du cycle (brouillon→simulé→contrôlé→publié),
--    version de run, horodatage/auteur de publication, justification de re-run.
--    Une policy UPDATE permet de FAIRE ÉVOLUER un run NON publié ; dès qu'il est
--    publié (phase='publie'), le prédicat USING l'exclut → run IMMUABLE (CDC §7).
--    (fna_allocation_run était select/insert-only ; on ouvre l'update de façon
--     bornée, jamais sur un run publié.)
-- 2) sections_analytiques : statut de cycle (active/gelée/close) pour le contrôle
--    C5 (une section gelée ou close ne doit rien recevoir sur la période).
--
-- Additif & idempotent.
-- ============================================================================

alter table public.fna_allocation_run
  add column if not exists phase              text not null default 'simule',
  add column if not exists version_run        int  not null default 1,
  add column if not exists publie_le          timestamptz,
  add column if not exists publie_par         uuid,
  add column if not exists justification_rerun text;

do $$ begin
  alter table public.fna_allocation_run add constraint fna_allocation_run_phase_check
    check (phase in ('brouillon','simule','controle','publie'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy fna_run_update on public.fna_allocation_run for update
    using (tenant_id = get_user_company_id() and phase <> 'publie')
    with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

alter table public.sections_analytiques
  add column if not exists statut text not null default 'active';

do $$ begin
  alter table public.sections_analytiques add constraint sections_analytiques_statut_check
    check (statut in ('active','gelee','close'));
exception when duplicate_object then null; end $$;
