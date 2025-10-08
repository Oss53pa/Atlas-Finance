import os
import re
import json

def load_translations():
    """Charger les traductions françaises existantes"""
    with open(r"C:\devs\WiseBook\frontend\src\locales\fr.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def find_hardcoded_strings(file_path):
    """Trouver les chaînes hardcodées dans un fichier"""
    hardcoded_patterns = {
        'Dashboard': 'navigation.dashboard',
        'Tableau de bord': 'navigation.dashboard',
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
        'Déconnexion': 'navigation.logout',
        'Logout': 'navigation.logout',
        'Profil': 'navigation.profile',
        'Profile': 'navigation.profile',
        'Aide': 'navigation.help',
        'Help': 'navigation.help',
        'Notifications': 'navigation.notifications',
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
        'Chargement...': 'common.loading',
        'Loading...': 'common.loading',
    }

    return hardcoded_patterns

def add_use_language_import(content):
    """Ajouter l'import useLanguage si nécessaire"""
    if "useLanguage" not in content and "from 'react'" in content:
        # Trouver le dernier import
        import_pattern = r"(import[^;]+from\s+['\"][^'\"]+['\"];?\s*\n)+"
        matches = list(re.finditer(import_pattern, content))
        if matches:
            last_import_end = matches[-1].end()
            # Ajouter l'import après les autres imports
            new_import = "import { useLanguage } from '../../contexts/LanguageContext';\n"
            content = content[:last_import_end] + new_import + content[last_import_end:]
    return content

def add_use_language_hook(content):
    """Ajouter le hook useLanguage dans le composant"""
    # Chercher le début du composant
    component_pattern = r"(export\s+(?:default\s+)?(?:const|function)\s+\w+[^{]*\{)"
    match = re.search(component_pattern, content)

    if match and "const { t } = useLanguage()" not in content:
        # Trouver où ajouter le hook
        component_start = match.end()
        # Chercher la première ligne après l'accolade ouvrante
        next_line_match = re.search(r'\n\s*', content[component_start:])
        if next_line_match:
            insert_pos = component_start + next_line_match.end()
            indent = "  "  # Indentation standard
            hook_line = f"{indent}const {{ t }} = useLanguage();\n"
            content = content[:insert_pos] + hook_line + content[insert_pos:]

    return content

def replace_hardcoded_strings(content, patterns):
    """Remplacer les chaînes hardcodées par les appels de traduction"""
    for hardcoded, translation_key in patterns.items():
        # Patterns pour différents cas
        patterns_to_replace = [
            # Cas 1: Dans les props ou JSX
            (f"'{hardcoded}'", f"t('{translation_key}')"),
            (f'"{hardcoded}"', f"t('{translation_key}')"),
            # Cas 2: Dans les objets
            (f"name: '{hardcoded}'", f"name: t('{translation_key}')"),
            (f'name: "{hardcoded}"', f"name: t('{translation_key}')"),
            # Cas 3: Dans les titres
            (f"title: '{hardcoded}'", f"title: t('{translation_key}')"),
            (f'title: "{hardcoded}"', f"title: t('{translation_key}')"),
            # Cas 4: Dans le JSX direct
            (f">{hardcoded}<", f">{{t('{translation_key}')}}<"),
        ]

        for pattern, replacement in patterns_to_replace:
            content = content.replace(pattern, replacement)

    return content

def process_file(file_path):
    """Traiter un fichier pour appliquer les traductions"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        patterns = find_hardcoded_strings(file_path)

        # Vérifier s'il y a des chaînes hardcodées
        has_hardcoded = any(pattern in content for pattern in patterns.keys())

        if has_hardcoded:
            # Ajouter l'import si nécessaire
            content = add_use_language_import(content)

            # Ajouter le hook dans le composant
            content = add_use_language_hook(content)

            # Remplacer les chaînes hardcodées
            content = replace_hardcoded_strings(content, patterns)

            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True

        return False
    except Exception as e:
        print(f"Erreur lors du traitement de {file_path}: {e}")
        return False

def main():
    """Traiter tous les fichiers TSX dans le projet"""
    frontend_dir = r"C:\devs\WiseBook\frontend\src"
    processed_count = 0

    # Composants prioritaires à traiter
    priority_files = [
        r"C:\devs\WiseBook\frontend\src\components\layout\Sidebar.tsx",
        r"C:\devs\WiseBook\frontend\src\components\layout\DoubleSidebarLayout.tsx",
        r"C:\devs\WiseBook\frontend\src\pages\assets\AssetMasterDataModalContent.tsx",
        r"C:\devs\WiseBook\frontend\src\pages\assets\AssetsListComplete.tsx",
        r"C:\devs\WiseBook\frontend\src\pages\assets\AssetsRegistry.tsx",
        r"C:\devs\WiseBook\frontend\src\pages\reporting\CustomReportsPage.tsx",
        r"C:\devs\WiseBook\frontend\src\pages\tiers\RecouvrementModule.tsx",
    ]

    print("Application des traductions aux composants React...")
    print("-" * 50)

    # Traiter les fichiers prioritaires
    for file_path in priority_files:
        if os.path.exists(file_path):
            if process_file(file_path):
                print(f"✅ Traité: {os.path.basename(file_path)}")
                processed_count += 1
            else:
                print(f"⏭️ Pas de changement: {os.path.basename(file_path)}")
        else:
            print(f"❌ Fichier non trouvé: {os.path.basename(file_path)}")

    print(f"\n{processed_count} fichiers traités avec succès")

if __name__ == "__main__":
    main()