# Brief — Audit d'autorisation React + Supabase (portable à toutes les apps Atlas Studio)

> Issu de l'audit WiseBook / Atlas F&A (2026-07-24). À appliquer tel quel à chaque app
> React + Supabase de la Suite (Trade, Procure, People, Advist, Studio…). Chaque app a
> sa propre base Supabase → **répéter l'intégralité sur chaque `project-ref`**.

---

## 0. Le modèle mental (à retenir avant tout)

**La console développeur ne « hacke » rien.** Tout le JS front est déjà chez le visiteur : il peut
lire le code, révéler les boutons cachés, forcer une route admin en React, lire la clé `anon`
(publique par conception), et forger n'importe quelle requête avec **les droits de son compte**.

> **La seule barrière qui compte est SERVEUR.** Un garde React (`if role !== 'admin'`) est
> cosmétique. La question n'est jamais « peut-on ouvrir l'écran admin ? » (oui, presque toujours)
> mais « **quand la requête forgée arrive, le serveur la refuse-t-il ?** ». Trois barrières
> serveur : (1) RLS Postgres, (2) RPC/fonctions dérivant le tenant du JWT, (3) la clé
> `service_role` jamais côté client.

**Deux catégories de gravité, à distinguer systématiquement :**
- **Cross-tenant** = lire/écrire les données d'un AUTRE tenant. **Catastrophique.**
- **Intra-tenant** = escalade de rôle DANS son propre tenant (se faire admin, écrire en lecture
  seule, s'auto-activer une souscription). **Grave mais borné.**

---

## 1. Les 5 classes de failles trouvées (à chercher partout)

| # | Classe | Symptôme | Gravité |
|---|--------|----------|---------|
| F1 | **`service_role` exposée côté client** | clé service dans `.env` livré / `src/` | 🔴 Catastrophique |
| F2 | **Policy RLS permissive** | `USING (true)`, `public_read_*`, `TO anon/public` sur données tenant | 🔴 Cross-tenant |
| F3 | **RPC `SECURITY DEFINER` à `p_tenant_id` client** | le client passe le tenant en paramètre au lieu de le dériver du JWT | 🔴 Cross-tenant |
| F4 | **Vue sans `security_invoker`** | vue exécutée avec les droits du créateur → bypass RLS | 🔴 Cross-tenant |
| F5 | **Autorisation par rôle uniquement en React** | RLS/edge functions filtrent le tenant mais PAS le rôle ; policies UPDATE permissives ; edge function qui vérifie l'authentification mais pas le rôle appelant | 🟠 Intra-tenant |

---

## 2. PHASE A — DIAGNOSTIC (ne modifie rien)

### A.1 Côté base — 5 requêtes SQL (SQL editor Supabase, rôle postgres)

Remplacer la liste de tables sensibles par celles de l'app (documents, transactions, factures…).

```sql
-- F2 — Policies publiques/anon dangereuses sur des tables SENSIBLES (doit être VIDE)
select tablename, policyname, cmd, roles::text, qual
from pg_policies
where schemaname='public'
  and (policyname like 'public_read_%' or policyname like 'allow_select_%'
       or qual='true' or 'anon'=any(roles))
  and tablename in ( /* ⬅ tables sensibles de CETTE app */ )
order by tablename, policyname;

-- F2/base — chaque table sensible a-t-elle RLS + >=1 policy ? (rls_active DOIT être true)
select c.relname as tbl, c.relrowsecurity as rls_active, count(p.policyname) nb
from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
left join pg_policies p on p.schemaname='public' and p.tablename=c.relname
where c.relkind='r' and c.relname in ( /* ⬅ tables sensibles */ )
group by 1,2 order by 1;

-- F4 — Vues sans security_invoker (bypass RLS potentiel)
select c.relname,
  coalesce((select option_value from pg_options_to_table(c.reloptions)
            where option_name='security_invoker'),'NON DÉFINI') as security_invoker
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v' order by 1;

-- F5 — Policies UPDATE/DELETE permissives (sans contrôle de rôle) sur données de facturation/config
select tablename, policyname, cmd, qual
from pg_policies
where schemaname='public' and cmd in ('UPDATE','DELETE','ALL')
  and tablename in ('tenants','organizations','subscriptions','invoices' /* + config app */)
order by tablename, cmd;

-- Inventaire des helpers d'autorisation RÉELLEMENT présents (⚠️ drift repo↔base)
select p.proname, pg_get_function_identity_arguments(p.oid) args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace and n.nspname='public'
where p.proname ~* 'admin|tenant|company|org|role' order by 1;
```

**Interprétation :** requête 1 VIDE (sinon fuite F2). rls_active=true partout. Vues tenant en
`security_invoker=true`. Requête 4 : toute UPDATE `USING (tenant = …)` **sans** clause de rôle
à côté d'une policy admin = faille F5 (les policies permissives sont OR'ées → la permissive gagne).

### A.2 Côté code — grep dans le repo

```bash
# F1 — service_role JAMAIS côté client (doit renvoyer 0 hors supabase/functions/ et migrations)
grep -rn "service_role\|SERVICE_ROLE\|serviceRole" src/            # → 0 attendu
grep -rniE "service_role|SERVICE_ROLE" .env .env.local .env.production 2>/dev/null  # → rien

# F3 — RPC appelées avec un tenant fourni par le client
grep -rn "\.rpc(" src/ | grep -iE "tenant|company|org"

# F5 — routes admin : gardées seulement en React ? edge functions sans check de rôle
grep -rn "admin" src/App.tsx                                       # routes admin non gardées ?
grep -rLn "role\|canAdmin\|is_admin\|ADMIN_REQUIRED" supabase/functions/*/index.ts  # fn sans contrôle de rôle
```

Pour chaque **edge function** qui utilise `service_role` : vérifier qu'elle (1) authentifie
l'appelant (`getUser(token)`) ET (2) **vérifie son rôle** avant toute écriture. Le patron sain :
`if (!canAdmin(callerRole)) return 403`. Le patron cassé : authentifie seulement, puis écrit un
`role` venu du body client.

---

## 3. PHASE B — CORRECTION (patterns testés)

> **Toujours tester en transaction rollback AVANT d'appliquer :** `BEGIN; <migration>; <SELECT de vérif>; ROLLBACK;`
> puis appliquer via `apply_migration` (tracé dans l'historique).

**F1** — sortir la `service_role` du client. Toute opération qui en a besoin passe par une **edge
function** qui re-vérifie les droits de l'appelant. Le client n'a que l'`anon` key.

**F2** — supprimer les policies permissives, garantir une policy tenant :
```sql
DROP POLICY IF EXISTS "public_read_xxx" ON public.<table>;
-- puis policy tenant-scopée :
CREATE POLICY <t>_tenant_select ON public.<table> FOR SELECT
  USING (tenant_id = <helper_tenant_du_jwt>());
```

**F3** — la RPC dérive le tenant du JWT et **rejette** un `p_tenant_id` divergent :
```sql
v_tenant := <helper_tenant_du_jwt>();
IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant THEN
  RAISE EXCEPTION 'Accès refusé : tenant demandé ≠ tenant courant.';
END IF;
```
+ `REVOKE EXECUTE ON FUNCTION … FROM anon, public;` (⚠️ `FROM anon` seul ne suffit pas, mettre `public`).

**F4** — `ALTER VIEW public.<vue> SET (security_invoker = true);`

**F5** — mettre le contrôle de rôle CÔTÉ SERVEUR :
- *RLS billing/config* : supprimer l'UPDATE permissive, garder/créer la version admin-gatée :
  ```sql
  DROP POLICY IF EXISTS "Users can update <x>" ON public.<table>;
  CREATE POLICY <x>_admin_update ON public.<table>
    FOR UPDATE USING (<is_admin_du_jwt>()) WITH CHECK (<is_admin_du_jwt>());
  ```
- *Edge function* : vérifier le rôle de l'appelant avant d'agir, borner le rôle assignable :
  ```ts
  const { data: prof } = await supa.from('profiles').select('role').eq('id', caller.id).maybeSingle();
  if (!['admin','super_admin'].includes(String(prof?.role))) return json(403, {error:'ADMIN_REQUIRED'});
  const requestedRole = ALLOWED_ROLES.includes(body.role) ? body.role : 'Lecteur'; // jamais le body brut
  ```
- *Garde React* : garder aussi le garde client (UX/défense en profondeur) MAIS ne jamais s'y fier seul.

---

## 4. ⚠️ Pièges spécifiques Atlas Studio (vérifiés sur WiseBook)

1. **Drift repo ↔ base.** Le code des migrations MENT sur l'état réel. Sur WiseBook, `is_atlas_superadmin()`
   et `get_my_tenant_id()` (définis dans une migration) **n'existaient pas en base** ; `user_profiles`
   était **vide**. → **Toujours diagnostiquer la BASE live**, jamais se fier aux fichiers de migration.
   Lister les helpers réellement présents (requête A.1 n°5) avant d'écrire un fix qui les appelle.
2. **Plusieurs modèles de rôles en parallèle.** WiseBook en a 3 : `profiles.role` (admin/client),
   `user_companies.role` (Administrateur/Manager/Comptable/Lecteur), `user_profiles.role` (plateforme).
   → identifier lequel est **peuplé** et lequel gouverne chaque table. Un fix keyé sur une table vide
   verrouille tout le monde.
3. **Fail-safe obligatoire.** Sur base financière, un fix de rôle trop strict verrouille les
   utilisateurs légitimes. Ex. WiseBook : l'admin principal était dans `profiles` mais absent de
   `user_companies` → un check `user_companies` seul l'aurait bloqué. → accepter l'**union** des
   sources d'admit réellement peuplées ; défaut = moindre privilège, jamais lockout.
4. **`p0-*` hors migrations.** Les correctifs critiques peuvent vivre dans `supabase/fixes/` (hors
   `migrations/`) → rien ne prouve qu'ils sont appliqués. Vérifier en base, pas dans le repo.
5. **Déploiement en 3 canaux distincts.** Une migration (SQL) est live dès `apply_migration` ; une
   **edge function** n'est active qu'après `supabase functions deploy <fn> --project-ref <ref>` ; un
   **garde React** qu'après build+déploiement front. Ne pas croire une faille fermée tant que les 3
   canaux concernés ne sont pas déployés.

---

## 5. Checklist par application

Pour **chaque** app (Trade, Procure, People, Advist, Studio, …) :

- [ ] `project-ref` Supabase identifié
- [ ] A.1 — 5 requêtes SQL lancées, résultats consignés
- [ ] A.2 — greps `service_role` / `.rpc(` / routes admin / edge functions
- [ ] F1 : `service_role` absente du client → **sinon P0 immédiat**
- [ ] F2 : requête 1 VIDE + RLS active sur toutes les tables sensibles
- [ ] F3 : RPC dérivent le tenant du JWT (pas `p_tenant_id` client)
- [ ] F4 : vues tenant en `security_invoker=true`
- [ ] F5 : edge functions à `service_role` vérifient le rôle appelant ; pas d'UPDATE permissive billing/config
- [ ] Correctifs testés en transaction rollback, puis appliqués via `apply_migration`
- [ ] Edge functions corrigées **redéployées**
- [ ] Front rebuild+déployé pour les gardes React
- [ ] Diagnostic A.1 re-lancé → tout au vert

---

## Annexe — Ce qui a été fait sur WiseBook (référence)

- **Cross-tenant : SAIN** (vérifié live — RLS active, aucune `public_read_*` sur tables financières).
- **F5 corrigés** : `create-user` exige un appelant admin (union profiles/user_companies) + rôle borné ;
  garde `/admin-console` ; migration `095` supprime les UPDATE permissives sur `subscriptions`/`organizations`
  (**appliquée + vérifiée en prod**). PR #67 mergée sur `master`.
- **Reste** : déployer l'edge function `create-user` (`supabase functions deploy create-user --project-ref vgtmljfayiysuvrcmunt`).
- Diagnostic réutilisable : `supabase/fixes/VERIFY_cross_tenant_leak.sql`.
