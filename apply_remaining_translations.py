#!/usr/bin/env python3
"""
Script pour appliquer les traductions aux fichiers restants du projet WiseBook
"""

import re
import json
from pathlib import Path

FRONTEND_DIR = Path("frontend/src")
LOCALES_DIR = FRONTEND_DIR / "locales"

# Trouver tous les fichiers TypeScript/React qui n'ont pas encore été traduits
def find_untranslated_files():
    """Trouve tous les fichiers qui contiennent du texte en français non traduit"""
    untranslated = []

    # Patterns pour détecter du texte français non traduit
    french_patterns = [
        r'>\s*[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿA-ZÀ-Ÿ]+)*\s*<',  # Texte dans JSX
        r'title=["\'"][A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿA-ZÀ-Ÿ]+)*["\']',  # Attributs title
        r'placeholder=["\'"][A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿA-ZÀ-Ÿ]+)*["\']',  # Placeholder
        r'label:\s*["\'"][A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿA-ZÀ-Ÿ]+)*["\']',  # Labels
        r'message:\s*["\'"][A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[a-zà-ÿA-ZÀ-Ÿ]+)*["\']',  # Messages
    ]

    # Parcourir tous les fichiers TSX/TS
    for file_path in FRONTEND_DIR.rglob("*.tsx"):
        if "node_modules" in str(file_path) or ".test." in str(file_path):
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Ignorer les fichiers déjà traduits (qui utilisent useLanguage)
            if "useLanguage" in content:
                continue

            # Chercher des patterns de texte français
            for pattern in french_patterns:
                if re.search(pattern, content):
                    untranslated.append(file_path)
                    break

        except Exception as e:
            print(f"Erreur lecture {file_path}: {e}")

    return untranslated

# Dictionnaire de traductions étendu pour les textes courants
EXTENDED_TRANSLATIONS = {
    # Actions et boutons
    "Retour": ("actions.back", "Retour", "Back", "Atrás"),
    "Suivant": ("actions.next", "Suivant", "Next", "Siguiente"),
    "Précédent": ("actions.previous", "Précédent", "Previous", "Anterior"),
    "Terminer": ("actions.finish", "Terminer", "Finish", "Terminar"),
    "Fermer": ("actions.close", "Fermer", "Close", "Cerrar"),
    "Ouvrir": ("actions.open", "Ouvrir", "Open", "Abrir"),
    "Charger": ("actions.load", "Charger", "Load", "Cargar"),
    "Afficher": ("actions.show", "Afficher", "Show", "Mostrar"),
    "Masquer": ("actions.hide", "Masquer", "Hide", "Ocultar"),
    "Sélectionner": ("actions.select", "Sélectionner", "Select", "Seleccionar"),
    "Tout sélectionner": ("actions.selectAll", "Tout sélectionner", "Select All", "Seleccionar todo"),
    "Désélectionner": ("actions.deselect", "Désélectionner", "Deselect", "Deseleccionar"),

    # États et messages
    "Chargement": ("status.loading", "Chargement", "Loading", "Cargando"),
    "Chargement en cours": ("status.loadingInProgress", "Chargement en cours", "Loading in progress", "Carga en progreso"),
    "Aucun résultat": ("messages.noResults", "Aucun résultat", "No results", "Sin resultados"),
    "Aucune donnée": ("messages.noData", "Aucune donnée", "No data", "Sin datos"),
    "Erreur": ("messages.error", "Erreur", "Error", "Error"),
    "Succès": ("messages.success", "Succès", "Success", "Éxito"),
    "Attention": ("messages.warning", "Attention", "Warning", "Advertencia"),
    "Information": ("messages.info", "Information", "Information", "Información"),
    "Confirmation": ("messages.confirmation", "Confirmation", "Confirmation", "Confirmación"),

    # Formulaires
    "Nom": ("form.name", "Nom", "Name", "Nombre"),
    "Prénom": ("form.firstName", "Prénom", "First Name", "Nombre"),
    "Email": ("form.email", "Email", "Email", "Correo electrónico"),
    "Téléphone": ("form.phone", "Téléphone", "Phone", "Teléfono"),
    "Adresse": ("form.address", "Adresse", "Address", "Dirección"),
    "Ville": ("form.city", "Ville", "City", "Ciudad"),
    "Code postal": ("form.zipCode", "Code postal", "Zip Code", "Código postal"),
    "Pays": ("form.country", "Pays", "Country", "País"),
    "Description": ("form.description", "Description", "Description", "Descripción"),
    "Commentaire": ("form.comment", "Commentaire", "Comment", "Comentario"),
    "Note": ("form.note", "Note", "Note", "Nota"),

    # Dates et temps
    "Date": ("time.date", "Date", "Date", "Fecha"),
    "Heure": ("time.hour", "Heure", "Hour", "Hora"),
    "Jour": ("time.day", "Jour", "Day", "Día"),
    "Mois": ("time.month", "Mois", "Month", "Mes"),
    "Année": ("time.year", "Année", "Year", "Año"),
    "Semaine": ("time.week", "Semaine", "Week", "Semana"),
    "Aujourd'hui": ("time.today", "Aujourd'hui", "Today", "Hoy"),
    "Hier": ("time.yesterday", "Hier", "Yesterday", "Ayer"),
    "Demain": ("time.tomorrow", "Demain", "Tomorrow", "Mañana"),

    # Pagination
    "Page": ("pagination.page", "Page", "Page", "Página"),
    "sur": ("pagination.of", "sur", "of", "de"),
    "Résultats": ("pagination.results", "Résultats", "Results", "Resultados"),
    "Afficher": ("pagination.show", "Afficher", "Show", "Mostrar"),
    "éléments": ("pagination.items", "éléments", "items", "elementos"),
}

def process_remaining_files():
    """Traite les fichiers restants pour appliquer les traductions"""
    untranslated = find_untranslated_files()

    print(f"Fichiers non traduits trouvés: {len(untranslated)}")

    translations_added = set()
    files_modified = 0

    for file_path in untranslated[:20]:  # Limiter à 20 fichiers pour éviter trop de changements
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            modified = False

            # Ajouter l'import useLanguage si nécessaire
            if "useLanguage" not in content and any(text in content for text in EXTENDED_TRANSLATIONS.keys()):
                # Calculer le chemin relatif pour l'import
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

                    # Ajouter le hook dans le composant
                    component_pattern = r"((?:const|function)\s+\w+.*?\{)\n"
                    match = re.search(component_pattern, content)
                    if match:
                        insert_pos = match.end()
                        hook_line = "  const { t } = useLanguage();\n"
                        content = content[:insert_pos] + hook_line + content[insert_pos:]
                        modified = True

            # Appliquer les traductions
            for french_text, (key, fr, en, es) in EXTENDED_TRANSLATIONS.items():
                # Patterns de remplacement
                patterns = [
                    (f">{french_text}<", f">{{t('{key}')}}<"),
                    (f'"{french_text}"', f"t('{key}')"),
                    (f"'{french_text}'", f"t('{key}')"),
                ]

                for pattern, replacement in patterns:
                    if pattern in content:
                        # Éviter de remplacer dans les imports ou commentaires
                        if not re.search(f"import.*{re.escape(pattern)}", content) and \
                           not re.search(f"//.*{re.escape(pattern)}", content):
                            content = content.replace(pattern, replacement)
                            modified = True
                            translations_added.add(key)

            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"  [OK] {file_path.name}")
                files_modified += 1

        except Exception as e:
            print(f"  [ERREUR] {file_path.name}: {e}")

    # Mettre à jour les fichiers de locale
    if translations_added:
        update_locale_files(translations_added)

    print(f"\nRésumé:")
    print(f"  Fichiers modifiés: {files_modified}")
    print(f"  Traductions ajoutées: {len(translations_added)}")
    print(f"  Fichiers restants: {len(untranslated) - files_modified}")

def update_locale_files(translations_added):
    """Met à jour les fichiers de locale avec les nouvelles traductions"""
    locales = {
        'fr': LOCALES_DIR / 'fr.json',
        'en': LOCALES_DIR / 'en.json',
        'es': LOCALES_DIR / 'es.json'
    }

    for lang, file_path in locales.items():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Ajouter les nouvelles traductions
            for key_full in translations_added:
                for text, (key, fr, en, es) in EXTENDED_TRANSLATIONS.items():
                    if key == key_full:
                        keys = key.split('.')
                        current = data

                        # Naviguer dans la structure
                        for k in keys[:-1]:
                            if k not in current:
                                current[k] = {}
                            current = current[k]

                        # Ajouter la traduction
                        final_key = keys[-1]
                        if final_key not in current:
                            if lang == 'fr':
                                current[final_key] = fr
                            elif lang == 'en':
                                current[final_key] = en
                            elif lang == 'es':
                                current[final_key] = es

            # Sauvegarder
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"  [OK] Locale {lang} mise à jour")

        except Exception as e:
            print(f"  [ERREUR] Locale {lang}: {e}")

if __name__ == "__main__":
    print("Recherche et traduction des fichiers restants...")
    print("=" * 60)
    process_remaining_files()
    print("\n[TERMINE] Traduction des fichiers restants")