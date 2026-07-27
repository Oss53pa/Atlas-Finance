-- ============================================================================
-- Paramètres · Lot B·3 (vague 1) — Comptes par défaut via le socle (CDC §6).
--
-- Plutôt qu'une table dédiée `compte_defaut`, les comptes par défaut sont
-- modélisés comme des PARAMÈTRES (namespace `compte.*`). Ils héritent ainsi de
-- la résolution par portée + effet daté, du journal chaîné et de l'écran
-- Paramètres — sans code supplémentaire. Codes SYSCOHADA en valeur par défaut.
-- Idempotent.
-- ============================================================================

insert into public.param_definition (cle, module, libelle, type_valeur, type_gouvernance, portee_min, portee_max, surcharge_autorisee, valeur_defaut)
values
  ('compte.tva_collectee',        'comptabilite', 'Compte de TVA collectée',              'string', 'structurant',  'plateforme', 'societe', true, '"4431"'::jsonb),
  ('compte.tva_deductible',       'comptabilite', 'Compte de TVA déductible',             'string', 'structurant',  'plateforme', 'societe', true, '"4452"'::jsonb),
  ('compte.client_collectif',     'comptabilite', 'Compte collectif clients',             'string', 'structurant',  'plateforme', 'societe', true, '"411"'::jsonb),
  ('compte.fournisseur_collectif','comptabilite', 'Compte collectif fournisseurs',        'string', 'structurant',  'plateforme', 'societe', true, '"401"'::jsonb),
  ('compte.banque_defaut',        'comptabilite', 'Compte de banque par défaut',          'string', 'operationnel', 'plateforme', 'societe', true, '"521"'::jsonb),
  ('compte.caisse_defaut',        'comptabilite', 'Compte de caisse par défaut',          'string', 'operationnel', 'plateforme', 'societe', true, '"571"'::jsonb),
  ('compte.ecart_reglement',      'comptabilite', 'Compte d''écart de règlement',         'string', 'operationnel', 'plateforme', 'societe', true, '"658"'::jsonb),
  ('compte.arrondi',              'comptabilite', 'Compte d''arrondi',                     'string', 'operationnel', 'plateforme', 'societe', true, '"658"'::jsonb),
  ('compte.resultat_net',         'comptabilite', 'Compte de résultat net',               'string', 'structurant',  'plateforme', 'societe', true, '"130"'::jsonb)
on conflict (cle) do nothing;
