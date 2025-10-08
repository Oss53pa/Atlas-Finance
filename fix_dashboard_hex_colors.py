#!/usr/bin/env python3
"""
Script pour remplacer les couleurs hexadécimales hardcodées dans le module tableau de bord
"""

import os
import re

# Dossiers à traiter
directories = [
    r'C:\devs\WiseBook\frontend\src\pages\dashboard',
    r'C:\devs\WiseBook\frontend\src\pages',
    r'C:\devs\WiseBook\frontend\src\components\dashboards'
]

# Mapping des couleurs hexadécimales vers les variables CSS
COLOR_MAPPINGS = {
    # Couleurs bleues (Primary)
    r'#3B82F6': 'var(--color-primary)',
    r'#3b82f6': 'var(--color-primary)',
    r'#2563EB': 'var(--color-primary-dark)',
    r'#2563eb': 'var(--color-primary-dark)',
    r'#1E40AF': 'var(--color-primary-darker)',
    r'#1e40af': 'var(--color-primary-darker)',
    r'#EFF6FF': 'var(--color-primary-lightest)',
    r'#eff6ff': 'var(--color-primary-lightest)',
    r'#DBEAFE': 'var(--color-primary-lighter)',
    r'#dbeafe': 'var(--color-primary-lighter)',

    # Couleurs vertes (Success)
    r'#10B981': 'var(--color-success)',
    r'#10b981': 'var(--color-success)',
    r'#059669': 'var(--color-success-dark)',
    r'#047857': 'var(--color-success-darker)',
    r'#ECFDF5': 'var(--color-success-lightest)',
    r'#ecfdf5': 'var(--color-success-lightest)',
    r'#D1FAE5': 'var(--color-success-lighter)',
    r'#d1fae5': 'var(--color-success-lighter)',

    # Couleurs rouges (Error)
    r'#EF4444': 'var(--color-error)',
    r'#ef4444': 'var(--color-error)',
    r'#DC2626': 'var(--color-error-dark)',
    r'#dc2626': 'var(--color-error-dark)',
    r'#B91C1C': 'var(--color-error-darker)',
    r'#b91c1c': 'var(--color-error-darker)',
    r'#FEF2F2': 'var(--color-error-lightest)',
    r'#fef2f2': 'var(--color-error-lightest)',
    r'#FEE2E2': 'var(--color-error-lighter)',
    r'#fee2e2': 'var(--color-error-lighter)',

    # Couleurs orange/jaunes (Warning)
    r'#F97316': 'var(--color-warning)',
    r'#f97316': 'var(--color-warning)',
    r'#EA580C': 'var(--color-warning-dark)',
    r'#ea580c': 'var(--color-warning-dark)',
    r'#C2410C': 'var(--color-warning-darker)',
    r'#c2410c': 'var(--color-warning-darker)',
    r'#FFF7ED': 'var(--color-warning-lightest)',
    r'#fff7ed': 'var(--color-warning-lightest)',
    r'#FFEDD5': 'var(--color-warning-lighter)',
    r'#ffedd5': 'var(--color-warning-lighter)',
    r'#F59E0B': 'var(--color-warning)',
    r'#f59e0b': 'var(--color-warning)',
    r'#D97706': 'var(--color-warning-dark)',
    r'#d97706': 'var(--color-warning-dark)',
    r'#FFFBEB': 'var(--color-warning-lightest)',
    r'#fffbeb': 'var(--color-warning-lightest)',
    r'#FEF3C7': 'var(--color-warning-lighter)',
    r'#fef3c7': 'var(--color-warning-lighter)',

    # Couleurs violettes/indigo (Info)
    r'#8B5CF6': 'var(--color-info)',
    r'#8b5cf6': 'var(--color-info)',
    r'#7C3AED': 'var(--color-info-dark)',
    r'#7c3aed': 'var(--color-info-dark)',
    r'#6366F1': 'var(--color-info)',
    r'#6366f1': 'var(--color-info)',
    r'#4F46E5': 'var(--color-info-dark)',
    r'#4f46e5': 'var(--color-info-dark)',
    r'#EDE9FE': 'var(--color-info-lightest)',
    r'#ede9fe': 'var(--color-info-lightest)',
    r'#DDD6FE': 'var(--color-info-lighter)',
    r'#ddd6fe': 'var(--color-info-lighter)',

    # Couleurs grises
    r'#F9FAFB': 'var(--color-background-secondary)',
    r'#f9fafb': 'var(--color-background-secondary)',
    r'#F3F4F6': 'var(--color-background-hover)',
    r'#f3f4f6': 'var(--color-background-hover)',
    r'#E5E7EB': 'var(--color-border)',
    r'#e5e7eb': 'var(--color-border)',
    r'#D1D5DB': 'var(--color-border-dark)',
    r'#d1d5db': 'var(--color-border-dark)',
    r'#9CA3AF': 'var(--color-text-secondary)',
    r'#9ca3af': 'var(--color-text-secondary)',
    r'#6B7280': 'var(--color-text-secondary)',
    r'#6b7280': 'var(--color-text-secondary)',
    r'#4B5563': 'var(--color-text-primary)',
    r'#4b5563': 'var(--color-text-primary)',
    r'#374151': 'var(--color-text-primary)',
    r'#1F2937': 'var(--color-text-primary)',
    r'#1f2937': 'var(--color-text-primary)',
    r'#111827': 'var(--color-text-primary)',

    # Blanc
    r'#FFFFFF': 'var(--color-background-primary)',
    r'#ffffff': 'var(--color-background-primary)',
}

def fix_file(file_path):
    """Remplace les couleurs hexadécimales dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes = 0

        # Remplacer les couleurs dans les classes Tailwind et propriétés CSS
        for hex_color, css_var in COLOR_MAPPINGS.items():
            # Pattern pour bg-[#color], text-[#color], border-[#color], etc.
            patterns = [
                (rf'(bg|text|border|from|to|via|ring|divide|outline|decoration|shadow)-\[{hex_color}\]',
                 rf'\1-[{css_var}]'),
                # Pattern pour les propriétés CSS style={{ color: '#...' }}
                (rf'(color|backgroundColor|borderColor):\s*["\']?{hex_color}["\']?',
                 rf'\1: "{css_var}"'),
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
        print(f"  Erreur avec {file_path}: {e}")
        return 0

def process_directory(directory, filter_files=None):
    """Traite tous les fichiers .tsx dans un répertoire"""
    if not os.path.exists(directory):
        return 0, 0

    total_changes = 0
    files_changed = 0

    for root, dirs, files in os.walk(directory):
        for file in files:
            if (file.endswith('.tsx') or file.endswith('.ts')) and (filter_files is None or any(f.lower() in file.lower() for f in filter_files)):
                file_path = os.path.join(root, file)
                changes = fix_file(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    relative_path = os.path.relpath(file_path, directory)
                    print(f"    {relative_path}: {changes} couleur(s)")

    return total_changes, files_changed

# Traiter tous les dossiers
print("=" * 70)
print("CORRECTION DES COULEURS HEXADECIMALES DANS LE MODULE TABLEAU DE BORD")
print("=" * 70)

total_all_changes = 0
total_all_files = 0

# Traiter pages/dashboard
print(f"\n1. Traitement de pages/dashboard/")
changes1, files1 = process_directory(directories[0])
total_all_changes += changes1
total_all_files += files1
if files1 == 0:
    print(f"    Aucune couleur hexadecimale trouvee")

# Traiter pages/ (fichiers dashboard)
print(f"\n2. Traitement de pages/ (fichiers Dashboard uniquement)")
changes2, files2 = process_directory(directories[1], filter_files=['dashboard'])
total_all_changes += changes2
total_all_files += files2
if files2 == 0:
    print(f"    Aucune couleur hexadecimale trouvee")

# Traiter components/dashboards
print(f"\n3. Traitement de components/dashboards/")
changes3, files3 = process_directory(directories[2])
total_all_changes += changes3
total_all_files += files3
if files3 == 0:
    print(f"    Aucune couleur hexadecimale trouvee")

# Resume final
print(f"\n{'=' * 70}")
print(f"RESUME FINAL:")
print(f"  - {total_all_files} fichier(s) avec couleurs hexadecimales")
print(f"  - {total_all_changes} couleur(s) remplacee(s) par des variables CSS")
print(f"{'=' * 70}")

if total_all_changes > 0:
    print("\nCouleurs hexadecimales remplacees avec succes!")
else:
    print("\nAucune couleur hexadecimale hardcodee trouvee")