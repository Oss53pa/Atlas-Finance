import os
import re
import json

def load_translations():
    """Charger les traductions françaises existantes"""
    with open(r"C:\devs\WiseBook\frontend\src\locales\fr.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def get_translation_mappings():
    """Dictionnaire des textes hardcodés vers les clés de traduction"""
    return {
        # Navigation
        'Tableau de bord': 'navigation.dashboard',
        'Dashboard': 'navigation.dashboard',
        'Comptabilité': 'navigation.accounting',
        'Accounting': 'navigation.accounting',
        'Trésorerie': 'navigation.treasury',
        'Treasury': 'navigation.treasury',
        'Clients': 'navigation.clients',
        'Customers': 'navigation.clients',
        'Fournisseurs': 'navigation.suppliers',
        'Suppliers': 'navigation.suppliers',
        'Budget': 'navigation.budget',
        'Immobilisations': 'navigation.assets',
        'Assets': 'navigation.assets',
        'Rapports': 'navigation.reports',
        'Reports': 'navigation.reports',
        'Paramètres': 'navigation.settings',
        'Settings': 'navigation.settings',
        'Profil': 'navigation.profile',
        'Profile': 'navigation.profile',

        # Accounting
        'Écritures': 'navigation.entries',
        'Entries': 'navigation.entries',
        'Journaux': 'navigation.journals',
        'Journals': 'navigation.journals',
        'Balance': 'accounting.balance',
        'Grand Livre': 'accounting.generalLedger',
        'General Ledger': 'accounting.generalLedger',
        'Plan comptable': 'accounting.chartOfAccounts',
        'Chart of Accounts': 'accounting.chartOfAccounts',
        'Bilan': 'accounting.balanceSheet',
        'Balance Sheet': 'accounting.balanceSheet',
        'États financiers': 'accounting.financialStatements',
        'Financial Statements': 'accounting.financialStatements',
        'Clôture': 'closures.title',
        'Closures': 'closures.title',
        'Lettrage': 'thirdParty.matching',
        'Matching': 'thirdParty.matching',

        # Actions communes
        'Enregistrer': 'common.save',
        'Save': 'common.save',
        'Annuler': 'common.cancel',
        'Cancel': 'common.cancel',
        'Supprimer': 'common.delete',
        'Delete': 'common.delete',
        'Modifier': 'common.edit',
        'Edit': 'common.edit',
        'Ajouter': 'common.add',
        'Add': 'common.add',
        'Fermer': 'common.close',
        'Close': 'common.close',
        'Confirmer': 'common.confirm',
        'Confirm': 'common.confirm',
        'Rechercher': 'common.search',
        'Search': 'common.search',
        'Filtrer': 'common.filter',
        'Filter': 'common.filter',
        'Exporter': 'common.export',
        'Export': 'common.export',
        'Imprimer': 'common.print',
        'Print': 'common.print',
        'Actualiser': 'common.refresh',
        'Refresh': 'common.refresh',
        'Retour': 'common.back',
        'Back': 'common.back',
        'Suivant': 'common.next',
        'Next': 'common.next',
        'Précédent': 'common.previous',
        'Previous': 'common.previous',

        # Messages
        'Chargement...': 'common.loading',
        'Loading...': 'common.loading',
        'Erreur': 'common.error',
        'Error': 'common.error',
        'Succès': 'common.success',
        'Success': 'common.success',

        # Factures et documents
        'Facture': 'invoice.title',
        'Invoice': 'invoice.title',
        'Devis': 'quote.title',
        'Quote': 'quote.title',
        'Bon de commande': 'order.purchaseOrder',
        'Purchase Order': 'order.purchaseOrder',

        # Statuts
        'Brouillon': 'status.draft',
        'Draft': 'status.draft',
        'En attente': 'status.pending',
        'Pending': 'status.pending',
        'Validé': 'accounting.validated',
        'Validated': 'accounting.validated',
    }

def check_if_uses_uselanguage(content):
    """Vérifier si le fichier utilise déjà useLanguage"""
    return "useLanguage" in content

def add_uselanguage_import(content):
    """Ajouter l'import useLanguage si nécessaire"""
    if "useLanguage" in content:
        return content

    # Trouver le dernier import React ou similaire
    import_pattern = r"(import[^;]+from\s+['\"]react['\"][^;]*;?\s*\n)"
    match = re.search(import_pattern, content, re.IGNORECASE)

    if match:
        # Ajouter après l'import React
        insert_pos = match.end()
        import_line = "import { useLanguage } from '../../contexts/LanguageContext';\n"

        # Ajuster le chemin selon la profondeur du fichier
        if '/pages/' in content or '/components/' in content:
            import_line = "import { useLanguage } from '../../contexts/LanguageContext';\n"
        elif '/lib/' in content or '/utils/' in content:
            import_line = "import { useLanguage } from '../contexts/LanguageContext';\n"

        content = content[:insert_pos] + import_line + content[insert_pos:]

    return content

def add_uselanguage_hook(content):
    """Ajouter le hook useLanguage dans les composants React"""
    # Chercher les composants React (function ou const)
    patterns = [
        r"(export\s+(?:default\s+)?function\s+\w+[^{]*\{)",
        r"(export\s+(?:default\s+)?const\s+\w+:\s*React\.FC[^{]*\{)",
        r"(const\s+\w+:\s*React\.FC[^{]*\{)",
        r"(function\s+\w+\s*\([^)]*\)\s*\{)"
    ]

    for pattern in patterns:
        match = re.search(pattern, content)
        if match and "const { t } = useLanguage()" not in content:
            component_start = match.end()
            # Ajouter le hook après l'accolade ouvrante
            next_line = content[component_start:].find('\n')
            if next_line != -1:
                insert_pos = component_start + next_line + 1
                hook_line = "  const { t } = useLanguage();\n"
                content = content[:insert_pos] + hook_line + content[insert_pos:]
                break

    return content

def replace_hardcoded_strings(content, mappings):
    """Remplacer les textes hardcodés par les appels t()"""
    for hardcoded, translation_key in mappings.items():
        # Différents patterns de remplacement
        patterns = [
            # Dans le JSX entre balises
            (f">{hardcoded}<", f">{{t('{translation_key}')}}<"),
            # Dans les props string
            (f'"{hardcoded}"', f"{{t('{translation_key}')}}"),
            (f"'{hardcoded}'", f"{{t('{translation_key}')}}"),
            # Dans les objets
            (f'title: "{hardcoded}"', f"title: t('{translation_key}')"),
            (f"title: '{hardcoded}'", f"title: t('{translation_key}')"),
            (f'label: "{hardcoded}"', f"label: t('{translation_key}')"),
            (f"label: '{hardcoded}'", f"label: t('{translation_key}')"),
            (f'name: "{hardcoded}"', f"name: t('{translation_key}')"),
            (f"name: '{hardcoded}'", f"name: t('{translation_key}')"),
            (f'text: "{hardcoded}"', f"text: t('{translation_key}')"),
            (f"text: '{hardcoded}'", f"text: t('{translation_key}')"),
            # Dans les placeholders
            (f'placeholder="{hardcoded}"', f"placeholder={{t('{translation_key}')}}"),
            (f"placeholder='{hardcoded}'", f"placeholder={{t('{translation_key}')}}"),
        ]

        for pattern, replacement in patterns:
            if pattern in content:
                content = content.replace(pattern, replacement)

    return content

def process_file(file_path):
    """Traiter un fichier pour appliquer les traductions"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Ignorer les fichiers de test et de configuration
        if '.test.' in file_path or '.spec.' in file_path or '.config.' in file_path:
            return False

        original_content = content
        mappings = get_translation_mappings()

        # Vérifier s'il y a des textes hardcodés
        has_hardcoded = any(text in content for text in mappings.keys())

        if has_hardcoded and 'React' in content:
            print(f"  Traitement de {os.path.basename(file_path)}...")

            # 1. Ajouter l'import useLanguage
            content = add_uselanguage_import(content)

            # 2. Ajouter le hook dans le composant
            content = add_uselanguage_hook(content)

            # 3. Remplacer les textes hardcodés
            content = replace_hardcoded_strings(content, mappings)

            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True

        return False
    except Exception as e:
        print(f"  Erreur lors du traitement de {file_path}: {e}")
        return False

def add_missing_translations():
    """Ajouter les clés manquantes dans fr.json"""
    translations_to_add = {
        "invoice": {
            "title": "Facture"
        },
        "quote": {
            "title": "Devis"
        },
        "order": {
            "purchaseOrder": "Bon de commande"
        }
    }

    # Charger le fichier existant
    json_path = r"C:\devs\WiseBook\frontend\src\locales\fr.json"
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Ajouter les nouvelles traductions
    for key, value in translations_to_add.items():
        if key not in data:
            data[key] = value

    # Sauvegarder
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Traductions ajoutées dans fr.json")

def main():
    """Traiter tous les fichiers TypeScript/React"""
    # Liste des fichiers prioritaires
    files_to_process = [
        r"C:\devs\WiseBook\frontend\src\components\accounting\AdvancedBalance.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\AdvancedGeneralLedger.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\Balance.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\GrandLivre.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\IntelligentEntryForm.tsx",
        r"C:\devs\WiseBook\frontend\src\components\accounting\Lettrage.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\CustomerDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\ExecutiveDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\dashboards\SupplierDashboard.tsx",
        r"C:\devs\WiseBook\frontend\src\components\financial\AdvancedFinancialStatements.tsx",
    ]

    print("=" * 60)
    print("APPLICATION DES TRADUCTIONS AUX COMPOSANTS REACT")
    print("=" * 60)

    # Ajouter les traductions manquantes
    add_missing_translations()

    processed_count = 0

    # Traiter chaque fichier
    for file_path in files_to_process:
        if os.path.exists(file_path):
            if process_file(file_path):
                print(f"  OK: {os.path.basename(file_path)}")
                processed_count += 1
        else:
            print(f"  SKIP: {os.path.basename(file_path)}")

    print("=" * 60)
    print(f"Termine! {processed_count} fichiers traites avec succes")

if __name__ == "__main__":
    main()