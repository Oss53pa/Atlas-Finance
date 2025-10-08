#!/usr/bin/env python3
"""
Script pour appliquer le thème du projet dans le module d'authentification
"""

import os
import re

# Fichiers d'authentification
auth_files = [
    r'C:\devs\WiseBook\frontend\src\pages\auth\LoginPage.tsx',
    r'C:\devs\WiseBook\frontend\src\pages\auth\CompleteAuthModule.tsx'
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

    # Text colors - Blue
    'text-blue-50': 'text-[var(--color-primary-lightest)]',
    'text-blue-100': 'text-[var(--color-primary-lighter)]',
    'text-blue-200': 'text-[var(--color-primary-light)]',
    'text-blue-500': 'text-[var(--color-primary)]',
    'text-blue-600': 'text-[var(--color-primary)]',
    'text-blue-700': 'text-[var(--color-primary-dark)]',
    'text-blue-800': 'text-[var(--color-primary-darker)]',

    # Border colors - Blue
    'border-blue-100': 'border-[var(--color-primary-lighter)]',
    'border-blue-200': 'border-[var(--color-primary-light)]',
    'border-blue-500': 'border-[var(--color-primary)]',
    'border-blue-600': 'border-[var(--color-primary)]',

    # Background colors - Green (Success)
    'bg-green-50': 'bg-[var(--color-success-lightest)]',
    'bg-green-100': 'bg-[var(--color-success-lighter)]',
    'bg-green-200': 'bg-[var(--color-success-light)]',
    'bg-green-500': 'bg-[var(--color-success)]',
    'bg-green-600': 'bg-[var(--color-success)]',
    'bg-green-700': 'bg-[var(--color-success-dark)]',

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

    # Background colors - Purple
    'bg-purple-50': 'bg-[var(--color-info-lightest)]',
    'bg-purple-100': 'bg-[var(--color-info-lighter)]',
    'bg-purple-200': 'bg-[var(--color-info-light)]',
    'bg-purple-500': 'bg-[var(--color-info)]',
    'bg-purple-600': 'bg-[var(--color-info)]',

    # Text colors - Purple
    'text-purple-600': 'text-[var(--color-info)]',
    'text-purple-700': 'text-[var(--color-info-dark)]',
    'text-purple-800': 'text-[var(--color-info-darker)]',

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

    # Hover states - Green
    'hover:bg-green-700': 'hover:bg-[var(--color-success-dark)]',

    # Hover states - Gray
    'hover:bg-gray-50': 'hover:bg-[var(--color-background-hover)]',
    'hover:bg-gray-100': 'hover:bg-[var(--color-background-hover)]',
    'hover:bg-gray-200': 'hover:bg-[var(--color-border)]',
}

def fix_file(file_path):
    """Remplace les classes Tailwind par des variables CSS"""
    if not os.path.exists(file_path):
        print(f"  Fichier non trouvé: {file_path}")
        return 0

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

# Traiter tous les fichiers
print("=" * 70)
print("CORRECTION DU THÈME DANS LE MODULE D'AUTHENTIFICATION")
print("=" * 70)

total_changes = 0
total_files = 0

for i, file_path in enumerate(auth_files, 1):
    file_name = os.path.basename(file_path)
    print(f"\n{i}. Traitement de {file_name}")
    changes = fix_file(file_path)
    if changes > 0:
        total_changes += changes
        total_files += 1
        print(f"    {changes} remplacement(s)")
    else:
        print(f"    Aucun changement nécessaire")

# Résumé final
print(f"\n{'=' * 70}")
print(f"RÉSUMÉ FINAL:")
print(f"  - {total_files} fichier(s) modifié(s)")
print(f"  - {total_changes} classe(s) Tailwind remplacée(s) par des variables CSS")
print(f"{'=' * 70}")

if total_changes > 0:
    print("\n✓ Thème du projet appliqué avec succès dans le module d'authentification!")
else:
    print("\n✓ Aucune modification nécessaire - le thème est déjà correct")