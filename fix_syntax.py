#!/usr/bin/env python3
"""
Script pour corriger les erreurs de syntaxe dans les fichiers traduits
"""

import re
from pathlib import Path

FRONTEND_DIR = Path("frontend/src")

files_to_fix = [
    FRONTEND_DIR / "components/layout/ModernDoubleSidebarLayout.tsx",
    FRONTEND_DIR / "pages/accounting/EntriesPage.tsx",
    FRONTEND_DIR / "pages/accounting/JournalsPage.tsx",
    FRONTEND_DIR / "pages/third-party/CompleteThirdPartyModuleV2.tsx",
    FRONTEND_DIR / "components/accounting/JournalDashboard.tsx",
    FRONTEND_DIR / "components/accounting/JournalEntryModal.tsx",
    FRONTEND_DIR / "components/layout/ModernSidebar.tsx",
    FRONTEND_DIR / "pages/settings/TrackChangePage.tsx",
]

for file_path in files_to_fix:
    if file_path.exists():
        print(f"Fixing {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Fix: label: {t('key')} => label: t('key') (for object literals)
        content = re.sub(r'(label|title|compteLib|ariaLabel|statut|libelle):\s*\{t\(', r'\1: t(', content)
        # Fix: closing )}  after t() call to just )
        content = re.sub(r"t\('([^']+)'\)\}", r"t('\1')", content)
        # Fix: placeholder=t('key') => placeholder={t('key')} (for JSX attributes)
        content = re.sub(r"placeholder=t\('([^']+)'\)", r"placeholder={t('\1')}", content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  Fixed: {file_path}")
    else:
        print(f"  Not found: {file_path}")

print("\nDone!")