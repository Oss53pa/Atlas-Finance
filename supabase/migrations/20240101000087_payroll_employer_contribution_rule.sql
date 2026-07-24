-- ============================================================================
-- Correction de la règle de posting « charge patronale » (cycle paie)
--
-- La charge patronale (social_employer) était seedée avec le seul compte de
-- charge 664 au débit — sans contrepartie. L'écriture de paie générée par le
-- moteur d'intégration était alors DÉSÉQUILIBRÉE du montant patronal (le 664
-- débité n'avait aucun crédit correspondant).
--
-- Correction : la charge patronale débite 664 (charge) ET crédite 431 (dette
-- envers l'organisme social) — le moteur produit deux lignes auto-équilibrées
-- quand une règle porte à la fois un compte débit et un compte crédit.
--
-- Additive/idempotente : ne touche que les règles restées sans compte crédit
-- (défaut d'origine), jamais une règle déjà personnalisée par le comptable.
-- ============================================================================

update public.posting_rules
set credit_account = '431000',
    updated_at = now()
where event_type = 'payroll.run.validated'
  and line_role = 'social_employer'
  and (credit_account is null or credit_account = '');
