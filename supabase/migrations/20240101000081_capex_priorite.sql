-- Priorité d'arbitrage des Business Cases CAPEX (kanban de priorisation).
--
-- Complète — sans le remplacer — le score composite CALCULÉ (capexScoringService) :
-- le score classe objectivement, la priorité est le geste d'arbitrage HUMAIN posé
-- en séance (drag & drop dans le kanban de l'onglet Priorisation).
-- Additif et réversible : colonne avec défaut, aucune donnée existante touchée.

alter table public.capex_requests
  add column if not exists priorite text not null default 'moyenne';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'capex_requests_priorite_check') then
    alter table public.capex_requests
      add constraint capex_requests_priorite_check
      check (priorite in ('critique', 'haute', 'moyenne', 'basse'));
  end if;
end $$;

create index if not exists idx_capex_requests_priorite
  on public.capex_requests(tenant_id, priorite);

comment on column public.capex_requests.priorite is
  'Priorité d''arbitrage (critique|haute|moyenne|basse), posée manuellement dans le kanban de priorisation. Distincte du score composite calculé.';
