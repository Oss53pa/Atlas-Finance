-- ============================================================================
-- Paramètres · Lot B·2 (vague 1) — Matrice de séparation des tâches (SoD).
--
-- Table de conflits de permissions livrée plateforme (CDC Paramètres §13,
-- critère #4). Le rapport SoD (côté app) détecte les rôles/affectations qui
-- cumulent deux permissions en conflit. Additif & non intrusif (aucune
-- modification de l'enforcement d'autorisation existant).
-- ============================================================================

create table if not exists public.sod_conflit (
  id           uuid primary key default gen_random_uuid(),
  permission_a text not null,
  permission_b text not null,
  severite     text not null default 'eleve' check (severite in ('faible','moyen','eleve')),
  libelle      text,
  created_at   timestamptz not null default now(),
  unique (permission_a, permission_b)
);
alter table public.sod_conflit enable row level security;
do $$ begin
  create policy sod_conflit_sel on public.sod_conflit for select using (true);
exception when duplicate_object then null; end $$;

-- Conflits standard sur les codes de permission réels du projet.
insert into public.sod_conflit (permission_a, permission_b, severite, libelle) values
  ('accounting.create', 'accounting.validate', 'eleve', 'Saisir ET valider une écriture'),
  ('accounting.edit',   'accounting.validate', 'eleve', 'Modifier ET valider une écriture'),
  ('accounting.delete', 'accounting.validate', 'eleve', 'Supprimer ET valider une écriture'),
  ('admin.users',       'admin.roles',         'eleve', 'Gérer les utilisateurs ET les rôles (auto-attribution de droits)'),
  ('suppliers.create',  'treasury.create',     'moyen', 'Créer un fournisseur ET initier un décaissement'),
  ('customers.create',  'accounting.validate', 'moyen', 'Créer un client ET valider les écritures')
on conflict (permission_a, permission_b) do nothing;
