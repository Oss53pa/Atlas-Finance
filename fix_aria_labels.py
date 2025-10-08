#!/usr/bin/env python3
"""
Script pour ajouter automatiquement des aria-labels aux boutons avec icônes
Basé sur la détection des icônes Heroicons courantes
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Mapping icône -> aria-label en français
ICON_TO_LABEL = {
    'TrashIcon': 'Supprimer',
    'Trash2': 'Supprimer',
    'PencilIcon': 'Modifier',
    'PencilSquareIcon': 'Modifier',
    'Edit2': 'Modifier',
    'EyeIcon': 'Voir les détails',
    'Eye': 'Voir les détails',
    'PlusIcon': 'Ajouter',
    'Plus': 'Ajouter',
    'XMarkIcon': 'Fermer',
    'XIcon': 'Fermer',
    'X': 'Fermer',
    'MagnifyingGlassIcon': 'Rechercher',
    'Search': 'Rechercher',
    'ArrowDownTrayIcon': 'Télécharger',
    'Download': 'Télécharger',
    'ShareIcon': 'Partager',
    'Share': 'Partager',
    'Share2': 'Partager',
    'Cog6ToothIcon': 'Paramètres',
    'CogIcon': 'Paramètres',
    'Settings': 'Paramètres',
    'DocumentDuplicateIcon': 'Dupliquer',
    'Copy': 'Dupliquer',
    'CheckIcon': 'Valider',
    'Check': 'Valider',
    'CheckCircleIcon': 'Valider',
    'LockClosedIcon': 'Verrouiller',
    'Lock': 'Verrouiller',
    'LockOpenIcon': 'Déverrouiller',
    'Unlock': 'Déverrouiller',
    'ArrowPathIcon': 'Actualiser',
    'RefreshCw': 'Actualiser',
    'FunnelIcon': 'Filtrer',
    'Filter': 'Filtrer',
    'PrinterIcon': 'Imprimer',
    'Printer': 'Imprimer',
    'SaveIcon': 'Enregistrer',
    'Save': 'Enregistrer',
    'DocumentArrowDownIcon': 'Télécharger',
    'DownloadIcon': 'Télécharger',
    'PlayIcon': 'Lire',
    'Play': 'Lire',
    'PauseIcon': 'Pause',
    'Pause': 'Pause',
    'ClockIcon': 'Planifier',
    'Calendar': 'Calendrier',
    'CalendarDaysIcon': 'Calendrier',
    'UserIcon': 'Utilisateur',
    'User': 'Utilisateur',
    'UsersIcon': 'Utilisateurs',
    'Users': 'Utilisateurs',
    'ChevronDown': 'Ouvrir le menu',
    'ChevronUp': 'Fermer le menu',
    'ChevronLeft': 'Précédent',
    'ChevronRight': 'Suivant',
    'ArrowLeft': 'Retour',
    'ArrowRight': 'Suivant',
    'InfoIcon': 'Information',
    'Info': 'Information',
    'AlertCircle': 'Alerte',
    'ExclamationTriangleIcon': 'Attention',
}

def detect_icon_in_button(button_content: str) -> str | None:
    """Détecte quelle icône est utilisée dans un bouton"""
    for icon_name in ICON_TO_LABEL.keys():
        if icon_name in button_content:
            return icon_name
    return None

def has_aria_label_or_title(button_tag: str) -> bool:
    """Vérifie si le bouton a déjà un aria-label ou title"""
    return 'aria-label=' in button_tag or 'title=' in button_tag

def has_visible_text(button_content: str) -> bool:
    """Vérifie si le bouton contient du texte visible (pas juste une icône)"""
    # Enlever les icônes et balises
    text_only = re.sub(r'<[^>]+>', '', button_content)
    text_only = re.sub(r'\{[^}]+\}', '', text_only)
    text_only = text_only.strip()

    # Si il reste du texte substantiel (plus de 2 caractères), c'est un label visible
    return len(text_only) > 2

def add_aria_label_to_button(content: str) -> Tuple[str, int]:
    """
    Ajoute aria-label aux boutons qui en ont besoin
    Returns: (modified_content, number_of_changes)
    """
    changes = 0

    # Pattern pour détecter les boutons complets (multiligne supporté)
    # Match <button...>...</button>
    button_pattern = r'(<button[\s\S]*?>)([\s\S]*?)(</button>)'

    def replace_button(match):
        nonlocal changes
        opening_tag = match.group(1)
        button_content = match.group(2)
        closing_tag = match.group(3)

        # Si le bouton a déjà un aria-label, ne rien faire
        if 'aria-label=' in opening_tag:
            return match.group(0)

        # Si le bouton a du texte visible, ne rien faire
        if has_visible_text(button_content):
            return match.group(0)

        # Détecter l'icône dans le bouton
        icon = detect_icon_in_button(button_content)
        if not icon:
            return match.group(0)

        # Obtenir le label approprié
        label = ICON_TO_LABEL.get(icon)
        if not label:
            return match.group(0)

        # Ajouter aria-label juste avant le >
        # <button onClick={...} className="..." > devient
        # <button onClick={...} className="..." aria-label="..." >
        new_opening_tag = opening_tag.rstrip('>').rstrip() + f' aria-label="{label}">'

        changes += 1
        return new_opening_tag + button_content + closing_tag

    # Appliquer le remplacement
    new_content = re.sub(button_pattern, replace_button, content)

    return new_content, changes

def process_file(file_path: Path) -> int:
    """Traite un fichier et retourne le nombre de modifications"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content, changes = add_aria_label_to_button(content)

        if changes > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"+ {file_path.name}: {changes} aria-labels ajoutes")

        return changes

    except Exception as e:
        print(f"ERREUR {file_path}: {e}")
        return 0

def main():
    """Point d'entrée principal"""
    frontend_src = Path('frontend/src')

    if not frontend_src.exists():
        print(f"Erreur: {frontend_src} n'existe pas")
        return

    print("Demarrage de l'ajout automatique d'aria-labels...")
    print(f"Icones detectees: {len(ICON_TO_LABEL)}")
    print("-" * 60)

    files_processed = 0
    files_modified = 0
    total_changes = 0

    # Traiter tous les fichiers .tsx
    for file_path in frontend_src.rglob('*.tsx'):
        files_processed += 1
        changes = process_file(file_path)
        if changes > 0:
            files_modified += 1
            total_changes += changes

    print("-" * 60)
    print(f"Termine!")
    print(f"Fichiers traites: {files_processed}")
    print(f"Fichiers modifies: {files_modified}")
    print(f"Total aria-labels ajoutes: {total_changes}")
    print(f"Taux de couverture estime: ~{int(total_changes/1173*100)}% des boutons sans label")

if __name__ == '__main__':
    main()
