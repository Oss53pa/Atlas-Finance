#!/usr/bin/env python3
"""
Script pour appliquer les VRAIES couleurs du thème WiseBook partout dans l'application
Remplace les classes monochromes (tuatara, swirl, rolling-stone) par les vraies couleurs du thème
"""

import os
import re

# Tous les dossiers à traiter
directories = [
    r'C:\devs\WiseBook\frontend\src\pages',
    r'C:\devs\WiseBook\frontend\src\components',
    r'C:\devs\WiseBook\frontend\src\features'
]

# Mapping des classes monochromes vers les vraies couleurs du thème WiseBook
# Basé sur globals.css:
# --color-primary: #6A8A82 (vert-gris sage)
# --color-secondary: #B87333 (cuivre)
# --color-error: #B85450 (rouge terre cuite)
# --color-warning: #B87333 (cuivre/bronze)
# --color-info: #7A99AC (bleu-gris)

THEME_MAPPINGS = {
    # Tuatara (gris foncé) → Couleur primaire ou texte primaire selon contexte
    'bg-tuatara': 'bg-[var(--color-primary)]',
    'text-tuatara': 'text-[var(--color-text-primary)]',
    'border-tuatara': 'border-[var(--color-primary)]',
    'hover:bg-tuatara': 'hover:bg-[var(--color-primary-hover)]',

    # Swirl (gris clair) → Background ou surface
    'bg-swirl': 'bg-[var(--color-background)]',
    'text-swirl': 'text-white',
    'border-swirl': 'border-[var(--color-border-light)]',

    # Rolling Stone (gris moyen) → Texte secondaire ou accent
    'bg-rolling-stone': 'bg-[var(--color-secondary)]',
    'text-rolling-stone': 'text-[var(--color-text-secondary)]',
    'border-rolling-stone': 'border-[var(--color-border)]',
    'hover:bg-rolling-stone': 'hover:bg-[var(--color-secondary)]',

    # Classes avec opacité
    'bg-tuatara/10': 'bg-[var(--color-primary-light)]',
    'bg-tuatara/20': 'bg-[var(--color-primary-light)]',
    'text-tuatara/70': 'text-[var(--color-text-primary)]',
    'text-tuatara/80': 'text-[var(--color-text-primary)]',
}

def fix_file(file_path):
    """Remplace les classes monochromes par les vraies couleurs du thème"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes = 0

        # Remplacer chaque classe monochrome
        for mono_class, theme_class in THEME_MAPPINGS.items():
            # Utiliser word boundaries pour éviter de remplacer partiellement
            pattern = r'\b' + re.escape(mono_class) + r'\b'
            new_content = re.sub(pattern, theme_class, content)
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

def process_directory(directory):
    """Traite tous les fichiers .tsx/.ts dans un répertoire"""
    if not os.path.exists(directory):
        print(f"  Dossier non trouvé: {directory}")
        return 0, 0

    total_changes = 0
    files_changed = 0

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                file_path = os.path.join(root, file)
                changes = fix_file(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    relative_path = os.path.relpath(file_path, directory)
                    print(f"    {relative_path}: {changes} remplacement(s)")

    return total_changes, files_changed

# Traiter tous les dossiers
print("=" * 80)
print("APPLICATION DES VRAIES COULEURS DU THEME WISEBOOK")
print("=" * 80)
print("\nTheme WiseBook:")
print("  - Primary (Sage):   #6A8A82")
print("  - Secondary (Cuivre): #B87333")
print("  - Error (Terre):    #B85450")
print("  - Info (Bleu-gris): #7A99AC")
print("=" * 80)

total_all_changes = 0
total_all_files = 0

for i, directory in enumerate(directories, 1):
    dir_name = os.path.basename(directory) or directory.split(os.sep)[-1]
    print(f"\n{i}. Traitement de {dir_name}/")
    changes, files = process_directory(directory)
    total_all_changes += changes
    total_all_files += files
    if files == 0:
        print(f"    Aucun fichier modifie")

# Résumé final
print(f"\n{'=' * 80}")
print(f"RESUME FINAL:")
print(f"  - {total_all_files} fichier(s) modifie(s)")
print(f"  - {total_all_changes} classe(s) monochrome(s) remplacee(s) par les vraies couleurs")
print(f"{'=' * 80}")

if total_all_changes > 0:
    print("\nLes VRAIES couleurs du theme WiseBook ont ete appliquees avec succes!")
    print("Le theme n'est plus monochrome!")
else:
    print("\nAucune classe monochrome trouvee")