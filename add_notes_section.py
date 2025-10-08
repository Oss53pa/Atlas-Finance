#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Read the Notes section from AssetsRegistry
with open('frontend/src/pages/assets/AssetsRegistry.tsx', 'r', encoding='utf-8') as f:
    registry_lines = f.readlines()

# Extract Notes section (lines 4868-5097)
notes_section = registry_lines[4867:5097]

# Read current AssetsListComplete
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'r', encoding='utf-8') as f:
    complete_lines = f.readlines()

# Find where to insert the Notes section (after attachements)
insert_pos = -1
for i, line in enumerate(complete_lines):
    if "activeFormTab === 'attachements'" in line:
        # Find the end of attachements section
        depth = 0
        for j in range(i, len(complete_lines)):
            if '{' in complete_lines[j]:
                depth += complete_lines[j].count('{')
            if '}' in complete_lines[j]:
                depth -= complete_lines[j].count('}')
            if depth == 0 and j > i:
                insert_pos = j + 1
                break
        break

if insert_pos == -1:
    print("Could not find attachements section")
    exit(1)

# Build new content
new_content = []
new_content.extend(complete_lines[:insert_pos])
new_content.append("\n                  {/* Section Notes */}\n")
new_content.extend(notes_section)
new_content.extend(complete_lines[insert_pos:])

# Write the file
with open('frontend/src/pages/assets/AssetsListComplete.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print(f"Added Notes section at line {insert_pos}")
print(f"New file has {len(new_content)} lines")