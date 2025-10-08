#!/usr/bin/env python3
"""
Comprehensive syntax fix for all translation errors
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

        # Fix 1: Object properties - label: {t('key')} => label: t('key')
        content = re.sub(r'(label|title|compteLib|ariaLabel|statut|libelle):\s*\{t\(', r'\1: t(', content)

        # Fix 2: Close t() calls - t('key'))} => t('key')
        content = re.sub(r"t\('([^']+)'\)\}", r"t('\1')", content)

        # Fix 3: JSX attributes - placeholder=t('key') => placeholder={t('key')}
        content = re.sub(r"(placeholder|name)=t\('([^']+)'\)", r"\1={t('\2')}", content)

        # Fix 4: Ternary expressions - ? {t('key') => ? t('key')
        content = re.sub(r"(\?|:)\s*\{t\('([^']+)'\)", r"\1 t('\2')", content)

        # Fix 5: Ensure all JSX attributes with t() have closing braces
        # Pattern: name={t('key') followed by whitespace or closing tag
        content = re.sub(r"(name|placeholder)=\{t\('([^']+)'\)(\s+[a-zA-Z]+|/>|>)", r"\1={t('\2')}\3", content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  Fixed: {file_path}")
    else:
        print(f"  Not found: {file_path}")

print("\nDone!")