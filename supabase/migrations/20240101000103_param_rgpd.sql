-- ============================================================================
-- Paramètres · Lot B·4 (vague 1) — Protection des données personnelles (CDC §13).
--
-- Politique de RÉTENTION et responsable des données, modélisés comme paramètres
-- (namespace rgpd.*). Non destructif : ce lot pose la CONFIGURATION et le calcul
-- d'éligibilité ; l'anonymisation effective (destructive) fera l'objet d'un lot
-- contrôlé dédié (journal des anonymisations, validation).
--
-- ⚠️ La rétention des pièces comptables (10 ans) prime — obligation SYSCOHADA.
-- Idempotent.
-- ============================================================================

insert into public.param_definition (cle, module, libelle, type_valeur, type_gouvernance, portee_min, portee_max, surcharge_autorisee, valeur_defaut)
values
  ('rgpd.retention_tiers_mois',  'securite', 'Rétention données tiers (mois après fin de relation)', 'number', 'controle',     'plateforme', 'societe', true, '60'::jsonb),
  ('rgpd.retention_pieces_ans',  'securite', 'Rétention pièces comptables (ans — obligation SYSCOHADA)', 'number', 'structurant', 'plateforme', 'societe', false, '10'::jsonb),
  ('rgpd.responsable_donnees',   'securite', 'Responsable des données (nom / contact)',              'string', 'controle',     'plateforme', 'societe', true, null)
on conflict (cle) do nothing;
