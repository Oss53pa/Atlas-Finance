#!/usr/bin/env python3
"""
Script pour corriger les problèmes de contraste WCAG
Remplace text-gray-400 et text-gray-500 par text-gray-700
"""

import os
import re
from pathlib import Path

def fix_contrast_in_file(file_path):
    """Remplace les classes de couleur dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Remplacer text-gray-400 par text-gray-700
        content = content.replace('text-gray-400', 'text-gray-700')

        # Remplacer text-gray-500 par text-gray-700
        content = content.replace('text-gray-500', 'text-gray-700')

        # Si le contenu a changé, écrire le fichier
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return 1  # Retourner le nombre de modifications
        return 0

    except Exception as e:
        print(f"Erreur avec {file_path}: {e}")
        return False

def main():
    """Point d'entrée principal"""
    frontend_src = Path('frontend/src')

    if not frontend_src.exists():
        print(f"Erreur: {frontend_src} n'existe pas")
        return

    # Compteurs
    files_processed = 0
    files_modified = 0

    # Parcourir tous les fichiers .ts et .tsx
    for file_path in frontend_src.rglob('*.tsx'):
        files_processed += 1
        modified = fix_contrast_in_file(file_path)
        if modified:
            files_modified += 1

    for file_path in frontend_src.rglob('*.ts'):
        # Ignorer les .tsx déjà traités
        if file_path.suffix != '.tsx':
            files_processed += 1
            modified = fix_contrast_in_file(file_path)
            if modified:
                files_modified += 1

    print("Termine!")
    print(f"Fichiers traites: {files_processed}")
    print(f"Fichiers modifies: {files_modified}")
    print("text-gray-400 et text-gray-500 -> text-gray-700")

if __name__ == '__main__':
    main()
