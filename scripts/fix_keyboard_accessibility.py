#!/usr/bin/env python3
"""
Script de Correction Automatique - Accessibilité Clavier
Corrige les éléments cliquables non accessibles au clavier
"""

import os
import re
import json
from pathlib import Path

# Chemins
FRONTEND_DIR = Path("C:/devs/WiseBook/frontend/src")
INVENTORY_FILE = Path("C:/devs/WiseBook/AUDIT_CLICKABLES_INVENTORY.json")
REPORT_FILE = Path("C:/devs/WiseBook/SPRINT1_CORRECTIONS_REPORT.md")

# Patterns à détecter
CLICKABLE_DIV_PATTERN = r'<div\s+([^>]*?)onClick=\{([^}]+)\}([^>]*?)>'
CLICKABLE_TD_PATTERN = r'<td\s+([^>]*?)onClick=\{([^}]+)\}([^>]*?)>'
CLICKABLE_TR_PATTERN = r'<tr\s+([^>]*?)onClick=\{([^}]+)\}([^>]*?)>'

def load_inventory():
    """Charger l'inventaire des éléments cliquables"""
    with open(INVENTORY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def has_role_or_tabindex(attrs: str) -> bool:
    """Vérifier si l'élément a déjà role= ou tabIndex="""
    return 'role=' in attrs or 'tabIndex=' in attrs

def extract_handler_name(onClick_code: str) -> str:
    """Extraire le nom du handler depuis le code onClick"""
    # Cas 1: Fonction fléchée inline: () => doSomething()
    match = re.search(r'=>\s*(\w+)\(', onClick_code)
    if match:
        return match.group(1)

    # Cas 2: Référence directe: handleClick
    match = re.search(r'^(\w+)$', onClick_code.strip())
    if match:
        return match.group(1)

    # Cas 3: Par défaut
    return "handleAction"

def generate_aria_label(handler_name: str, context: str = "") -> str:
    """Générer un aria-label descriptif basé sur le handler"""
    labels = {
        'handleRowClick': 'Sélectionner la ligne',
        'handleEdit': 'Modifier',
        'handleDelete': 'Supprimer',
        'handleView': 'Voir les détails',
        'handleSelect': 'Sélectionner',
        'handleToggle': 'Basculer',
        'handleOpen': 'Ouvrir',
        'handleClose': 'Fermer',
    }

    return labels.get(handler_name, f'Activer {handler_name}')

def fix_clickable_element(content: str, tag: str = 'div') -> tuple[str, int]:
    """
    Corriger un élément cliquable pour le rendre accessible au clavier

    Args:
        content: Contenu du fichier
        tag: Type d'élément ('div', 'td', 'tr')

    Returns:
        (contenu_corrigé, nombre_corrections)
    """
    patterns = {
        'div': CLICKABLE_DIV_PATTERN,
        'td': CLICKABLE_TD_PATTERN,
        'tr': CLICKABLE_TR_PATTERN,
    }

    pattern = patterns.get(tag, CLICKABLE_DIV_PATTERN)
    corrections = 0

    def replace_fn(match):
        nonlocal corrections

        before_attrs = match.group(1)
        onClick_code = match.group(2)
        after_attrs = match.group(3) if match.lastindex >= 3 else ''

        # Vérifier si déjà accessible
        all_attrs = before_attrs + after_attrs
        if has_role_or_tabindex(all_attrs):
            return match.group(0)  # Pas de changement

        # Extraire le nom du handler
        handler_name = extract_handler_name(onClick_code)
        aria_label = generate_aria_label(handler_name)

        # Générer le handler clavier
        keyboard_handler_name = f"handleKeyDown_{handler_name}"

        # Créer les nouveaux attributs
        new_attrs = f'''role="button"
      tabIndex={{0}}
      onClick={{{onClick_code}}}
      onKeyDown={{(e) => {{
        if (e.key === 'Enter' || e.key === ' ') {{
          e.preventDefault();
          ({onClick_code})(e);
        }}
      }}}}
      aria-label="{aria_label}"'''

        # Construire le nouvel élément
        corrections += 1
        return f'<{tag} {before_attrs.strip()} {new_attrs} {after_attrs.strip()}>'

    fixed_content = re.sub(pattern, replace_fn, content, flags=re.DOTALL)
    return fixed_content, corrections

def fix_file(file_path: Path) -> dict:
    """
    Corriger un fichier complet

    Returns:
        Rapport de correction avec statistiques
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        content = original_content
        total_corrections = 0

        # Corriger les divs
        content, div_corrections = fix_clickable_element(content, 'div')
        total_corrections += div_corrections

        # Corriger les td
        content, td_corrections = fix_clickable_element(content, 'td')
        total_corrections += td_corrections

        # Corriger les tr
        content, tr_corrections = fix_clickable_element(content, 'tr')
        total_corrections += tr_corrections

        # Écrire le fichier corrigé
        if total_corrections > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

        return {
            'file': str(file_path.relative_to(FRONTEND_DIR)),
            'corrections': total_corrections,
            'div': div_corrections,
            'td': td_corrections,
            'tr': tr_corrections,
            'success': True,
        }

    except Exception as e:
        return {
            'file': str(file_path.relative_to(FRONTEND_DIR)),
            'corrections': 0,
            'success': False,
            'error': str(e),
        }

def get_priority_files(inventory: dict) -> list[str]:
    """Extraire les fichiers prioritaires depuis l'inventaire"""
    priority_files = []

    red_flags = inventory.get('summary', {}).get('redFlagsSummary', {})
    not_accessible = red_flags.get('not-keyboard-accessible', {})

    for example in not_accessible.get('examples', []):
        file_path = example['file'].replace('\\', '/')
        if file_path not in priority_files:
            priority_files.append(file_path)

    return priority_files

def main():
    """Fonction principale"""
    print("🚀 Début de la correction automatique - Accessibilité Clavier\n")

    # Charger l'inventaire
    print("📊 Chargement de l'inventaire...")
    inventory = load_inventory()

    # Obtenir les fichiers prioritaires
    priority_files = get_priority_files(inventory)
    print(f"✅ {len(priority_files)} fichiers prioritaires identifiés\n")

    # Corriger les fichiers
    results = []
    total_corrections = 0

    for file_rel_path in priority_files[:20]:  # Limiter à 20 premiers fichiers pour cette exécution
        file_path = FRONTEND_DIR / file_rel_path

        if not file_path.exists():
            print(f"⚠️  Fichier non trouvé: {file_rel_path}")
            continue

        print(f"🔧 Correction: {file_rel_path}...")
        result = fix_file(file_path)
        results.append(result)

        if result['success']:
            total_corrections += result['corrections']
            print(f"   ✅ {result['corrections']} correction(s)")
        else:
            print(f"   ❌ Erreur: {result.get('error', 'Unknown')}")

    # Générer le rapport
    print(f"\n📝 Génération du rapport...")
    generate_report(results, total_corrections)

    print(f"\n🎉 Terminé! {total_corrections} corrections appliquées")
    print(f"📄 Rapport: {REPORT_FILE}")

def generate_report(results: list, total_corrections: int):
    """Générer le rapport de correction"""
    report = f"""# 📊 Rapport Sprint 1 - Corrections Accessibilité Clavier

**Date:** {Path(__file__).stat().st_mtime}
**Total corrections:** {total_corrections}
**Fichiers traités:** {len(results)}

## ✅ Résumé

| Métrique | Valeur |
|----------|--------|
| Fichiers corrigés | {len([r for r in results if r['success'] and r['corrections'] > 0])} |
| Fichiers en erreur | {len([r for r in results if not r['success']])} |
| Total corrections | {total_corrections} |
| Corrections div | {sum(r['div'] for r in results if r['success'])} |
| Corrections td | {sum(r['td'] for r in results if r['success'])} |
| Corrections tr | {sum(r['tr'] for r in results if r['success'])} |

## 📁 Fichiers Corrigés

"""

    for result in results:
        if result['success'] and result['corrections'] > 0:
            report += f"### ✅ {result['file']}\n\n"
            report += f"- **Corrections totales:** {result['corrections']}\n"
            report += f"- div: {result['div']}, td: {result['td']}, tr: {result['tr']}\n\n"

    report += f"\n## ❌ Erreurs\n\n"

    for result in results:
        if not result['success']:
            report += f"### {result['file']}\n\n"
            report += f"```\n{result.get('error', 'Unknown error')}\n```\n\n"

    report += f"""
## 🎯 Prochaines Étapes

1. Vérifier les corrections manuellement
2. Lancer les tests unitaires
3. Tester au clavier (Tab, Enter, Space)
4. Tester avec lecteur d'écran (NVDA)
5. Commit des changements

## 📝 Template de Correction Appliqué

**AVANT:**
```tsx
<div onClick={{handleRowClick}}>
  Contenu
</div>
```

**APRÈS:**
```tsx
<div
  role="button"
  tabIndex={{0}}
  onClick={{handleRowClick}}
  onKeyDown={{(e) => {{
    if (e.key === 'Enter' || e.key === ' ') {{
      e.preventDefault();
      handleRowClick(e);
    }}
  }}}}
  aria-label="Sélectionner la ligne"
>
  Contenu
</div>
```

---

**Généré automatiquement par:** fix_keyboard_accessibility.py
"""

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)

if __name__ == '__main__':
    main()
