# Suivi de la traduction (i18n) — Atlas F&A

Généré automatiquement. Trois langues : fr (référence), en, es — parité de clés garantie.

## État

- Clés de traduction : **10508** par langue (fr / en / es)
- Fichiers .tsx contenant encore des chaînes françaises : **309**
- Lignes concernées : **5014**

> Le comptage exclut les commentaires. « i18n partiel » = le fichier utilise déjà
> `useLanguage()` mais conserve des chaînes codées en dur.

## Reste à traiter, par répertoire

| Répertoire | Lignes FR |
|---|---:|
| `src/pages/budget` | 574 |
| `src/pages/tiers` | 424 |
| `src/pages/settings` | 374 |
| `src/pages/dashboard` | 322 |
| `src/pages/assets` | 266 |
| `src/pages/treasury` | 213 |
| `src/pages/closures/sections` | 205 |
| `src/pages/reporting` | 202 |
| `src/pages/closures` | 184 |
| `src/pages/core` | 176 |
| `src/pages/config` | 140 |
| `src/components/admin/sections` | 129 |
| `src/pages/stock` | 114 |
| `src/pages/accounting` | 110 |
| `src/pages/financial` | 106 |
| `src/pages/platform` | 99 |
| `src/pages/security` | 91 |
| `src/components/accounting` | 88 |
| `src/pages/analytics` | 79 |
| `src/components/demo` | 75 |
| `src/features/report-builder/components` | 73 |
| `src/components/financial` | 66 |
| `src/pages/admin-console` | 64 |
| `src/pages/onboarding` | 61 |
| `src/pages` | 57 |
| `src/pages/integration` | 55 |
| `src/pages/taxation` | 53 |
| `src/pages/validation` | 52 |
| `src/features/report-builder/components/sidebar` | 47 |
| `src/pages/help` | 43 |

## Reste à traiter, par fichier (top 60)

| Fichier | Lignes FR | i18n |
|---|---:|---|
| `src/pages/tiers/RecouvrementModule.tsx` | 316 | partiel |
| `src/pages/closures/RevisionsModule.tsx` | 180 | partiel |
| `src/pages/closures/sections/Immobilisations.tsx` | 102 | partiel |
| `src/pages/closures/sections/EtatsSYSCOHADA.tsx` | 99 | partiel |
| `src/pages/config/PlanSYSCOHADAPage.tsx` | 91 | partiel |
| `src/pages/budget/VentilationRunPage.tsx` | 88 | aucun |
| `src/pages/core/SetupWizardPage.tsx` | 82 | partiel |
| `src/pages/core/ExercicePage.tsx` | 70 | partiel |
| `src/pages/settings/ImportExportPage.tsx` | 68 | partiel |
| `src/components/financial/CashFlowStatementSYSCOHADA.tsx` | 66 | aucun |
| `src/pages/assets/AssetsMaintenance.tsx` | 65 | partiel |
| `src/pages/dashboard/AlertsSystem.tsx` | 63 | partiel |
| `src/pages/reporting/ReportingIFRS.tsx` | 61 | partiel |
| `src/components/admin/sections/AdminBackup.tsx` | 60 | aucun |
| `src/pages/reporting/ReportingSyscohada.tsx` | 59 | partiel |
| `src/pages/settings/OfflineModePage.tsx` | 58 | partiel |
| `src/pages/budget/AnalyticsSectionsPage.tsx` | 56 | aucun |
| `src/pages/reporting/DashboardsPage.tsx` | 54 | partiel |
| `src/pages/settings/MobileAppPage.tsx` | 54 | partiel |
| `src/pages/DemoPage.tsx` | 53 | aucun |
| `src/pages/security/RolesPage.tsx` | 50 | partiel |
| `src/pages/analytics/AnalyticalAxesPage.tsx` | 48 | aucun |
| `src/pages/dashboard/ManagerDashboard.tsx` | 44 | partiel |
| `src/pages/assets/AssetsSummary.tsx` | 43 | aucun |
| `src/pages/treasury/GestionPaiementsPage.tsx` | 42 | partiel |
| `src/pages/config/MultiSocietesPage.tsx` | 41 | partiel |
| `src/pages/assets/AssetsCategories.tsx` | 38 | aucun |
| `src/pages/financial/CompteResultatPage.tsx` | 38 | partiel |
| `src/features/report-builder/components/sidebar/AtlasCatalogPanel.tsx` | 37 | aucun |
| `src/pages/dashboard/WorkflowsManager.tsx` | 37 | partiel |
| `src/pages/treasury/ConnexionsBancairesPage.tsx` | 36 | partiel |
| `src/pages/validation/BannettePage.tsx` | 36 | aucun |
| `src/components/tasks/CompleteTasksModule.tsx` | 35 | partiel |
| `src/pages/dashboard/FinancialAnalysisDashboard.tsx` | 35 | aucun |
| `src/pages/help/FAQPage.tsx` | 34 | aucun |
| `src/pages/budget/CapexRequestModal.tsx` | 33 | aucun |
| `src/pages/security/SecurityDashboard.tsx` | 33 | aucun |
| `src/pages/settings/TypographyGuide.tsx` | 33 | aucun |
| `src/pages/budget/BudgetExploitationPage.tsx` | 32 | aucun |
| `src/pages/budget/BudgetInvestissementPage.tsx` | 32 | aucun |
| `src/pages/analytics/CostCentersPage.tsx` | 31 | aucun |
| `src/pages/onboarding/SolutionCatalogPage.tsx` | 31 | aucun |
| `src/pages/assets/AssetsTransactions.tsx` | 30 | aucun |
| `src/pages/dashboard/AdminDashboard.tsx` | 30 | aucun |
| `src/pages/financial/BilanSYSCOHADAPage.tsx` | 30 | partiel |
| `src/pages/accounting/AccountingDashboard.tsx` | 29 | partiel |
| `src/pages/dashboard/ExecutiveDigest.tsx` | 29 | aucun |
| `src/pages/financial/FinancialAnalysisPage.tsx` | 28 | aucun |
| `src/pages/reporting/ReportingDashboard.tsx` | 28 | aucun |
| `src/pages/platform/AtlasFnAHome.tsx` | 27 | aucun |
| `src/pages/tiers/AutresTiersModule.tsx` | 27 | partiel |
| `src/pages/dashboard/PremiumOverview.tsx` | 26 | partiel |
| `src/components/accounting/JournalDashboard.tsx` | 24 | partiel |
| `src/pages/core/CompanyPage.tsx` | 24 | aucun |
| `src/pages/framework/FrameworkPage.tsx` | 24 | aucun |
| `src/pages/taxation/DSFPage.tsx` | 24 | aucun |
| `src/pages/taxation/EcheancesFiscalesPage.tsx` | 24 | aucun |
| `src/features/report-builder/components/TemplateGalleryPage.tsx` | 23 | aucun |
| `src/pages/budget/BudgetCockpitPage.tsx` | 23 | aucun |
| `src/pages/budget/BudgetEngagementsPage.tsx` | 23 | aucun |

## Convention

1. `import { useLanguage } from '@/contexts/LanguageContext';` puis `const { t } = useLanguage();`
2. Un namespace par module dans `src/locales/{fr,en,es}.json`, clés en camelCase.
3. Interpolation : `t('ns.key', { count: String(n) })` — placeholders `{name}`.
4. Les constantes de module (onglets, libellés) deviennent des fabriques prenant `t`.
5. Dates/nombres : dériver la locale de `language` (`fr-FR` / `en-US` / `es-ES`).
