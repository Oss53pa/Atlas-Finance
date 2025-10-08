#!/usr/bin/env python3
"""
Script pour appliquer automatiquement les traductions dans tout le projet WiseBook
"""

import os
import re
import json
from pathlib import Path

# Chemins
FRONTEND_DIR = Path("frontend/src")
LOCALES_DIR = FRONTEND_DIR / "locales"

# Fichiers de traduction
FR_FILE = LOCALES_DIR / "fr.json"
EN_FILE = LOCALES_DIR / "en.json"
ES_FILE = LOCALES_DIR / "es.json"

# Patterns de traduction courants
TRANSLATIONS = {
    # Navigation
    "Dashboard": ("navigation.dashboard", "Tableau de bord", "Dashboard", "Panel de Control"),
    "Comptabilité": ("navigation.accounting", "Comptabilité", "Accounting", "Contabilidad"),
    "Journaux": ("navigation.journals", "Journaux", "Journals", "Diarios"),
    "Écritures": ("navigation.entries", "Écritures", "Entries", "Asientos"),
    "Comptes": ("navigation.accounts", "Comptes", "Accounts", "Cuentas"),
    "Rapports": ("navigation.reports", "Rapports", "Reports", "Informes"),
    "Paramètres": ("navigation.settings", "Paramètres", "Settings", "Configuración"),
    "Trésorerie": ("navigation.treasury", "Trésorerie", "Treasury", "Tesorería"),
    "Clients": ("navigation.clients", "Clients", "Clients", "Clientes"),
    "Fournisseurs": ("navigation.suppliers", "Fournisseurs", "Suppliers", "Proveedores"),
    "Budget": ("navigation.budget", "Budget", "Budget", "Presupuesto"),
    "Immobilisations": ("navigation.assets", "Immobilisations", "Fixed Assets", "Activos Fijos"),

    # Actions communes
    "Enregistrer": ("common.save", "Enregistrer", "Save", "Guardar"),
    "Annuler": ("common.cancel", "Annuler", "Cancel", "Cancelar"),
    "Modifier": ("common.edit", "Modifier", "Edit", "Editar"),
    "Supprimer": ("common.delete", "Supprimer", "Delete", "Eliminar"),
    "Ajouter": ("common.add", "Ajouter", "Add", "Añadir"),
    "Rechercher": ("common.search", "Rechercher", "Search", "Buscar"),
    "Filtrer": ("common.filter", "Filtrer", "Filter", "Filtrar"),
    "Exporter": ("common.export", "Exporter", "Export", "Exportar"),
    "Imprimer": ("common.print", "Imprimer", "Print", "Imprimir"),
    "Fermer": ("common.close", "Fermer", "Close", "Cerrar"),
    "Actualiser": ("common.refresh", "Actualiser", "Refresh", "Actualizar"),
    "Confirmer": ("common.confirm", "Confirmer", "Confirm", "Confirmar"),
    "Voir": ("common.view", "Voir", "View", "Ver"),
    "Détails": ("common.details", "Détails", "Details", "Detalles"),
    "Actions": ("common.actions", "Actions", "Actions", "Acciones"),
    "Retour": ("common.back", "Retour", "Back", "Atrás"),
    "Suivant": ("common.next", "Suivant", "Next", "Siguiente"),
    "Précédent": ("common.previous", "Précédent", "Previous", "Anterior"),
    "Total": ("common.total", "Total", "Total", "Total"),
    "Statut": ("common.status", "Statut", "Status", "Estado"),

    # Comptabilité
    "Débit": ("accounting.debit", "Débit", "Debit", "Debe"),
    "Crédit": ("accounting.credit", "Crédit", "Credit", "Haber"),
    "Solde": ("accounting.balance", "Solde", "Balance", "Saldo"),
    "Date": ("common.date", "Date", "Date", "Fecha"),
    "Montant": ("common.amount", "Montant", "Amount", "Importe"),
    "Libellé": ("accounting.label", "Libellé", "Label", "Etiqueta"),
    "Compte": ("accounting.account", "Compte", "Account", "Cuenta"),
    "Journal": ("accounting.journal", "Journal", "Journal", "Diario"),
    "Écriture": ("accounting.entry", "Écriture", "Entry", "Asiento"),
    "Référence": ("accounting.reference", "Référence", "Reference", "Referencia"),
    "Description": ("accounting.description", "Description", "Description", "Descripción"),
    "Pièce": ("accounting.piece", "Pièce", "Document", "Documento"),
    "Brouillard": ("accounting.draft", "Brouillard", "Draft", "Borrador"),
    "Validé": ("accounting.validated", "Validé", "Validated", "Validado"),
    "Équilibré": ("accounting.balanced", "Équilibré", "Balanced", "Equilibrado"),
    "Plan comptable": ("accounting.accountingPlan", "Plan comptable", "Chart of Accounts", "Plan Contable"),
    "Grand livre": ("accounting.generalLedger", "Grand livre", "General Ledger", "Libro Mayor"),

    # Périodes
    "Aujourd'hui": ("common.today", "Aujourd'hui", "Today", "Hoy"),
    "Cette semaine": ("common.thisWeek", "Cette semaine", "This week", "Esta semana"),
    "Ce mois": ("common.thisMonth", "Ce mois", "This month", "Este mes"),
    "Cette année": ("common.thisYear", "Cette année", "This year", "Este año"),
    "Hier": ("common.yesterday", "Hier", "Yesterday", "Ayer"),
    "Demain": ("common.tomorrow", "Demain", "Tomorrow", "Mañana"),

    # Interface
    "Bienvenue": ("common.welcome", "Bienvenue", "Welcome", "Bienvenido"),
    "Chargement": ("common.loading", "Chargement...", "Loading...", "Cargando..."),
    "Erreur": ("common.error", "Erreur", "Error", "Error"),
    "Succès": ("common.success", "Succès", "Success", "Éxito"),
    "Attention": ("common.warning", "Attention", "Warning", "Advertencia"),
    "Information": ("common.info", "Information", "Information", "Información"),
    "Oui": ("common.yes", "Oui", "Yes", "Sí"),
    "Non": ("common.no", "Non", "No", "No"),
    "Devise": ("common.currency", "Devise", "Currency", "Moneda"),

    # Trésorerie
    "Encaissements": ("treasury.receipts", "Encaissements", "Receipts", "Cobros"),
    "Décaissements": ("treasury.payments", "Décaissements", "Payments", "Pagos"),
    "Position de trésorerie": ("treasury.position", "Position de trésorerie", "Cash position", "Posición de tesorería"),
    "Flux de trésorerie": ("treasury.cashFlow", "Flux de trésorerie", "Cash flow", "Flujo de efectivo"),

    # Tiers
    "Recouvrement": ("thirdParty.collection", "Recouvrement", "Collection", "Recaudación"),
    "Échéances": ("thirdParty.dueDate", "Échéances", "Due dates", "Vencimientos"),
    "Lettrage": ("thirdParty.reconciliation", "Lettrage", "Reconciliation", "Conciliación"),
}

def add_translations_to_files():
    """Ajoute les clés de traduction manquantes aux fichiers JSON"""

    # Charger les fichiers existants
    with open(FR_FILE, 'r', encoding='utf-8') as f:
        fr_data = json.load(f)
    with open(EN_FILE, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    with open(ES_FILE, 'r', encoding='utf-8') as f:
        es_data = json.load(f)

    # Ajouter les traductions manquantes
    added_count = 0
    for french_text, (key, fr, en, es) in TRANSLATIONS.items():
        # Diviser la clé en section.key
        parts = key.split('.')
        if len(parts) == 2:
            section, subkey = parts

            # Vérifier et ajouter pour chaque langue
            if section not in fr_data:
                fr_data[section] = {}
            if section not in en_data:
                en_data[section] = {}
            if section not in es_data:
                es_data[section] = {}

            if subkey not in fr_data[section]:
                fr_data[section][subkey] = fr
                added_count += 1
            if subkey not in en_data[section]:
                en_data[section][subkey] = en
                added_count += 1
            if subkey not in es_data[section]:
                es_data[section][subkey] = es
                added_count += 1

    # Sauvegarder les fichiers
    with open(FR_FILE, 'w', encoding='utf-8') as f:
        json.dump(fr_data, f, ensure_ascii=False, indent=2)
    with open(EN_FILE, 'w', encoding='utf-8') as f:
        json.dump(en_data, f, ensure_ascii=False, indent=2)
    with open(ES_FILE, 'w', encoding='utf-8') as f:
        json.dump(es_data, f, ensure_ascii=False, indent=2)

    print(f"OK Ajoute {added_count} traductions aux fichiers JSON")

def apply_translations_to_file(file_path):
    """Applique les traductions à un fichier TypeScript React"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Vérifier si le fichier utilise déjà useLanguage
    if 'useLanguage' not in content:
        # Ajouter l'import si nécessaire
        if "import {" in content and "from 'react'" in content:
            # Trouver la ligne d'import de React
            import_match = re.search(r"import React.*from 'react';", content)
            if import_match:
                insert_pos = import_match.end()
                # Ajouter l'import useLanguage après les imports React
                content = (
                    content[:insert_pos] +
                    "\nimport { useLanguage } from '../../contexts/LanguageContext';" +
                    content[insert_pos:]
                )

                # Ajouter le hook dans le composant
                # Chercher la première définition de composant
                component_match = re.search(r"const \w+: React\.FC.*?=> \{", content)
                if component_match:
                    insert_pos = component_match.end()
                    content = (
                        content[:insert_pos] +
                        "\n  const { t } = useLanguage();" +
                        content[insert_pos:]
                    )

    # Remplacer les textes en dur par les clés de traduction
    modified = False
    for french_text, (key, fr, en, es) in TRANSLATIONS.items():
        # Pattern pour remplacer "Texte" par {t('key')}
        # Dans les JSX
        pattern1 = re.compile(r'(["\'])' + re.escape(french_text) + r'\1')
        if pattern1.search(content):
            content = pattern1.sub(f"{{t('{key}')}}", content)
            modified = True

        # Dans les objets
        pattern2 = re.compile(r"label:\s*['\"]" + re.escape(french_text) + r"['\"]")
        if pattern2.search(content):
            content = pattern2.sub(f"label: t('{key}')", content)
            modified = True

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Fonction principale"""

    print("Application des traductions dans tout le projet WiseBook")
    print("=" * 60)

    # Étape 1: Ajouter les traductions aux fichiers JSON
    print("\nEtape 1: Ajout des cles de traduction...")
    add_translations_to_files()

    # Étape 2: Appliquer les traductions aux fichiers TypeScript
    print("\nEtape 2: Application des traductions aux fichiers...")

    files_to_translate = [
        FRONTEND_DIR / "components/layout/ModernDoubleSidebarLayout.tsx",
        FRONTEND_DIR / "components/accounting/JournalDashboard.tsx",
        FRONTEND_DIR / "components/accounting/IntelligentEntryAssistant.tsx",
        FRONTEND_DIR / "components/accounting/JournalEntryModal.tsx",
        FRONTEND_DIR / "components/layout/ModernSidebar.tsx",
        FRONTEND_DIR / "components/ui/ModernButton.tsx",
        FRONTEND_DIR / "pages/ModernDashboardPage.tsx",
        FRONTEND_DIR / "pages/accounting/EntriesPage.tsx",
        FRONTEND_DIR / "pages/accounting/BalancePage.tsx",
        FRONTEND_DIR / "pages/accounting/JournalsPage.tsx",
        FRONTEND_DIR / "pages/accounting/AdvancedBalancePage.tsx",
        FRONTEND_DIR / "pages/accounting/BalanceSheetPage.tsx",
        FRONTEND_DIR / "pages/accounting/CashFlowPage.tsx",
        FRONTEND_DIR / "pages/accounting/ChartOfAccountsAdvancedPage.tsx",
        FRONTEND_DIR / "pages/accounting/FinancialRatiosPage.tsx",
        FRONTEND_DIR / "pages/accounting/FinancialStatementsPage.tsx",
        FRONTEND_DIR / "pages/accounting/GeneralLedgerPage.tsx",
        FRONTEND_DIR / "pages/accounting/IncomeStatementPage.tsx",
        FRONTEND_DIR / "pages/accounting/ModernAccountingDashboard.tsx",
        FRONTEND_DIR / "pages/accounting/ReportsPage.tsx",
        FRONTEND_DIR / "pages/assets/ModernAssetsManagement.tsx",
        FRONTEND_DIR / "pages/assets/FixedPage.tsx",
        FRONTEND_DIR / "pages/treasury/PositionTresoreriePage.tsx",
        FRONTEND_DIR / "pages/treasury/GestionPaiementsPage.tsx",
        FRONTEND_DIR / "pages/treasury/FundCallsPage.tsx",
        FRONTEND_DIR / "pages/treasury/ConnexionsBancairesPage.tsx",
        FRONTEND_DIR / "pages/third-party/CompleteThirdPartyModuleV2.tsx",
        FRONTEND_DIR / "pages/third-party/RecouvrementPage.tsx",
        FRONTEND_DIR / "pages/config/CompleteConfigModuleV2.tsx",
        FRONTEND_DIR / "pages/reports/ModernReportsAndAnalytics.tsx",
        FRONTEND_DIR / "pages/ModernSettingsPage.tsx",
        FRONTEND_DIR / "pages/settings/TrackChangePage.tsx",
        FRONTEND_DIR / "pages/Login.tsx",
        FRONTEND_DIR / "pages/LandingPage.tsx",
    ]

    translated_count = 0
    for file_path in files_to_translate:
        if file_path.exists():
            if apply_translations_to_file(file_path):
                translated_count += 1
                print(f"  OK Traduit: {file_path.relative_to(FRONTEND_DIR)}")
        else:
            print(f"  WARN Fichier introuvable: {file_path}")

    print(f"\nOK Traduction terminee! {translated_count} fichiers modifies")
    print("\nINFO N'oubliez pas de verifier les fichiers modifies et de tester!")

if __name__ == "__main__":
    main()