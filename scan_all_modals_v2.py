import os
import re
from pathlib import Path

pages_dir = Path(r"C:\devs\WiseBook\frontend\src\pages")

problematic_files = []

for tsx_file in pages_dir.rglob("*.tsx"):
    try:
        content = tsx_file.read_text(encoding='utf-8')

        # Skip backup files
        if 'backup' in str(tsx_file).lower() or 'broken' in str(tsx_file).lower():
            continue

        # Find all modal state definitions
        modal_states = re.findall(r'const \[show(\w+)Modal', content)

        if not modal_states:
            continue

        modals_defined = len(modal_states)

        # Count modals rendered with BOTH patterns:
        # Pattern 1: {showXxxModal &&
        # Pattern 2: isOpen={showXxxModal}
        modals_rendered = 0
        for modal_name in modal_states:
            pattern1 = f'{{show{modal_name}Modal &&'
            pattern2 = f'isOpen={{show{modal_name}Modal}}'

            if pattern1 in content or pattern2 in content:
                modals_rendered += 1

        if modals_defined != modals_rendered:
            file_rel = str(tsx_file.relative_to(pages_dir))

            # Find which modals are missing
            missing_modals = []
            for modal_name in modal_states:
                pattern1 = f'{{show{modal_name}Modal &&'
                pattern2 = f'isOpen={{show{modal_name}Modal}}'
                if pattern1 not in content and pattern2 not in content:
                    missing_modals.append(f"show{modal_name}Modal")

            problematic_files.append({
                'file': file_rel,
                'defined': modals_defined,
                'rendered': modals_rendered,
                'missing': modals_defined - modals_rendered,
                'missing_names': missing_modals
            })
    except:
        pass

print(f"SCAN COMPLET V2: {len(problematic_files)} fichiers avec modals manquants\n")
print("="*80)

# Sort by priority (more missing = higher priority)
for item in sorted(problematic_files, key=lambda x: x['missing'], reverse=True):
    print(f"[FICHIER] {item['file']}")
    print(f"   Definis: {item['defined']}, Rendus: {item['rendered']}, MANQUANTS: {item['missing']}")
    print(f"   Modals manquants: {', '.join(item['missing_names'])}")
    print()

print("="*80)
print(f"\nTOTAL FICHIERS AVEC PROBLEMES: {len(problematic_files)}")