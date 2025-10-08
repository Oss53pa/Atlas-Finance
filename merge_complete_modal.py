#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys

# Read AssetsRegistry to get the complete modal sections
with open('frontend/src/pages/assets/AssetsRegistry.tsx', 'r', encoding='utf-8') as f:
    registry_lines = f.readlines()

# Read current AssetsListComplete
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'r', encoding='utf-8') as f:
    complete_lines = f.readlines()

# Find where to insert the modal content in AssetsListComplete
# We need to find the activeFormTab === 'immobilisation' section
insert_start = -1
insert_end = -1

for i, line in enumerate(complete_lines):
    if "activeFormTab === 'immobilisation'" in line:
        insert_start = i
        # Find the end of this section (next activeFormTab or end of tabs)
        depth = 0
        for j in range(i, len(complete_lines)):
            if '{' in complete_lines[j]:
                depth += complete_lines[j].count('{')
            if '}' in complete_lines[j]:
                depth -= complete_lines[j].count('}')
            if depth == 0 and j > i:
                insert_end = j + 1
                break
            if "activeFormTab === 'vente'" in complete_lines[j] and j > i:
                insert_end = j
                break
        break

if insert_start == -1:
    print("Could not find immobilisation section")
    sys.exit(1)

# Extract sections from AssetsRegistry
# Immobilisation: lines 2901-3860 (0-indexed: 2900-3859)
immobilisation_section = registry_lines[2900:3860]

# Vente: lines 3861-4038 (0-indexed: 3860-4037)
vente_section = registry_lines[3860:4038]

# Composants: lines 4039-4189 (0-indexed: 4038-4188)
composants_section = registry_lines[4038:4189]

# Maintenance: lines 4190-4722 (0-indexed: 4189-4721)
maintenance_section = registry_lines[4189:4722]

# Build the new file
new_content = []

# Copy everything before the immobilisation section
new_content.extend(complete_lines[:insert_start])

# Add the complete modal sections
new_content.extend(immobilisation_section)
new_content.append("\n")
new_content.extend(vente_section)
new_content.append("\n")
new_content.extend(composants_section)
new_content.append("\n")
new_content.extend(maintenance_section)

# Find where the rest of the tabs continue (after all form tabs)
# Look for Attachements and Notes tabs which should remain
remaining_start = -1
for i in range(insert_end, len(complete_lines)):
    if "activeFormTab === 'attachements'" in complete_lines[i] or "activeFormTab === 'notes'" in complete_lines[i]:
        remaining_start = i
        break

if remaining_start > -1:
    new_content.extend(complete_lines[remaining_start:])
else:
    # If we can't find attachments/notes, keep the rest of the file after the tabs
    for i in range(insert_end, len(complete_lines)):
        if '</div>' in complete_lines[i] and '{/* Modal tabs end */}' in complete_lines[i]:
            new_content.extend(complete_lines[i:])
            break
        elif '</DialogContent>' in complete_lines[i]:
            new_content.extend(complete_lines[i:])
            break

# Write the merged file
with open('frontend/src/pages/assets/AssetsListComplete.new.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print(f"Created merged file with {len(new_content)} lines")
print("Saved as: frontend/src/pages/assets/AssetsListComplete.new.tsx")