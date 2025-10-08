#!/usr/bin/env python3
"""
Script pour corriger les erreurs CSS restantes après le premier passage
"""

import re
from pathlib import Path

# Remplacements spécifiques pour les erreurs restantes
FIXES = {
    # Classes Tailwind invalides (text-#color)
    r'text-#EF4444': 'text-red-500',
    r'text-#F59E0B': 'text-amber-500',
    r'text-#10B981': 'text-green-500',
    r'text-#78998F': 'text-[#78998F]',
    r'text-#6B7280': 'text-gray-500',
    r'text-#D1D5DB': 'text-gray-300',

    # Background invalides (bg-#color)
    r'bg-#EF4444': 'bg-red-500',
    r'bg-#F59E0B': 'bg-amber-500',
    r'bg-#10B981': 'bg-green-500',
    r'bg-#78998F': 'bg-[#78998F]',
    r'bg-#D1D5DB': 'bg-gray-300',

    # Border invalides (border-#color)
    r'border-#EF4444': 'border-red-500',
    r'border-#F59E0B': 'border-amber-500',
    r'border-#10B981': 'border-green-500',
    r'border-#D1D5DB': 'border-gray-300',

    # Var restantes dans les gradients et autres
    r'from-var\(--warning-400\)': 'from-amber-400',
    r'to-var\(--warning-600\)': 'to-amber-600',
    r'from-var\(--primary-400\)': 'from-[#8BA99F]',
    r'to-var\(--primary-600\)': 'to-[#6A8A82]',
    r'from-var\(--purple-400\)': 'from-purple-400',
    r'to-var\(--purple-600\)': 'to-purple-600',
    r'from-var\(--primary-50\)': 'from-[#E8EEEC]',
    r'to-var\(--indigo-50\)': 'to-indigo-50',

    # Var dans les classes
    r'hover:bg-var\(--gray-100\)': 'hover:bg-gray-100',
    r'bg-var\(--success-600\)': 'bg-green-600',
    r'bg-var\(--danger-600\)': 'bg-red-600',
    r'hover:bg-var\(--success-700\)': 'hover:bg-green-700',
    r'hover:bg-var\(--danger-700\)': 'hover:bg-red-700',
    r'border-var\(--gray-200\)': 'border-gray-200',
    r'text-var\(--orange-600\)': 'text-orange-600',

    # Arrow et autres icônes avec text-#
    r'text-#D1D5DB': 'text-gray-300',

    # Erreurs dans var() pour les propriétés CSS directes
    r'\[var\(--color-success\)\]': '[#10B981]',
    r'\[var\(--color-warning\)\]': '[#F59E0B]',
    r'\[var\(--color-error\)\]': '[#EF4444]',
    r'\[var\(--color-primary\)\]': '[#78998F]',
    r'\[var\(--color-success-light\)\]': '[#D1FAE5]',
    r'\[var\(--color-info-light\)\]': '[#DBEAFE]',
    r'\[var\(--color-info\)\]': '[#3B82F6]',
    r'hover:border-\[var\(--color-border-dark\)\]': 'hover:border-gray-400',
}

FILES_TO_FIX = [
    'frontend/src/pages/dashboard/KPIsRealTime.tsx',
    'frontend/src/pages/dashboard/AlertsSystem.tsx',
    'frontend/src/pages/dashboard/AIInsights.tsx',
    'frontend/src/pages/dashboard/WorkflowsManager.tsx',
]

def fix_file(file_path: Path):
    """Fix remaining CSS errors in a file"""
    print(f"Processing {file_path}...")

    if not file_path.exists():
        print(f"  WARNING File not found: {file_path}")
        return False

    content = file_path.read_text(encoding='utf-8')
    original_content = content

    changes_made = 0
    for pattern, replacement in FIXES.items():
        matches = re.findall(pattern, content)
        if matches:
            content = re.sub(pattern, replacement, content)
            changes_made += len(matches)
            print(f"  - Replaced '{pattern}' with '{replacement}' ({len(matches)} times)")

    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        print(f"  OK Fixed {changes_made} CSS errors")
        return True
    else:
        print(f"  INFO No changes needed")
        return False

def main():
    """Main function"""
    print("Fixing remaining CSS errors...\n")

    base_dir = Path(__file__).parent
    fixed_count = 0

    for file_rel_path in FILES_TO_FIX:
        file_path = base_dir / file_rel_path
        if fix_file(file_path):
            fixed_count += 1

    print(f"\nDone! Fixed {fixed_count}/{len(FILES_TO_FIX)} files")

if __name__ == '__main__':
    main()
