#!/usr/bin/env python3
"""
Script pour appliquer le thème du projet dans le module tableau de bord
"""

import os
import re

# Dossiers à traiter
directories = [
    r'C:\devs\WiseBook\frontend\src\pages\dashboard',
    r'C:\devs\WiseBook\frontend\src\pages',  # Pour Dashboard.tsx, DashboardPage.tsx, etc.
    r'C:\devs\WiseBook\frontend\src\components\dashboards'
]

# Mapping des classes Tailwind vers les variables CSS
TAILWIND_TO_CSS_VAR = {
    # Background colors - Blue (Primary)
    'bg-blue-50': 'bg-[var(--color-primary-lightest)]',
    'bg-blue-100': 'bg-[var(--color-primary-lighter)]',
    'bg-blue-200': 'bg-[var(--color-primary-light)]',
    'bg-blue-500': 'bg-[var(--color-primary)]',
    'bg-blue-600': 'bg-[var(--color-primary)]',
    'bg-blue-700': 'bg-[var(--color-primary-dark)]',
    'bg-blue-800': 'bg-[var(--color-primary-darker)]',
    'bg-blue-900': 'bg-[var(--color-primary-darker)]',

    # Text colors - Blue
    'text-blue-50': 'text-[var(--color-primary-lightest)]',
    'text-blue-100': 'text-[var(--color-primary-lighter)]',
    'text-blue-200': 'text-[var(--color-primary-light)]',
    'text-blue-500': 'text-[var(--color-primary)]',
    'text-blue-600': 'text-[var(--color-primary)]',
    'text-blue-700': 'text-[var(--color-primary-dark)]',
    'text-blue-800': 'text-[var(--color-primary-darker)]',
    'text-blue-900': 'text-[var(--color-primary-darker)]',

    # Border colors - Blue
    'border-blue-100': 'border-[var(--color-primary-lighter)]',
    'border-blue-200': 'border-[var(--color-primary-light)]',
    'border-blue-500': 'border-[var(--color-primary)]',
    'border-blue-600': 'border-[var(--color-primary)]',
    'border-blue-700': 'border-[var(--color-primary-dark)]',

    # Background colors - Green (Success)
    'bg-green-50': 'bg-[var(--color-success-lightest)]',
    'bg-green-100': 'bg-[var(--color-success-lighter)]',
    'bg-green-200': 'bg-[var(--color-success-light)]',
    'bg-green-500': 'bg-[var(--color-success)]',
    'bg-green-600': 'bg-[var(--color-success)]',
    'bg-green-700': 'bg-[var(--color-success-dark)]',
    'bg-green-800': 'bg-[var(--color-success-darker)]',

    # Text colors - Green
    'text-green-50': 'text-[var(--color-success-lightest)]',
    'text-green-100': 'text-[var(--color-success-lighter)]',
    'text-green-200': 'text-[var(--color-success-light)]',
    'text-green-500': 'text-[var(--color-success)]',
    'text-green-600': 'text-[var(--color-success)]',
    'text-green-700': 'text-[var(--color-success-dark)]',
    'text-green-800': 'text-[var(--color-success-darker)]',

    # Border colors - Green
    'border-green-200': 'border-[var(--color-success-light)]',
    'border-green-500': 'border-[var(--color-success)]',
    'border-green-600': 'border-[var(--color-success)]',

    # Background colors - Red (Error)
    'bg-red-50': 'bg-[var(--color-error-lightest)]',
    'bg-red-100': 'bg-[var(--color-error-lighter)]',
    'bg-red-200': 'bg-[var(--color-error-light)]',
    'bg-red-500': 'bg-[var(--color-error)]',
    'bg-red-600': 'bg-[var(--color-error)]',
    'bg-red-700': 'bg-[var(--color-error-dark)]',

    # Text colors - Red
    'text-red-50': 'text-[var(--color-error-lightest)]',
    'text-red-100': 'text-[var(--color-error-lighter)]',
    'text-red-200': 'text-[var(--color-error-light)]',
    'text-red-500': 'text-[var(--color-error)]',
    'text-red-600': 'text-[var(--color-error)]',
    'text-red-700': 'text-[var(--color-error-dark)]',
    'text-red-800': 'text-[var(--color-error-darker)]',

    # Border colors - Red
    'border-red-200': 'border-[var(--color-error-light)]',
    'border-red-500': 'border-[var(--color-error)]',
    'border-red-600': 'border-[var(--color-error)]',

    # Background colors - Yellow/Orange (Warning)
    'bg-yellow-50': 'bg-[var(--color-warning-lightest)]',
    'bg-yellow-100': 'bg-[var(--color-warning-lighter)]',
    'bg-yellow-200': 'bg-[var(--color-warning-light)]',
    'bg-yellow-500': 'bg-[var(--color-warning)]',
    'bg-yellow-600': 'bg-[var(--color-warning)]',
    'bg-orange-50': 'bg-[var(--color-warning-lightest)]',
    'bg-orange-100': 'bg-[var(--color-warning-lighter)]',
    'bg-orange-200': 'bg-[var(--color-warning-light)]',
    'bg-orange-500': 'bg-[var(--color-warning)]',
    'bg-orange-600': 'bg-[var(--color-warning)]',

    # Text colors - Yellow/Orange
    'text-yellow-600': 'text-[var(--color-warning)]',
    'text-yellow-700': 'text-[var(--color-warning-dark)]',
    'text-yellow-800': 'text-[var(--color-warning-dark)]',
    'text-orange-600': 'text-[var(--color-warning)]',
    'text-orange-700': 'text-[var(--color-warning-dark)]',
    'text-orange-800': 'text-[var(--color-warning-darker)]',

    # Border colors - Yellow/Orange
    'border-yellow-200': 'border-[var(--color-warning-light)]',
    'border-orange-200': 'border-[var(--color-warning-light)]',

    # Background colors - Purple (Info)
    'bg-purple-50': 'bg-[var(--color-info-lightest)]',
    'bg-purple-100': 'bg-[var(--color-info-lighter)]',
    'bg-purple-200': 'bg-[var(--color-info-light)]',
    'bg-purple-500': 'bg-[var(--color-info)]',
    'bg-purple-600': 'bg-[var(--color-info)]',

    # Text colors - Purple
    'text-purple-600': 'text-[var(--color-info)]',
    'text-purple-700': 'text-[var(--color-info-dark)]',
    'text-purple-800': 'text-[var(--color-info-darker)]',

    # Background colors - Indigo
    'bg-indigo-50': 'bg-[var(--color-info-lightest)]',
    'bg-indigo-100': 'bg-[var(--color-info-lighter)]',
    'bg-indigo-200': 'bg-[var(--color-info-light)]',
    'bg-indigo-500': 'bg-[var(--color-info)]',
    'bg-indigo-600': 'bg-[var(--color-info)]',

    # Text colors - Indigo
    'text-indigo-600': 'text-[var(--color-info)]',
    'text-indigo-700': 'text-[var(--color-info-dark)]',
    'text-indigo-800': 'text-[var(--color-info-darker)]',

    # Background colors - Gray
    'bg-gray-50': 'bg-[var(--color-background-secondary)]',
    'bg-gray-100': 'bg-[var(--color-background-hover)]',
    'bg-gray-200': 'bg-[var(--color-border)]',
    'bg-gray-300': 'bg-[var(--color-border-dark)]',

    # Text colors - Gray
    'text-gray-400': 'text-[var(--color-text-secondary)]',
    'text-gray-500': 'text-[var(--color-text-secondary)]',
    'text-gray-600': 'text-[var(--color-text-primary)]',
    'text-gray-700': 'text-[var(--color-text-primary)]',
    'text-gray-800': 'text-[var(--color-text-primary)]',
    'text-gray-900': 'text-[var(--color-text-primary)]',

    # Border colors - Gray
    'border-gray-200': 'border-[var(--color-border)]',
    'border-gray-300': 'border-[var(--color-border-dark)]',
    'border-gray-400': 'border-[var(--color-border-dark)]',

    # Hover states - Blue
    'hover:bg-blue-50': 'hover:bg-[var(--color-primary-lightest)]',
    'hover:bg-blue-100': 'hover:bg-[var(--color-primary-lighter)]',
    'hover:bg-blue-700': 'hover:bg-[var(--color-primary-dark)]',
    'hover:bg-blue-800': 'hover:bg-[var(--color-primary-darker)]',

    # Hover states - Green
    'hover:bg-green-700': 'hover:bg-[var(--color-success-dark)]',
    'hover:bg-green-800': 'hover:bg-[var(--color-success-darker)]',

    # Hover states - Gray
    'hover:bg-gray-50': 'hover:bg-[var(--color-background-hover)]',
    'hover:bg-gray-100': 'hover:bg-[var(--color-background-hover)]',
    'hover:bg-gray-200': 'hover:bg-[var(--color-border)]',

    # From/To (Gradients) - Blue
    'from-blue-500': 'from-[var(--color-primary)]',
    'to-blue-600': 'to-[var(--color-primary)]',
    'from-blue-600': 'from-[var(--color-primary)]',
    'to-blue-700': 'to-[var(--color-primary-dark)]',

    # From/To (Gradients) - Green
    'from-green-500': 'from-[var(--color-success)]',
    'to-green-600': 'to-[var(--color-success)]',

    # From/To (Gradients) - Purple
    'from-purple-500': 'from-[var(--color-info)]',
    'to-purple-600': 'to-[var(--color-info)]',

    # From/To (Gradients) - Indigo
    'from-indigo-500': 'from-[var(--color-info)]',
    'to-indigo-600': 'to-[var(--color-info)]',
}

def fix_file(file_path):
    """Remplace les classes Tailwind par des variables CSS"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes = 0

        # Remplacer chaque classe Tailwind
        for tailwind_class, css_var_class in TAILWIND_TO_CSS_VAR.items():
            # Utiliser word boundaries pour éviter de remplacer partiellement
            pattern = r'\b' + re.escape(tailwind_class) + r'\b'
            new_content = re.sub(pattern, css_var_class, content)
            if new_content != content:
                count = len(re.findall(pattern, content))
                changes += count
                content = new_content

        # Écrire si des changements ont été faits
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes

        return 0
    except Exception as e:
        print(f"  Erreur avec {file_path}: {e}")
        return 0

def process_directory(directory, filter_files=None):
    """Traite tous les fichiers .tsx dans un répertoire"""
    if not os.path.exists(directory):
        print(f"  Dossier non trouvé: {directory}")
        return 0, 0

    total_changes = 0
    files_changed = 0

    for root, dirs, files in os.walk(directory):
        for file in files:
            # Traiter seulement les fichiers Dashboard
            if (file.endswith('.tsx') or file.endswith('.ts')) and (filter_files is None or any(f.lower() in file.lower() for f in filter_files)):
                file_path = os.path.join(root, file)
                changes = fix_file(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    relative_path = os.path.relpath(file_path, directory)
                    print(f"    {relative_path}: {changes} remplacement(s)")

    return total_changes, files_changed

# Traiter tous les dossiers
print("=" * 70)
print("CORRECTION DU THEME DANS LE MODULE TABLEAU DE BORD")
print("=" * 70)

total_all_changes = 0
total_all_files = 0

# Traiter pages/dashboard (tous les fichiers)
print(f"\n1. Traitement de pages/dashboard/")
changes1, files1 = process_directory(directories[0])
total_all_changes += changes1
total_all_files += files1
if files1 == 0:
    print(f"    Aucun fichier modifie")

# Traiter pages/ (seulement fichiers dashboard)
print(f"\n2. Traitement de pages/ (fichiers Dashboard uniquement)")
changes2, files2 = process_directory(directories[1], filter_files=['dashboard'])
total_all_changes += changes2
total_all_files += files2
if files2 == 0:
    print(f"    Aucun fichier modifie")

# Traiter components/dashboards
print(f"\n3. Traitement de components/dashboards/")
changes3, files3 = process_directory(directories[2])
total_all_changes += changes3
total_all_files += files3
if files3 == 0:
    print(f"    Aucun fichier modifie")

# Resume final
print(f"\n{'=' * 70}")
print(f"RESUME FINAL:")
print(f"  - {total_all_files} fichier(s) modifie(s)")
print(f"  - {total_all_changes} classe(s) Tailwind remplacee(s) par des variables CSS")
print(f"{'=' * 70}")

if total_all_changes > 0:
    print("\nTheme du projet applique avec succes dans tout le module tableau de bord!")
else:
    print("\nAucune modification necessaire - le theme est deja correct")