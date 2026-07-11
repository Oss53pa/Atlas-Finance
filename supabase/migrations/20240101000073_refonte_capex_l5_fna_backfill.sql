-- =============================================================================
-- Refonte OPEX/CAPEX — Lot 5 : backfill fna_*→tenant_id
--
-- Constat (prod) : les tables fna_car / fna_capex_approval / _pir / _note sont
-- VIDES (0 ligne) — aucune donnée transactionnelle CAPEX à migrer. Le nouveau
-- module CAPEX est tenant_id-natif (capex_projets, capex_bc_*, capex_reaffectations)
-- et n'utilise plus fna_car. Seule fna_capex_approval_matrix porte 4 lignes de
-- configuration (matrice d'approbation par défaut) ; on les rattache au tenant
-- opérationnel (EMERGENCE PLAZA). org_id conservé (bascule réversible).
--
-- Le problème de correspondance org_id→societes (org_id ne mappe à aucun
-- societes.id) est donc SANS OBJET : il n'y a pas de données à réconcilier.
-- =============================================================================
update public.fna_capex_approval_matrix
   set tenant_id = '8da05584-3046-4f0d-8524-e3915be1c558'
 where tenant_id is null;
