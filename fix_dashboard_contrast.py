#!/usr/bin/env python3
"""
Script pour corriger les problèmes de contraste dans les pages dashboard
Replace les variables CSS malformées par des couleurs Tailwind valides
"""

import re
from pathlib import Path

# Mapping des remplacements de couleurs
COLOR_REPLACEMENTS = {
    # Text colors
    r'text-var\(--gray-900\)': 'text-gray-900',
    r'text-var\(--gray-800\)': 'text-gray-800',
    r'text-var\(--gray-700\)': 'text-gray-700',
    r'text-var\(--gray-600\)': 'text-gray-600',
    r'text-var\(--gray-500\)': 'text-gray-500',
    r'text-var\(--gray-400\)': 'text-gray-400',
    r'text-var\(--white\)': 'text-white',
    r'text-var\(--primary-600\)': 'text-[#6A8A82]',
    r'text-var\(--primary-700\)': 'text-[#588075]',
    r'text-var\(--success-600\)': 'text-green-600',
    r'text-var\(--success-700\)': 'text-green-700',
    r'text-var\(--warning-600\)': 'text-amber-600',
    r'text-var\(--warning-700\)': 'text-amber-700',
    r'text-var\(--danger-600\)': 'text-red-600',
    r'text-var\(--danger-700\)': 'text-red-700',
   r'text-var\(--danger-800\)': 'text-red-800',
    r'text-var\(--warning-800\)': 'text-amber-800',
    r'text-var\(--success-800\)': 'text-green-800',
    r'text-var\(--primary-800\)': 'text-[#4A665D]',

    # Background colors
    r'bg-var\(--white\)': 'bg-white',
    r'bg-var\(--gray-50\)': 'bg-gray-50',
    r'bg-var\(--gray-100\)': 'bg-gray-100',
    r'bg-var\(--gray-200\)': 'bg-gray-200',
    r'bg-var\(--primary-50\)': 'bg-[#E8EEEC]',
    r'bg-var\(--primary-100\)': 'bg-[#D1DDD9]',
    r'bg-var\(--primary-600\)': 'bg-[#6A8A82]',
    r'bg-var\(--primary-700\)': 'bg-[#588075]',
    r'bg-var\(--success-50\)': 'bg-green-50',
    r'bg-var\(--success-100\)': 'bg-green-100',
    r'bg-var\(--success-500\)': 'bg-green-500',
    r'bg-var\(--warning-50\)': 'bg-amber-50',
    r'bg-var\(--warning-100\)': 'bg-amber-100',
    r'bg-var\(--warning-500\)': 'bg-amber-500',
    r'bg-var\(--danger-50\)': 'bg-red-50',
    r'bg-var\(--danger-100\)': 'bg-red-100',
    r'bg-var\(--danger-200\)': 'bg-red-200',
    r'bg-var\(--warning-200\)': 'bg-amber-200',
    r'bg-var\(--success-200\)': 'bg-green-200',
    r'bg-var\(--primary-200\)': 'bg-[#B3C9C3]',

    # Border colors
    r'border-var\(--primary-200\)': 'border-[#B3C9C3]',
    r'border-var\(--primary-500\)': 'border-[#78998F]',
    r'border-var\(--danger-200\)': 'border-red-200',
    r'border-var\(--warning-200\)': 'border-amber-200',
    r'border-var\(--success-200\)': 'border-green-200',
    r'border-var\(--gray-300\)': 'border-gray-300',
    r'border-var\(--white\)': 'border-white',

    # Ring colors
    r'ring-var\(--primary-500\)': 'ring-[#78998F]',
    r'ring-var\(--primary-300\)': 'ring-[#A1BBB4]',

    # Stroke colors (for SVG/charts)
    r'stroke="var\(--gray-500\)"': 'stroke="#6B7280"',
    r'stroke="var\(--gray-300\)"': 'stroke="#D1D5DB"',
    r'stroke="var\(--primary-500\)"': 'stroke="#78998F"',
    r'stroke="var\(--success-500\)"': 'stroke="#10B981"',
    r'stroke="var\(--warning-500\)"': 'stroke="#F59E0B"',

    # Fill colors (for SVG/charts)
    r'fill="var\(--primary-500\)"': 'fill="#78998F"',

    # Stop colors for gradients
    r'stopColor="var\(--primary-500\)"': 'stopColor="#78998F"',

    # Hover colors
    r'hover:bg-var\(--primary-700\)': 'hover:bg-[#588075]',
    r'hover:bg-var\(--gray-100\)': 'hover:bg-gray-100',
    r'hover:bg-var\(--gray-200\)': 'hover:bg-gray-200',

    # Focus colors
    r'focus:ring-var\(--primary-500\)': 'focus:ring-[#78998F]',

    # Peer-checked colors
    r'peer-checked:bg-var\(--primary-600\)': 'peer-checked:bg-[#6A8A82]',
    r'peer-checked:after:border-var\(--white\)': 'peer-checked:after:border-white',
    r'peer-focus:ring-var\(--primary-300\)': 'peer-focus:ring-[#A1BBB4]',
    r'after:bg-var\(--white\)': 'after:bg-white',

    # Color variables in style
    r'var\(--primary-500\)': '#78998F',
    r'var\(--success-500\)': '#10B981',
    r'var\(--warning-500\)': '#F59E0B',
    r'var\(--danger-500\)': '#EF4444',
    r'var\(--gray-500\)': '#6B7280',
    r'var\(--gray-300\)': '#D1D5DB',
    r'var\(--success\)': '#10B981',
    r'var\(--warning\)': '#F59E0B',
    r'var\(--error\)': '#EF4444',
    r'var\(--border\)': '#D1D5DB',

    # Color references in code
    r'\[var\(--color-background-hover\)\]': 'gray-100',
    r'\[var\(--color-text-primary\)\]': 'gray-900',
    r'\[var\(--color-text-secondary\)\]': 'gray-600',
    r'\[var\(--color-success-lighter\)\]': 'green-100',
    r'\[var\(--color-success-dark\)\]': 'green-700',
    r'\[var\(--color-warning-lighter\)\]': 'amber-100',
    r'\[var\(--color-warning-dark\)\]': 'amber-700',
    r'\[var\(--color-error-lighter\)\]': 'red-100',
    r'\[var\(--color-error-dark\)\]': 'red-700',
    r'\[var\(--color-error-lightest\)\]': 'red-50',
    r'\[var\(--color-error-light\)\]': 'red-200',
    r'\[var\(--color-warning-lightest\)\]': 'amber-50',
    r'\[var\(--color-warning-light\)\]': 'amber-200',
    r'\[var\(--color-primary-lightest\)\]': '[#F0F5F4]',
    r'\[var\(--color-primary-light\)\]': '[#D1DDD9]',
    r'\[var\(--color-background-secondary\)\]': 'gray-50',
    r'\[var\(--color-border\)\]': 'gray-200',
}

# Fichiers à traiter
FILES_TO_FIX = [
    'frontend/src/pages/dashboard/KPIsRealTime.tsx',
    'frontend/src/pages/dashboard/AlertsSystem.tsx',
    'frontend/src/pages/dashboard/AIInsights.tsx',
    'frontend/src/pages/dashboard/WorkflowsManager.tsx',
]

def fix_contrast_in_file(file_path: Path):
    """Fix contrast issues in a single file"""
    print(f"Processing {file_path}...")

    if not file_path.exists():
        print(f"  WARNING File not found: {file_path}")
        return False

    # Read file content
    content = file_path.read_text(encoding='utf-8')
    original_content = content

    # Apply replacements
    changes_made = 0
    for pattern, replacement in COLOR_REPLACEMENTS.items():
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes_made += 1

    # Write back if changes were made
    if content != original_content:
        file_path.write_text(content, encoding='utf-8')
        print(f"  OK Fixed {changes_made} color patterns")
        return True
    else:
        print(f"  INFO No changes needed")
        return False

def main():
    """Main function"""
    print("Fixing dashboard contrast issues...\n")

    base_dir = Path(__file__).parent
    fixed_count = 0

    for file_rel_path in FILES_TO_FIX:
        file_path = base_dir / file_rel_path
        if fix_contrast_in_file(file_path):
            fixed_count += 1

    print(f"\nDone! Fixed {fixed_count}/{len(FILES_TO_FIX)} files")

if __name__ == '__main__':
    main()
