# Suivi de la traduction (i18n) — Atlas F&A

Généré automatiquement depuis le code. Trois langues : fr (référence), en, es — parité de clés garantie.

## État

- Clés de traduction : **13625** par langue (fr / en / es)
- Fichiers .tsx contenant encore des chaînes françaises : **176** (dont **132** sans aucun `useLanguage()`)
- Lignes concernées : **1437**

Modules entièrement traduits :

- **Clôtures** (`src/pages/closures`, 19 fichiers)
- **Budget / CAPEX** (`src/pages/budget`, 43 fichiers)
- **Immobilisations** (`src/pages/assets`, 7 fichiers)
- **Tableaux de bord** (`src/pages/dashboard`, 11 fichiers)

Modules presque terminés :

- **Paramètres** (`src/pages/settings`) — 17 des 20 fichiers ; restent OfflineModePage, MobileAppPage et ImportExportPage

> Le comptage exclut les commentaires. « i18n partiel » = le fichier utilise déjà
> `useLanguage()` mais conserve des chaînes codées en dur (souvent un libellé
> résiduel dans un tableau de données ou un export).

## Reste à traiter, par répertoire

| Répertoire | Lignes FR |
|---|---:|
| `src/pages/tiers` | 136 |
| `src/pages/settings` | 95 |
| `src/pages/core` | 89 |
| `src/pages/config` | 82 |
| `src/pages/financial` | 78 |
| `src/components/admin/sections` | 76 |
| `src/pages/reporting` | 72 |
| `src/pages/treasury` | 58 |
| `src/components/financial` | 45 |
| `src/pages/platform` | 44 |
| `src/components/demo` | 43 |
| `src/pages/stock` | 43 |
| `src/pages/security` | 41 |
| `src/pages` | 39 |
| `src/pages/accounting` | 35 |
| `src/pages/assets` | 34 |
| `src/pages/admin-console` | 34 |
| `src/pages/onboarding` | 34 |
| `src/pages/analytics` | 34 |
| `src/features/report-builder/components/sidebar` | 32 |
| `src/components/accounting` | 31 |
| `src/features/report-builder/components` | 29 |
| `src/pages/validation` | 27 |
| `src/features/report-builder/components/blocks` | 16 |
| `src/components/gating` | 15 |
| `src/components/tasks` | 14 |
| `src/pages/cabinet` | 14 |
| `src/pages/integration` | 13 |
| `src/pages/admin/sections` | 11 |
| `src/pages/taxation` | 11 |
| `src/pages/help` | 11 |
| `src/pages/workspace` | 10 |
| `src/features/collaboration/components` | 8 |
| `src/pages/public` | 8 |
| `src/pages/framework` | 8 |
| `src/components/shared` | 7 |
| `src/components/common` | 7 |
| `src/components/admin` | 5 |
| `src/components/ui` | 5 |
| `src/components/chatbot/components` | 5 |
| `src/components/onboarding` | 5 |
| `src/components/security` | 5 |
| `src/features/report-builder/components/properties` | 5 |
| `src/contexts` | 4 |
| `src/pages/budget` | 4 |
| `src/components/layout` | 3 |
| `src/components/settings` | 2 |
| `src/components/closures` | 2 |
| `src` | 2 |
| `src/pages/auth` | 2 |
| `src/pages/budgeting` | 2 |
| `src/components/auth` | 1 |
| `src/components/budget` | 1 |

## Les 40 fichiers les plus concernés

| Fichier | Lignes FR | i18n |
|---|---:|---|
| `src/pages/tiers/RecouvrementModule.tsx` | 103 | partiel |
| `src/pages/config/PlanSYSCOHADAPage.tsx` | 59 | partiel |
| `src/pages/core/SetupWizardPage.tsx` | 48 | partiel |
| `src/components/financial/CashFlowStatementSYSCOHADA.tsx` | 45 | aucun |
| `src/components/admin/sections/AdminBackup.tsx` | 43 | aucun |
| `src/pages/DemoPage.tsx` | 35 | aucun |
| `src/pages/settings/OfflineModePage.tsx` | 34 | partiel |
| `src/pages/core/ExercicePage.tsx` | 32 | partiel |
| `src/pages/settings/MobileAppPage.tsx` | 31 | partiel |
| `src/pages/financial/CompteResultatPage.tsx` | 29 | partiel |
| `src/features/report-builder/components/sidebar/AtlasCatalogPanel.tsx` | 27 | aucun |
| `src/pages/settings/ImportExportPage.tsx` | 27 | partiel |
| `src/pages/reporting/ReportingIFRS.tsx` | 22 | partiel |
| `src/pages/financial/BilanSYSCOHADAPage.tsx` | 22 | partiel |
| `src/pages/reporting/ReportingSyscohada.tsx` | 21 | partiel |
| `src/pages/onboarding/SolutionCatalogPage.tsx` | 21 | aucun |
| `src/pages/security/RolesPage.tsx` | 20 | partiel |
| `src/pages/validation/BannettePage.tsx` | 19 | aucun |
| `src/pages/security/SecurityDashboard.tsx` | 19 | aucun |
| `src/pages/config/MultiSocietesPage.tsx` | 18 | partiel |
| `src/pages/financial/FinancialAnalysisPage.tsx` | 18 | aucun |
| `src/pages/accounting/AccountingDashboard.tsx` | 18 | partiel |
| `src/pages/tiers/AutresTiersModule.tsx` | 18 | partiel |
| `src/pages/analytics/AnalyticalAxesPage.tsx` | 18 | aucun |
| `src/pages/assets/AssetsMaintenance.tsx` | 17 | partiel |
| `src/pages/analytics/CostCentersPage.tsx` | 16 | aucun |
| `src/components/gating/UpgradeBanner.tsx` | 15 | aucun |
| `src/features/report-builder/components/TemplateGalleryPage.tsx` | 15 | aucun |
| `src/pages/reporting/DashboardsPage.tsx` | 15 | partiel |
| `src/components/tasks/CompleteTasksModule.tsx` | 14 | partiel |
| `src/pages/reporting/ReportingDashboard.tsx` | 14 | aucun |
| `src/components/accounting/JournalDashboard.tsx` | 12 | partiel |
| `src/components/demo/InteractiveTaxDemo.tsx` | 12 | aucun |
| `src/components/demo/InteractiveBilanDemo.tsx` | 12 | aucun |
| `src/pages/treasury/TreasuryDashboard.tsx` | 12 | aucun |
| `src/pages/stock/MaterialsPage.tsx` | 12 | aucun |
| `src/components/admin/sections/AdminCompany.tsx` | 11 | aucun |
| `src/pages/admin/sections/AdminTaxRegistry.tsx` | 11 | aucun |
| `src/pages/platform/AtlasFnAHome.tsx` | 11 | aucun |
| `src/components/admin/sections/AdminOCR.tsx` | 10 | aucun |

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
