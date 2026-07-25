-- ============================================================================
-- Paramètres · Lot B·1 (suite) — Migration des clés `settings` vers le socle.
--
-- Copie NON DESTRUCTIVE : la table `settings` reste intacte (les lecteurs
-- existants continuent de fonctionner) ; les valeurs sont dupliquées dans
-- param_valeur (portée société) sous le namespace `settings.<clé>`, de sorte
-- que les nouveaux consommateurs lisent via param_resolve.
--
-- Clés migrées (présentes en base, toutes des objets JSON) :
--   settings.admin_company_legal   (identité légale — source canonique)
--   settings.admin_company_devise  (devise & formats)
--   settings.tax_decl_marks        (marques de déclarations)
-- Idempotent (on conflict / not exists).
-- ============================================================================

insert into public.param_definition (cle, module, libelle, type_valeur, type_gouvernance, portee_min, portee_max, surcharge_autorisee)
values
  ('settings.admin_company_legal',  'societe',     'Identité légale de la société',        'json', 'structurant',  'societe', 'societe', false),
  ('settings.admin_company_devise', 'comptabilite','Devise de tenue & formats',            'json', 'structurant',  'societe', 'societe', false),
  ('settings.tax_decl_marks',       'fiscalite',   'Marques de déclarations fiscales',     'json', 'operationnel', 'societe', 'societe', true)
on conflict (cle) do nothing;

insert into public.param_valeur (definition_id, tenant_id, portee, valeur, statut, motif)
select d.id, s.tenant_id, 'societe', s.value::jsonb, 'actif', 'migration settings→param B·1'
from public.settings s
join public.param_definition d on d.cle = 'settings.' || s.key
where s.value is not null
  and left(btrim(s.value), 1) in ('{', '[')
  and not exists (
    select 1 from public.param_valeur v
    where v.definition_id = d.id and v.tenant_id = s.tenant_id and v.portee = 'societe' and v.statut = 'actif'
  );
