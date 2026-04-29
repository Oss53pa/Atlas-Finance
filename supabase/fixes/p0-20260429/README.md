# Atlas F&A — Scripts de correction P0

**Version :** 1.0
**Date :** 29 avril 2026
**Cible :** Atlas F&A en pré-production (avant ouverture clients externes)

---

## 🎯 Objectif

Corriger les **5 problèmes P0 BLOQUANTS** identifiés lors de l'audit du schema Supabase. Sans ces corrections, **l'application NE DOIT PAS être ouverte à des clients externes**.

---

## ⚠️ Avant d'exécuter

1. **Backup complet** de ta base Supabase :
   ```bash
   supabase db dump > atlas-fa-backup-$(date +%Y%m%d).sql
   ```

2. **Tester en STAGING** d'abord si tu as un environnement séparé.

3. **Fenêtre de maintenance** : prévoir 30 minutes (en pratique 5-10 min suffisent).

4. **Notifier les utilisateurs internes** que l'app sera momentanément inaccessible.

---

## 📋 Ordre d'exécution

| # | Script | Durée | Risque | Effet |
|---|--------|-------|--------|-------|
| 01 | `01_backup_et_inventaire.sql` | < 5s | Aucun | Crée table de backup des policies |
| 02 | `02_supprimer_public_read_policies.sql` | 10-30s | **MOYEN** | Supprime 80+ policies dangereuses |
| 03 | `03_completer_policies_rls.sql` | < 10s | Faible | Active RLS partout |
| 04 | `04_securiser_vues.sql` | < 5s | Faible | security_invoker sur les vues |
| 05 | `05_numerotation_sequentielle_robuste.sql` | 30s-2min | **MOYEN** | Robustifie generate_sequential_entry_number |
| 06 | `06_audit_logs_immuabilite.sql` | < 5s | Faible | Garantit immuabilité audit_logs |
| 07 | `07_smoke_tests.sql` | < 10s | Aucun | Vérifie que tout est OK |

**Durée totale : ~5-10 minutes**

---

## 🚨 Problèmes corrigés

### P0-1 : Fuite RLS catastrophique (`public_read_*`)
**Avant :** N'importe quel utilisateur (même non authentifié) pouvait lire toutes les écritures comptables, audit logs, transactions bancaires de TOUS les tenants.
**Après :** Chaque utilisateur ne voit que les données de son tenant.

### P0-3 : Numérotation séquentielle non concurrentielle
**Avant :** Risque de doublons d'entry_number ou trous en cas d'inserts simultanés.
**Après :** Verrou avisory transactionnel par (tenant, journal, année) garantit unicité et continuité.

### P0-4 : Vues bypass RLS
**Avant :** Les vues `active_journal_entries`/`active_journal_lines` exposaient potentiellement les données cross-tenant.
**Après :** `security_invoker = true` sur toutes les vues.

### P0-7 : Audit logs mutables (P1 reclassé P0)
**Avant :** Policy UPDATE permissive contredisait la policy de blocage.
**Après :** Audit logs strictement immuables (INSERT only).

---

## ❌ Ce que ces scripts NE FONT PAS

- **P0-2 (Money.ts)** : Migration `numeric → bigint` sur les colonnes monétaires. C'est un changement structurel qui mérite son propre script de migration et un dev frontend coordonné. Sera traité dans une phase ultérieure.

- **P0-5 (FEC)** : Implémentation de la génération du Fichier des Écritures Comptables. À développer comme nouvelle Edge Function ou fonction PG dédiée (livré dans la roadmap NestJS).

---

## ✅ Validation post-exécution

Après avoir exécuté les scripts 01 à 07, vérifier que **TOUS les tests dans le script 07 affichent ✅**.

En cas de ❌ sur un test :
1. **NE PAS ouvrir l'app à des clients externes**
2. Examiner le détail de l'erreur dans les logs Supabase
3. Me partager le message d'erreur pour diagnostic

---

## 🔄 Rollback d'urgence

Chaque script contient une section `ROLLBACK D'URGENCE` à la fin. La table `_atlas_fa_policy_backup_20260429` permet de restaurer les anciennes policies si nécessaire (mais cela rétablit la faille de sécurité, donc à éviter).

---

## 📞 Contact / Support

En cas de problème pendant l'exécution :
1. **NE PAS continuer** au script suivant si un script échoue
2. Capturer le message d'erreur complet
3. Examiner la section "VÉRIFICATION POST-EXÉCUTION" du script en question
