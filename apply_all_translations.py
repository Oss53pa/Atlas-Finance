#!/usr/bin/env python3
"""
Script complet pour appliquer les traductions i18n dans tout le projet WiseBook
"""

import re
import json
from pathlib import Path

FRONTEND_DIR = Path("frontend/src")
LOCALES_DIR = FRONTEND_DIR / "locales"

# Liste étendue de tous les fichiers importants à traduire
files_to_translate = [
    # Pages principales
    FRONTEND_DIR / "pages/LandingPage.tsx",
    FRONTEND_DIR / "pages/ModernDashboardPage.tsx",
    FRONTEND_DIR / "pages/ModernSettingsPage.tsx",
    FRONTEND_DIR / "pages/ParametersPage.tsx",

    # Pages de comptabilité
    FRONTEND_DIR / "pages/accounting/ModernAccountingDashboard.tsx",
    FRONTEND_DIR / "pages/accounting/ChartOfAccountsAdvancedPage.tsx",
    FRONTEND_DIR / "pages/accounting/GeneralLedgerPage.tsx",
    FRONTEND_DIR / "pages/accounting/BalanceSheetPage.tsx",
    FRONTEND_DIR / "pages/accounting/IncomeStatementPage.tsx",
    FRONTEND_DIR / "pages/accounting/CashFlowPage.tsx",
    FRONTEND_DIR / "pages/accounting/FinancialStatementsPage.tsx",
    FRONTEND_DIR / "pages/accounting/LettrageAutomatiquePage.tsx",
    FRONTEND_DIR / "pages/accounting/LettragePage.tsx",
    FRONTEND_DIR / "pages/accounting/ReportsPage.tsx",
    FRONTEND_DIR / "pages/accounting/AdvancedBalancePage.tsx",

    # Pages de trésorerie
    FRONTEND_DIR / "pages/treasury/ModernTreasuryPage.tsx",
    FRONTEND_DIR / "pages/treasury/GestionPaiementsPage.tsx",
    FRONTEND_DIR / "pages/treasury/PositionTresoreriePage.tsx",
    FRONTEND_DIR / "pages/treasury/CashFlowManagementPage.tsx",
    FRONTEND_DIR / "pages/treasury/SimpleTreasuryDashboard.tsx",

    # Pages des immobilisations
    FRONTEND_DIR / "pages/assets/ModernAssetsManagement.tsx",
    FRONTEND_DIR / "pages/assets/CycleVieCompletPage.tsx",
    FRONTEND_DIR / "pages/assets/FixedPage.tsx",

    # Pages clients/fournisseurs
    FRONTEND_DIR / "pages/customers/CustomersListPage.tsx",
    FRONTEND_DIR / "pages/suppliers/SuppliersListPage.tsx",
    FRONTEND_DIR / "pages/suppliers/SuppliersAdvancedPage.tsx",

    # Pages de rapports
    FRONTEND_DIR / "pages/reports/ModernReportsAndAnalytics.tsx",
    FRONTEND_DIR / "pages/reports/UnifiedReportsView.tsx",

    # Pages de clôture
    FRONTEND_DIR / "pages/closures/ComprehensiveClosuresModule.tsx",

    # Pages de configuration
    FRONTEND_DIR / "pages/config/AssistantDemarragePage.tsx",
    FRONTEND_DIR / "pages/settings/AccountingSettingsPageV2.tsx",
    FRONTEND_DIR / "pages/settings/IAConfigPage.tsx",

    # Composants principaux
    FRONTEND_DIR / "components/layout/ERPLayout.tsx",
    FRONTEND_DIR / "components/layout/DoubleSidebar.tsx",
    FRONTEND_DIR / "components/layout/WorkspaceLayout.tsx",
    FRONTEND_DIR / "components/layout/Sidebar.tsx",

    # Composants comptables
    FRONTEND_DIR / "components/accounting/FloatingJournalButton.tsx",
    FRONTEND_DIR / "components/accounting/IntelligentEntryAssistant.tsx",
    FRONTEND_DIR / "components/accounting/Lettrage.tsx",
]

# Dictionnaire étendu de traductions
TRANSLATIONS = {
    # Navigation et menus principaux
    "Tableau de bord": ("dashboard.title", "Tableau de bord", "Dashboard", "Panel de control"),
    "Dashboard Executive": ("dashboard.executive", "Dashboard Executive", "Executive Dashboard", "Panel Ejecutivo"),
    "Vue d'ensemble": ("dashboard.overview", "Vue d'ensemble", "Overview", "Vista general"),
    "Statistiques": ("dashboard.statistics", "Statistiques", "Statistics", "Estadísticas"),
    "Activité récente": ("dashboard.recentActivity", "Activité récente", "Recent Activity", "Actividad reciente"),
    "Performance": ("dashboard.performance", "Performance", "Performance", "Rendimiento"),

    # Comptabilité
    "Comptabilité": ("accounting.title", "Comptabilité", "Accounting", "Contabilidad"),
    "Plan comptable": ("accounting.chartOfAccounts", "Plan comptable", "Chart of Accounts", "Plan de cuentas"),
    "Grand livre": ("accounting.generalLedger", "Grand livre", "General Ledger", "Libro mayor"),
    "Balance générale": ("accounting.generalBalance", "Balance générale", "Trial Balance", "Balance general"),
    "Bilan": ("accounting.balanceSheet", "Bilan", "Balance Sheet", "Balance"),
    "Compte de résultat": ("accounting.incomeStatement", "Compte de résultat", "Income Statement", "Estado de resultados"),
    "Saisie d'écritures": ("accounting.entryInput", "Saisie d'écritures", "Entry Input", "Entrada de asientos"),
    "Saisie Intelligente": ("accounting.intelligentEntry", "Saisie Intelligente", "Smart Entry", "Entrada inteligente"),
    "Validation des écritures": ("accounting.entryValidation", "Validation des écritures", "Entry Validation", "Validación de asientos"),
    "États financiers": ("accounting.financialStatements", "États financiers", "Financial Statements", "Estados financieros"),
    "États SYSCOHADA": ("accounting.syscohadaReports", "États SYSCOHADA", "SYSCOHADA Reports", "Informes SYSCOHADA"),

    # Journaux
    "Journaux comptables": ("journals.accounting", "Journaux comptables", "Accounting Journals", "Diarios contables"),
    "Journal des ventes": ("journals.sales", "Journal des ventes", "Sales Journal", "Diario de ventas"),
    "Journal des achats": ("journals.purchases", "Journal des achats", "Purchase Journal", "Diario de compras"),
    "Journal de banque": ("journals.bank", "Journal de banque", "Bank Journal", "Diario bancario"),
    "Journal de caisse": ("journals.cash", "Journal de caisse", "Cash Journal", "Diario de caja"),
    "Opérations diverses": ("journals.miscellaneous", "Opérations diverses", "Miscellaneous Operations", "Operaciones diversas"),

    # Tiers
    "Clients": ("thirdParty.customers", "Clients", "Customers", "Clientes"),
    "Fournisseurs": ("thirdParty.suppliers", "Fournisseurs", "Suppliers", "Proveedores"),
    "Liste des clients": ("thirdParty.customersList", "Liste des clients", "Customer List", "Lista de clientes"),
    "Liste des fournisseurs": ("thirdParty.suppliersList", "Liste des fournisseurs", "Supplier List", "Lista de proveedores"),
    "Balance âgée": ("thirdParty.agedBalance", "Balance âgée", "Aged Balance", "Balance por antigüedad"),
    "Échéancier": ("thirdParty.schedule", "Échéancier", "Payment Schedule", "Calendario de pagos"),
    "Recouvrement": ("thirdParty.collection", "Recouvrement", "Collection", "Cobro"),
    "Lettrage": ("thirdParty.matching", "Lettrage", "Matching", "Conciliación"),

    # Trésorerie
    "Trésorerie": ("treasury.title", "Trésorerie", "Treasury", "Tesorería"),
    "Position de trésorerie": ("treasury.position", "Position de trésorerie", "Cash Position", "Posición de tesorería"),
    "Flux de trésorerie": ("treasury.cashFlow", "Flux de trésorerie", "Cash Flow", "Flujo de caja"),
    "Prévisions de trésorerie": ("treasury.forecast", "Prévisions de trésorerie", "Cash Forecast", "Previsión de tesorería"),
    "Rapprochement bancaire": ("treasury.bankReconciliation", "Rapprochement bancaire", "Bank Reconciliation", "Conciliación bancaria"),
    "Gestion des paiements": ("treasury.paymentManagement", "Gestion des paiements", "Payment Management", "Gestión de pagos"),
    "Encaissements": ("treasury.collections", "Encaissements", "Collections", "Cobros"),
    "Décaissements": ("treasury.disbursements", "Décaissements", "Disbursements", "Pagos"),
    "Emprunts": ("treasury.loans", "Emprunts", "Loans", "Préstamos"),
    "Appels de fonds": ("treasury.fundCalls", "Appels de fonds", "Fund Calls", "Llamadas de fondos"),

    # Immobilisations
    "Immobilisations": ("assets.title", "Immobilisations", "Fixed Assets", "Activos fijos"),
    "Gestion des immobilisations": ("assets.management", "Gestion des immobilisations", "Asset Management", "Gestión de activos"),
    "Amortissements": ("assets.depreciation", "Amortissements", "Depreciation", "Depreciación"),
    "Inventaire": ("assets.inventory", "Inventaire", "Inventory", "Inventario"),
    "Cessions": ("assets.disposals", "Cessions", "Disposals", "Cesiones"),
    "Acquisitions": ("assets.acquisitions", "Acquisitions", "Acquisitions", "Adquisiciones"),

    # Clôtures
    "Clôtures": ("closures.title", "Clôtures", "Closures", "Cierres"),
    "Procédures de clôture": ("closures.procedures", "Procédures de clôture", "Closing Procedures", "Procedimientos de cierre"),
    "Clôture mensuelle": ("closures.monthly", "Clôture mensuelle", "Monthly Closing", "Cierre mensual"),
    "Clôture annuelle": ("closures.annual", "Clôture annuelle", "Annual Closing", "Cierre anual"),
    "Report à nouveau": ("closures.carryForward", "Report à nouveau", "Carry Forward", "Arrastre de saldos"),
    "Notes annexes": ("closures.notes", "Notes annexes", "Annex Notes", "Notas anexas"),

    # Budget
    "Budget": ("budget.title", "Budget", "Budget", "Presupuesto"),
    "Élaboration budgétaire": ("budget.preparation", "Élaboration budgétaire", "Budget Preparation", "Preparación presupuestaria"),
    "Suivi budgétaire": ("budget.monitoring", "Suivi budgétaire", "Budget Monitoring", "Seguimiento presupuestario"),
    "Analyse des écarts": ("budget.varianceAnalysis", "Analyse des écarts", "Variance Analysis", "Análisis de desviaciones"),
    "Contrôle budgétaire": ("budget.control", "Contrôle budgétaire", "Budget Control", "Control presupuestario"),

    # Analyse financière
    "Analyse financière": ("analysis.financial", "Analyse financière", "Financial Analysis", "Análisis financiero"),
    "Ratios financiers": ("analysis.ratios", "Ratios financiers", "Financial Ratios", "Ratios financieros"),
    "TAFIRE": ("analysis.tafire", "TAFIRE", "TAFIRE", "TAFIRE"),
    "SIG": ("analysis.sig", "SIG", "Management Indicators", "Indicadores de gestión"),
    "Bilan fonctionnel": ("analysis.functionalBalance", "Bilan fonctionnel", "Functional Balance Sheet", "Balance funcional"),

    # Rapports
    "Rapports": ("reports.title", "Rapports", "Reports", "Informes"),
    "Rapports personnalisés": ("reports.custom", "Rapports personnalisés", "Custom Reports", "Informes personalizados"),
    "Export FEC": ("reports.fecExport", "Export FEC", "FEC Export", "Exportación FEC"),
    "Tableaux de bord": ("reports.dashboards", "Tableaux de bord", "Dashboards", "Paneles de control"),

    # Paramètres
    "Paramètres": ("settings.title", "Paramètres", "Settings", "Configuración"),
    "Configuration": ("settings.configuration", "Configuration", "Configuration", "Configuración"),
    "Paramètres généraux": ("settings.general", "Paramètres généraux", "General Settings", "Configuración general"),
    "Sécurité": ("settings.security", "Sécurité", "Security", "Seguridad"),
    "Import/Export": ("settings.importExport", "Import/Export", "Import/Export", "Importar/Exportar"),
    "Multi-sociétés": ("settings.multiCompany", "Multi-sociétés", "Multi-Company", "Multi-empresa"),
    "TVA et taxes": ("settings.vatTaxes", "TVA et taxes", "VAT and Taxes", "IVA e impuestos"),
    "Axes analytiques": ("settings.analyticalAxes", "Axes analytiques", "Analytical Axes", "Ejes analíticos"),

    # Actions communes
    "Nouveau": ("actions.new", "Nouveau", "New", "Nuevo"),
    "Créer": ("actions.create", "Créer", "Create", "Crear"),
    "Ajouter": ("actions.add", "Ajouter", "Add", "Añadir"),
    "Modifier": ("actions.edit", "Modifier", "Edit", "Editar"),
    "Supprimer": ("actions.delete", "Supprimer", "Delete", "Eliminar"),
    "Enregistrer": ("actions.save", "Enregistrer", "Save", "Guardar"),
    "Annuler": ("actions.cancel", "Annuler", "Cancel", "Cancelar"),
    "Valider": ("actions.validate", "Valider", "Validate", "Validar"),
    "Imprimer": ("actions.print", "Imprimer", "Print", "Imprimir"),
    "Exporter": ("actions.export", "Exporter", "Export", "Exportar"),
    "Importer": ("actions.import", "Importer", "Import", "Importar"),
    "Rechercher": ("actions.search", "Rechercher", "Search", "Buscar"),
    "Filtrer": ("actions.filter", "Filtrer", "Filter", "Filtrar"),
    "Actualiser": ("actions.refresh", "Actualiser", "Refresh", "Actualizar"),
    "Télécharger": ("actions.download", "Télécharger", "Download", "Descargar"),

    # Messages et statuts
    "En cours": ("status.inProgress", "En cours", "In Progress", "En curso"),
    "Terminé": ("status.completed", "Terminé", "Completed", "Completado"),
    "En attente": ("status.pending", "En attente", "Pending", "Pendiente"),
    "Brouillon": ("status.draft", "Brouillon", "Draft", "Borrador"),
    "Validé": ("status.validated", "Validé", "Validated", "Validado"),
    "Rejeté": ("status.rejected", "Rejeté", "Rejected", "Rechazado"),
    "Approuvé": ("status.approved", "Approuvé", "Approved", "Aprobado"),
}

def add_use_language_import(content):
    """Ajoute l'import useLanguage si nécessaire"""
    if "useLanguage" not in content:
        # Chercher les imports React
        import_pattern = r"(import.*?from ['\"]react['\"];?\n)"
        match = re.search(import_pattern, content)
        if match:
            # Ajouter après l'import React
            insert_pos = match.end()
            import_line = "import { useLanguage } from '../../contexts/LanguageContext';\n"

            # Ajuster le chemin selon la profondeur du fichier
            if "/pages/accounting/" in content or "/pages/treasury/" in content or "/pages/assets/" in content:
                import_line = "import { useLanguage } from '../../contexts/LanguageContext';\n"
            elif "/components/accounting/" in content or "/components/layout/" in content:
                import_line = "import { useLanguage } from '../../contexts/LanguageContext';\n"
            elif "/pages/" in content:
                import_line = "import { useLanguage } from '../contexts/LanguageContext';\n"

            content = content[:insert_pos] + import_line + content[insert_pos:]
    return content

def add_use_language_hook(content):
    """Ajoute le hook useLanguage dans le composant"""
    if "const { t } = useLanguage()" not in content:
        # Chercher le début du composant fonctionnel
        patterns = [
            r"(const \w+:?\s*(?:React\.)?FC.*?=.*?\{)\n",
            r"(function \w+\s*\([^)]*\)\s*\{)\n",
            r"(export default function \w+\s*\([^)]*\)\s*\{)\n"
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                insert_pos = match.end()
                hook_line = "  const { t } = useLanguage();\n"
                content = content[:insert_pos] + hook_line + content[insert_pos:]
                break
    return content

def process_file(file_path, translations_added):
    """Traite un fichier pour appliquer les traductions"""
    if not file_path.exists():
        print(f"  Fichier non trouvé: {file_path}")
        return translations_added

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    modified = False

    # Ajouter les imports et hooks si nécessaire
    if any(text in content for text, _ in TRANSLATIONS.items()):
        content = add_use_language_import(content)
        content = add_use_language_hook(content)

        # Remplacer les textes
        for french_text, (key, _, _, _) in TRANSLATIONS.items():
            # Pattern pour les textes dans JSX
            patterns = [
                # Texte dans des balises: >Texte<
                (f">{re.escape(french_text)}<", f">{{t('{key}')}}<"),
                # Texte dans des attributs title ou placeholder
                (f'title="{re.escape(french_text)}"', f"title={{t('{key}')}}"),
                (f"title='{re.escape(french_text)}'", f"title={{t('{key}')}}"),
                (f'placeholder="{re.escape(french_text)}"', f"placeholder={{t('{key}')}}"),
                (f"placeholder='{re.escape(french_text)}'", f"placeholder={{t('{key}')}}"),
                # Labels dans des objets
                (f'label: "{re.escape(french_text)}"', f"label: t('{key}')"),
                (f"label: '{re.escape(french_text)}'", f"label: t('{key}')"),
                (f'title: "{re.escape(french_text)}"', f"title: t('{key}')"),
                (f"title: '{re.escape(french_text)}'", f"title: t('{key}')"),
                # Texte simple entre quotes
                (f'"{french_text}"', f"t('{key}')"),
                (f"'{french_text}'", f"t('{key}')")
            ]

            for pattern, replacement in patterns:
                if pattern in content:
                    content = content.replace(pattern, replacement)
                    modified = True
                    if key not in translations_added:
                        translations_added.add(key)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  [OK] Modifie: {file_path.name}")

    return translations_added

def update_locale_files(translations_added):
    """Met à jour les fichiers de traduction"""
    locales = {
        'fr': LOCALES_DIR / 'fr.json',
        'en': LOCALES_DIR / 'en.json',
        'es': LOCALES_DIR / 'es.json'
    }

    for lang, file_path in locales.items():
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            data = {}

        # Ajouter les nouvelles traductions
        for key_full in translations_added:
            for french_text, (key, fr, en, es) in TRANSLATIONS.items():
                if key == key_full:
                    keys = key.split('.')
                    current = data

                    # Naviguer dans la structure
                    for k in keys[:-1]:
                        if k not in current:
                            current[k] = {}
                        current = current[k]

                    # Ajouter la traduction
                    final_key = keys[-1]
                    if final_key not in current:
                        if lang == 'fr':
                            current[final_key] = fr
                        elif lang == 'en':
                            current[final_key] = en
                        elif lang == 'es':
                            current[final_key] = es

        # Sauvegarder
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[OK] Mise a jour: {file_path.name}")

def main():
    print("Application des traductions à tout le projet...")
    print("=" * 60)

    translations_added = set()
    files_processed = 0

    for file_path in files_to_translate:
        if file_path.exists():
            print(f"\nTraitement de {file_path.name}...")
            translations_added = process_file(file_path, translations_added)
            files_processed += 1

    print(f"\n{'=' * 60}")
    print(f"Fichiers traités: {files_processed}")
    print(f"Traductions ajoutées: {len(translations_added)}")

    if translations_added:
        print("\nMise à jour des fichiers de locale...")
        update_locale_files(translations_added)

    print("\n[TERMINE] Script complete!")

if __name__ == "__main__":
    main()