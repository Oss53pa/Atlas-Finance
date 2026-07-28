-- ============================================================================
-- Paramètres · Lot B·3 (vague 3) — Branchement fiscal ↔ socle (décision P-fisc).
--
-- fiscalParameters.ts reste le RÉFÉRENTIEL plateforme versionné par (pays,
-- année). Le socle porte les SURCHARGES tenant qui priment. On enregistre donc
-- au catalogue les paramètres fiscaux surchargeables — SANS valeur_defaut (pour
-- ne pas masquer la valeur TS pays/année : en l'absence de surcharge, le bridge
-- retombe sur fiscalParameters). Gouvernance « controle » (fiscal sensible).
-- Idempotent.
-- ============================================================================

insert into public.param_definition (cle, module, libelle, type_valeur, type_gouvernance, portee_min, portee_max, surcharge_autorisee)
values
  ('fiscal.is_taux',               'fiscalite', 'IS — taux standard (%)',                'number', 'controle', 'plateforme', 'societe', true),
  ('fiscal.is_taux_reduit',        'fiscalite', 'IS — taux réduit (%)',                  'number', 'controle', 'plateforme', 'societe', true),
  ('fiscal.imf_taux',              'fiscalite', 'IMF — taux (% du CA)',                  'number', 'controle', 'plateforme', 'societe', true),
  ('fiscal.imf_plancher',          'fiscalite', 'IMF — plancher (montant minimum)',      'number', 'controle', 'plateforme', 'societe', true),
  ('fiscal.tva_taux',              'fiscalite', 'TVA — taux standard (%)',               'number', 'controle', 'plateforme', 'societe', true),
  ('fiscal.deficit_report_annees', 'fiscalite', 'Report déficitaire — années autorisées','number', 'controle', 'plateforme', 'societe', true)
on conflict (cle) do nothing;
