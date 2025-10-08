#!/usr/bin/env python3
"""
Script complet pour appliquer toutes les traductions dans le projet WiseBook
"""

import re
import json
from pathlib import Path

FRONTEND_DIR = Path("frontend/src")
LOCALES_DIR = FRONTEND_DIR / "locales"

# Dictionnaire complet de toutes les traductions nécessaires
COMPLETE_TRANSLATIONS = {
    # Navigation principale
    "Tableau de bord": "dashboard.title",
    "Dashboard": "dashboard.title",
    "Comptabilité": "accounting.title",
    "Comptabilité Générale": "accounting.title",
    "Trésorerie": "navigation.treasury",
    "Immobilisations": "navigation.assets",
    "Paramètres": "navigation.settings",
    "Journaux": "navigation.journals",
    "Clients": "navigation.clients",
    "Fournisseurs": "navigation.suppliers",
    "Budget": "navigation.budget",

    # Actions communes
    "Enregistrer": "actions.save",
    "Annuler": "common.cancel",
    "Supprimer": "common.delete",
    "Modifier": "common.edit",
    "Ajouter": "common.add",
    "Fermer": "common.close",
    "Nouveau": "actions.new",
    "Créer": "actions.create",
    "Valider": "actions.validate",
    "Imprimer": "common.print",
    "Exporter": "common.export",
    "Rechercher": "common.search",
    "Filtrer": "common.filter",
    "Actualiser": "common.refresh",
    "Télécharger": "actions.download",

    # États et messages
    "Brouillon": "accounting.draft",
    "Validé": "accounting.validated",
    "En cours": "status.inProgress",
    "Terminé": "status.completed",
    "En attente": "status.pending",
    "Succès": "common.success",
    "Erreur": "common.error",
    "Chargement": "status.loading",
    "Chargement...": "common.loading",

    # Comptabilité
    "Journal": "accounting.journal",
    "Compte": "accounting.account",
    "Débit": "accounting.debit",
    "Crédit": "accounting.credit",
    "Balance": "accounting.balance",
    "Libellé": "accounting.label",
    "Solde": "accounting.balance",
    "Écriture": "accounting.entry",
    "Pièce": "accounting.piece",

    # Tiers
    "Lettrage": "thirdParty.reconciliation",
    "Recouvrement": "thirdParty.collection",
    "Échéances": "thirdParty.dueDate",

    # Dates
    "Date": "common.date",
    "Aujourd'hui": "common.today",
    "Hier": "common.yesterday",
    "Demain": "common.tomorrow",
}

def find_files_to_translate():
    """Trouve tous les fichiers TypeScript/React du projet"""
    files = []
    for pattern in ["*.tsx", "*.ts"]:
        for file_path in FRONTEND_DIR.rglob(pattern):
            # Ignorer node_modules et fichiers de test
            if "node_modules" not in str(file_path) and ".test." not in str(file_path):
                files.append(file_path)
    return files

def add_use_language_import(content, file_path):
    """Ajoute l'import useLanguage si nécessaire"""
    if "useLanguage" in content:
        return content

    # Calculer le chemin relatif
    relative_path = file_path.relative_to(FRONTEND_DIR)
    depth = len(relative_path.parts) - 1
    import_path = "../" * depth + "contexts/LanguageContext"

    # Ajouter l'import après React
    import_pattern = r"(import.*?from ['\"]react['\"];?\n)"
    match = re.search(import_pattern, content)
    if match:
        insert_pos = match.end()
        import_line = f"import {{ useLanguage }} from '{import_path}';\n"
        content = content[:insert_pos] + import_line + content[insert_pos:]

    return content

def add_use_language_hook(content):
    """Ajoute le hook useLanguage dans le composant"""
    if "const { t } = useLanguage()" in content:
        return content

    # Patterns pour trouver le début du composant
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

def apply_translations_to_file(file_path):
    """Applique les traductions à un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        modified = False

        # Vérifier si le fichier contient des textes à traduire
        needs_translation = False
        for french_text in COMPLETE_TRANSLATIONS.keys():
            if french_text in content:
                needs_translation = True
                break

        if not needs_translation:
            return False

        # Ajouter les imports et hooks si nécessaire
        content = add_use_language_import(content, file_path)
        content = add_use_language_hook(content)

        # Appliquer les traductions
        for french_text, translation_key in COMPLETE_TRANSLATIONS.items():
            # Patterns de remplacement pour différents contextes
            patterns = [
                # Texte dans JSX
                (f">{french_text}<", f">{{t('{translation_key}')}}<"),
                # Attributs title
                (f'title="{french_text}"', f"title={{t('{translation_key}')}}"),
                (f"title='{french_text}'", f"title={{t('{translation_key}')}}"),
                # Attributs placeholder
                (f'placeholder="{french_text}"', f"placeholder={{t('{translation_key}')}}"),
                (f"placeholder='{french_text}'", f"placeholder={{t('{translation_key}')}}"),
                # Labels dans les objets (sans accolades)
                (f'label: "{french_text}"', f"label: t('{translation_key}')"),
                (f"label: '{french_text}'", f"label: t('{translation_key}')"),
                # Titles dans les objets
                (f'title: "{french_text}"', f"title: t('{translation_key}')"),
                (f"title: '{french_text}'", f"title: t('{translation_key}')"),
            ]

            for pattern, replacement in patterns:
                if pattern in content:
                    content = content.replace(pattern, replacement)
                    modified = True

        if modified and content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True

        return False

    except Exception as e:
        print(f"  [ERREUR] {file_path.name}: {e}")
        return False

def main():
    print("Application complète des traductions dans tout le projet...")
    print("=" * 60)

    # Trouver tous les fichiers
    files = find_files_to_translate()
    print(f"Fichiers trouvés: {len(files)}")
    print()

    files_modified = 0
    errors = 0

    # Traiter chaque fichier
    for file_path in files:
        try:
            if apply_translations_to_file(file_path):
                print(f"  [OK] {file_path.relative_to(FRONTEND_DIR)}")
                files_modified += 1
        except Exception as e:
            print(f"  [ERREUR] {file_path.name}: {e}")
            errors += 1

    print("\n" + "=" * 60)
    print(f"Résumé:")
    print(f"  Fichiers modifiés: {files_modified}")
    print(f"  Erreurs: {errors}")
    print(f"  Total fichiers traités: {len(files)}")
    print("\n[TERMINE] Application complète des traductions !")

if __name__ == "__main__":
    main()