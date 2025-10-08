import os
import re
from pathlib import Path

pages_dir = Path(r"C:\devs\WiseBook\frontend\src\pages")

problematic_files = []

for tsx_file in pages_dir.rglob("*.tsx"):
    try:
        content = tsx_file.read_text(encoding='utf-8')

        # Count modal states defined
        modals_defined = len(re.findall(r'const \[show\w*Modal', content))

        # Count modals rendered
        modals_rendered = len(re.findall(r'\{show\w*Modal &&', content))

        if modals_defined > 0:
            status = "OK" if modals_defined == modals_rendered else "PROBLÈME"
            file_rel = str(tsx_file.relative_to(pages_dir))

            if modals_defined != modals_rendered:
                problematic_files.append({
                    'file': file_rel,
                    'defined': modals_defined,
                    'rendered': modals_rendered,
                    'missing': modals_defined - modals_rendered
                })
    except:
        pass

print(f"SCAN COMPLET: {len(problematic_files)} fichiers avec modals manquants\n")
print("="*80)

for item in sorted(problematic_files, key=lambda x: x['missing'], reverse=True):
    print(f"{item['file']}")
    print(f"  Définis: {item['defined']}, Rendus: {item['rendered']}, Manquants: {item['missing']}")
    print()

print("="*80)
print(f"\nTOTAL FICHIERS AVEC PROBLÈMES: {len(problematic_files)}")