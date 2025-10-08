#!/usr/bin/env python3
"""
Script pour corriger les couleurs hardcodées dans le module clôture
et appliquer le thème du projet uniformément
"""

import os
import re
from pathlib import Path

# Dossier du module clôture
closures_dir = r'C:\devs\WiseBook\frontend\src\pages\closures'
features_dir = r'C:\devs\WiseBook\frontend\src\features\closures'
features_periodic_dir = r'C:\devs\WiseBook\frontend\src\features\periodic-closures'

# Mapping des couleurs hardcodées vers les variables CSS
COLOR_MAPPINGS = {
    # Couleurs bleues
    r'#3B82F6': 'var(--color-primary)',
    r'#2563EB': 'var(--color-primary-dark)',
    r'#1E40AF': 'var(--color-primary-darker)',
    r'#EFF6FF': 'var(--color-primary-light)',
    r'#DBEAFE': 'var(--color-primary-lighter)',

    # Couleurs vertes
    r'#10B981': 'var(--color-success)',
    r'#059669': 'var(--color-success-dark)',
    r'#047857': 'var(--color-success-darker)',
    r'#ECFDF5': 'var(--color-success-light)',
    r'#D1FAE5': 'var(--color-success-lighter)',

    # Couleurs rouges
    r'#EF4444': 'var(--color-error)',
    r'#DC2626': 'var(--color-error-dark)',
    r'#B91C1C': 'var(--color-error-darker)',
    r'#FEF2F2': 'var(--color-error-light)',
    r'#FEE2E2': 'var(--color-error-lighter)',

    # Couleurs orange
    r'#F97316': 'var(--color-warning)',
    r'#EA580C': 'var(--color-warning-dark)',
    r'#C2410C': 'var(--color-warning-darker)',
    r'#FFF7ED': 'var(--color-warning-light)',
    r'#FFEDD5': 'var(--color-warning-lighter)',

    # Couleurs jaunes
    r'#F59E0B': 'var(--color-warning)',
    r'#D97706': 'var(--color-warning-dark)',
    r'#B45309': 'var(--color-warning-darker)',
    r'#FFFBEB': 'var(--color-warning-light)',
    r'#FEF3C7': 'var(--color-warning-lighter)',

    # Couleurs grises
    r'#F9FAFB': 'var(--color-background-secondary)',
    r'#F3F4F6': 'var(--color-background-secondary)',
    r'#E5E7EB': 'var(--color-border)',
    r'#D1D5DB': 'var(--color-border-dark)',
    r'#9CA3AF': 'var(--color-text-secondary)',
    r'#6B7280': 'var(--color-text-secondary)',
    r'#4B5563': 'var(--color-text-primary)',
    r'#374151': 'var(--color-text-primary)',
    r'#1F2937': 'var(--color-text-primary)',
    r'#111827': 'var(--color-text-primary)',

    # Blanc
    r'#FFFFFF': 'var(--color-background-primary)',
    r'#FFF': 'var(--color-background-primary)',
}

def fix_file(file_path):
    """Corrige les couleurs dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes = 0

        # Remplacer les couleurs dans les classes Tailwind
        for hex_color, css_var in COLOR_MAPPINGS.items():
            # Pattern pour bg-[#color], text-[#color], border-[#color], etc.
            patterns = [
                (rf'(bg|text|border|from|to|via|ring|divide|outline|decoration|shadow)-\[{hex_color}\]',
                 rf'\1-[{css_var}]'),
            ]

            for pattern, replacement in patterns:
                new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                if new_content != content:
                    changes += len(re.findall(pattern, content, flags=re.IGNORECASE))
                    content = new_content

        # Écrire seulement si des changements ont été faits
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes

        return 0
    except Exception as e:
        print(f"Erreur avec {file_path}: {e}")
        return 0

def process_directory(directory):
    """Traite tous les fichiers .tsx dans un répertoire"""
    if not os.path.exists(directory):
        print(f"Dossier non trouvé: {directory}")
        return 0

    total_changes = 0
    files_changed = 0

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                file_path = os.path.join(root, file)
                changes = fix_file(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    print(f"  {file}: {changes} changement(s)")

    return total_changes, files_changed

# Traiter tous les dossiers
print("Correction des couleurs dans le module clôture...")
print("\n1. Traitement de pages/closures/")
changes1, files1 = process_directory(closures_dir)

print("\n2. Traitement de features/closures/")
changes2, files2 = process_directory(features_dir)

print("\n3. Traitement de features/periodic-closures/")
changes3, files3 = process_directory(features_periodic_dir)

# Résumé
total_changes = changes1 + changes2 + changes3
total_files = files1 + files2 + files3

print(f"\n{'='*60}")
print(f"RÉSUMÉ:")
print(f"  - {total_files} fichier(s) modifié(s)")
print(f"  - {total_changes} couleur(s) remplacée(s)")
print(f"{'='*60}")
print("\nThème du projet appliqué avec succès!")