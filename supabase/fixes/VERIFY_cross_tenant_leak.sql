-- ============================================================================
-- DIAGNOSTIC — Fuite RLS cross-tenant (P0-1) — re-exécutable, NE MODIFIE RIEN
-- ----------------------------------------------------------------------------
-- Résultat au 2026-07-24 sur la base live (vgtmljfayiysuvrcmunt) : ✅ SAIN.
--   • Aucune policy public_read_*.
--   • Les policies qual=true/anon/public restantes sont sur des tables catalogue
--     /publiques légitimes (apps, solutions, site_content, currency_rates, RAG,
--     retention_policies, landing) ou des flux de signature par lien scopés
--     (document_shares/signature_consents/signer_verifications, token+expiry).
--   • Tables financières (journal_entries/lines, audit_logs, third_parties,
--     settings, fiscal_years, assets, invoices) : RLS active + policies tenant.
-- À re-lancer après tout changement de schéma/policies.
-- ============================================================================

-- 1) Policies publiques/anon dangereuses sur des tables SENSIBLES (doit être vide)
select tablename, policyname, cmd, roles::text, qual
from pg_policies
where schemaname='public'
  and (policyname like 'public_read_%' or policyname like 'allow_select_%'
       or qual = 'true' or 'anon' = any(roles))
  and tablename in ('journal_entries','journal_lines','audit_logs','third_parties',
                    'settings','fiscal_years','assets','invoices','subscriptions','tenants',
                    'organizations','bank_transactions','documents','liasses')
order by tablename, policyname;

-- 2) Tables sensibles : RLS active + nb policies (chaque table doit avoir RLS + >=1 policy)
select c.relname as tbl, c.relrowsecurity as rls_active, count(p.policyname) as nb_policies
from pg_class c
join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
left join pg_policies p on p.schemaname='public' and p.tablename=c.relname
where c.relkind='r' and c.relname in (
  'journal_entries','journal_lines','audit_logs','third_parties','settings',
  'fiscal_years','assets','invoices','subscriptions','tenants','organizations')
group by c.relname, c.relrowsecurity
order by c.relname;

-- 3) Vues sans security_invoker (bypass RLS potentiel)
select c.relname as vue,
       coalesce((select option_value from pg_options_to_table(c.reloptions)
                 where option_name='security_invoker'),'non défini') as security_invoker
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v'
order by 1;

-- INTERPRÉTATION : requête 1 VIDE ; requête 2 rls_active=true partout, nb_policies>=1 ;
-- requête 3 : les vues exposant des données tenant doivent être security_invoker=true.
