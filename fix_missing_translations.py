#!/usr/bin/env python3
"""
Script pour ajouter les clés de traduction manquantes
"""

import json
from pathlib import Path

FRONTEND_DIR = Path("frontend/src")
LOCALES_DIR = FRONTEND_DIR / "locales"

# Clés manquantes identifiées dans la console
missing_keys = {
    "navigation": {
        "treasury": ("Trésorerie", "Treasury", "Tesorería"),
        "assets": ("Immobilisations", "Fixed Assets", "Activos Fijos"),
        "settings": ("Paramètres", "Settings", "Configuración"),
        "journals": ("Journaux", "Journals", "Diarios"),
        "clients": ("Clients", "Customers", "Clientes"),
        "suppliers": ("Fournisseurs", "Suppliers", "Proveedores")
    },
    "thirdParty": {
        "reconciliation": ("Lettrage", "Reconciliation", "Conciliación"),
        "collection": ("Recouvrement", "Collection", "Cobro")
    },
    "accounting": {
        "journal": ("Journal", "Journal", "Diario"),
        "draft": ("Brouillon", "Draft", "Borrador"),
        "validated": ("Validé", "Validated", "Validado")
    },
    "common": {
        "error": ("Erreur", "Error", "Error"),
        "success": ("Succès", "Success", "Éxito"),
        "date": ("Date", "Date", "Fecha")
    },
    "treasury": {
        "receipts": ("Encaissements", "Receipts", "Cobros"),
        "payments": ("Décaissements", "Payments", "Pagos"),
        "position": ("Position de trésorerie", "Cash Position", "Posición de tesorería"),
        "cashFlow": ("Flux de trésorerie", "Cash Flow", "Flujo de caja")
    }
}

def update_locale_file(locale_path, lang_index, missing_keys_dict):
    """Met à jour un fichier de locale avec les clés manquantes"""
    print(f"Mise à jour de {locale_path.name}...")

    # Charger le fichier existant
    with open(locale_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Ajouter les clés manquantes
    for section, keys in missing_keys_dict.items():
        if section not in data:
            data[section] = {}

        for key, translations in keys.items():
            if key not in data[section]:
                data[section][key] = translations[lang_index]
                print(f"  Ajouté: {section}.{key} = {translations[lang_index]}")

    # Sauvegarder le fichier
    with open(locale_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  [OK] {locale_path.name} mis à jour")

def main():
    print("Ajout des clés de traduction manquantes...")
    print("=" * 60)

    # Mettre à jour chaque fichier de locale
    locales = [
        (LOCALES_DIR / 'fr.json', 0),  # Index 0 pour français
        (LOCALES_DIR / 'en.json', 1),  # Index 1 pour anglais
        (LOCALES_DIR / 'es.json', 2),  # Index 2 pour espagnol
    ]

    for locale_path, lang_index in locales:
        if locale_path.exists():
            update_locale_file(locale_path, lang_index, missing_keys)
        else:
            print(f"  [ERREUR] Fichier non trouvé: {locale_path}")

    print("\n" + "=" * 60)
    print("[TERMINE] Clés de traduction ajoutées avec succès !")
    print("\nVeuillez:")
    print("1. Rafraîchir votre navigateur (Ctrl+F5 ou Cmd+Shift+R)")
    print("2. Vider le cache si nécessaire")
    print("3. Redémarrer le serveur de développement si les erreurs persistent")

if __name__ == "__main__":
    main()