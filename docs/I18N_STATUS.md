# Suivi de la traduction (i18n) — Atlas F&A

Généré automatiquement depuis le code. Trois langues : fr (référence), en, es — parité de clés garantie.

## État

- Clés de traduction : **12755** par langue (fr / en / es)
- Fichiers .tsx contenant encore des chaînes françaises : **223** (dont **158** sans aucun `useLanguage()`)
- Lignes concernées : **2696**

Modules entièrement traduits :

- **Clôtures** (`src/pages/closures`, 19 fichiers)
- **Budget / CAPEX** (`src/pages/budget`, 43 fichiers)
- **Immobilisations** (`src/pages/assets`, 7 fichiers)

> Le comptage exclut les commentaires. « i18n partiel » = le fichier utilise déjà
> `useLanguage()` mais conserve des chaînes codées en dur (souvent un libellé
> résiduel dans un tableau de données ou un export).

## Reste à traiter, par répertoire

| Répertoire | Lignes FR |
|---|---:|
| `src/pages/tiers` | 269 |
| `src/pages/settings` | 262 |
| `src/pages/dashboard` | 229 |
| `src/pages/reporting` | 167 |
| `src/pages/treasury` | 145 |
| `src/pages/core` | 134 |
| `src/pages/config` | 124 |
| `src/components/admin/sections` | 97 |
| `src/pages/financial` | 97 |
| `src/pages/platform` | 75 |
| `src/pages/assets` | 73 |
| `src/pages/stock` | 73 |
| `src/components/demo` | 67 |
| `src/pages/analytics` | 66 |
| `src/pages/security` | 65 |
| `src/features/report-builder/components` | 61 |
| `src/pages/accounting` | 59 |
| `src/pages/admin-console` | 59 |
| `src/components/accounting` | 48 |
| `src/pages` | 47 |
| `src/features/report-builder/components/sidebar` | 44 |
| `src/pages/onboarding` | 41 |
| `src/pages/validation` | 39 |
| `src/components/tasks` | 27 |
| `src/features/report-builder/components/blocks` | 26 |
| `src/pages/cabinet` | 21 |
| `src/pages/integration` | 21 |
| `src/pages/workspace` | 21 |
| `src/pages/help` | 21 |
| `src/pages/taxation` | 18 |
| `src/components/gating` | 17 |
| `src/pages/admin/sections` | 17 |
| `src/pages/budgeting` | 14 |
| `src/pages/framework` | 13 |
| `src/components/admin` | 12 |
| `src/features/collaboration/components` | 12 |
| `src/pages/public` | 11 |
| `src/components/financial` | 10 |
| `src/components/common` | 9 |
| `src/components/security` | 9 |
| `src/components/ui` | 8 |
| `src/features/report-builder/components/properties` | 8 |
| `src/components/shared` | 7 |
| `src/components/onboarding` | 7 |
| `src/pages/budget` | 7 |
| `src/components/chatbot/components` | 6 |
| `src/components/settings` | 6 |
| `src/components/collaboration` | 6 |
| `src/contexts` | 4 |
| `src/components/layout` | 3 |
| `src` | 3 |
| `src/pages/auth` | 3 |
| `src/pages/closures/sections` | 3 |
| `src/components/closures` | 2 |
| `src/components/auth` | 1 |
| `src/components/budget` | 1 |
| `src/components/import` | 1 |

## Les 40 fichiers les plus concernés

| Fichier | Lignes FR | i18n |
|---|---:|---|
| `src/pages/tiers/RecouvrementModule.tsx` | 213 | partiel |
| `src/pages/config/PlanSYSCOHADAPage.tsx` | 86 | partiel |
| `src/pages/core/SetupWizardPage.tsx` | 65 | partiel |
| `src/pages/core/ExercicePage.tsx` | 57 | partiel |
| `src/pages/settings/ImportExportPage.tsx` | 54 | partiel |
| `src/pages/dashboard/AlertsSystem.tsx` | 53 | partiel |
| `src/components/admin/sections/AdminBackup.tsx` | 52 | aucun |
| `src/pages/reporting/ReportingSyscohada.tsx` | 48 | partiel |
| `src/pages/settings/MobileAppPage.tsx` | 48 | partiel |
| `src/pages/reporting/DashboardsPage.tsx` | 47 | partiel |
| `src/pages/reporting/ReportingIFRS.tsx` | 47 | partiel |
| `src/pages/settings/OfflineModePage.tsx` | 45 | partiel |
| `src/pages/DemoPage.tsx` | 43 | aucun |
| `src/pages/assets/AssetsMaintenance.tsx` | 42 | partiel |
| `src/pages/analytics/AnalyticalAxesPage.tsx` | 38 | aucun |
| `src/pages/financial/CompteResultatPage.tsx` | 36 | partiel |
| `src/features/report-builder/components/sidebar/AtlasCatalogPanel.tsx` | 35 | aucun |
| `src/pages/dashboard/ManagerDashboard.tsx` | 33 | partiel |
| `src/pages/security/RolesPage.tsx` | 32 | partiel |
| `src/pages/config/MultiSocietesPage.tsx` | 30 | partiel |
| `src/pages/treasury/GestionPaiementsPage.tsx` | 30 | partiel |
| `src/pages/treasury/ConnexionsBancairesPage.tsx` | 30 | partiel |
| `src/pages/security/SecurityDashboard.tsx` | 29 | aucun |
| `src/pages/analytics/CostCentersPage.tsx` | 28 | aucun |
| `src/components/tasks/CompleteTasksModule.tsx` | 27 | partiel |
| `src/pages/financial/BilanSYSCOHADAPage.tsx` | 27 | partiel |
| `src/pages/validation/BannettePage.tsx` | 26 | aucun |
| `src/pages/reporting/ReportingDashboard.tsx` | 25 | aucun |
| `src/pages/financial/FinancialAnalysisPage.tsx` | 25 | aucun |
| `src/pages/onboarding/SolutionCatalogPage.tsx` | 24 | aucun |
| `src/pages/dashboard/WorkflowsManager.tsx` | 24 | partiel |
| `src/pages/dashboard/AdminDashboard.tsx` | 24 | aucun |
| `src/components/demo/InteractiveBilanDemo.tsx` | 22 | aucun |
| `src/features/report-builder/components/TemplateGalleryPage.tsx` | 22 | aucun |
| `src/pages/accounting/AccountingDashboard.tsx` | 20 | partiel |
| `src/pages/dashboard/KPIsRealTime.tsx` | 20 | aucun |
| `src/pages/dashboard/ExecutiveDigest.tsx` | 20 | aucun |
| `src/pages/tiers/AutresTiersModule.tsx` | 19 | partiel |
| `src/pages/treasury/EffetsCommercePage.tsx` | 19 | aucun |
| `src/pages/platform/AtlasFnAHome.tsx` | 18 | aucun |

## Convention appliquée

1. `import { useLanguage } from '@/contexts/LanguageContext';` puis `const { t } = useLanguage();`
2. Un namespace par module, clés en camelCase (`budgetImport.emptyFile`).
3. Paramètres : `t('ns.cle', { count: String(n) })` avec des marqueurs `{count}` dans le JSON.
4. **Les tables de constantes au niveau module** (onglets, libellés de statut,
   référentiels) doivent porter une **clé** (`labelKey`) et non un libellé : sinon
   elles sont figées à la langue du premier rendu. Elles se résolvent au rendu via
   `t(x.labelKey)`.
5. Dates et nombres : `const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';`
   — jamais de `'fr-FR'` codé en dur.
6. Attention aux callbacks `.map(t => …)` qui masquent la fonction `t` : renommer
   le paramètre.
7. La couche service ne fabrique pas de libellé traduit : elle renvoie un index ou
   un code (ex. `monthIndex`), l'appelant le localise.

## Exception documentée

`src/pages/tiers/RecouvrementModule.tsx` (≈15 000 lignes) est le premier fichier
par volume de français, mais ses chaînes sont entremêlées à des données de
démonstration codées en dur (noms de personnes, montants, cabinets d'avocats).
Le traduire partiellement recréerait exactement le problème d'« i18n partiel »
que ce chantier corrige. Il demande d'abord une décomposition en composants et
une extraction de ses données de démo.
