#!/usr/bin/env python3
"""
Script pour copier le modal complet de CompleteConfigModule vers AdminWorkspaceComplete
"""

# Lire le modal de CompleteConfigModule.tsx
with open(r'C:\devs\WiseBook\frontend\src\pages\config\CompleteConfigModule.tsx', 'r', encoding='utf-8') as f:
    config_lines = f.readlines()

# Trouver le début et la fin du modal (lignes 738 à 1021 environ)
modal_start_idx = None
modal_end_idx = None

for i, line in enumerate(config_lines):
    if '{/* Modal Algorithme IA */' in line and modal_start_idx is None:
        modal_start_idx = i
    if modal_start_idx is not None and ')}' in line and 'showAlgoModal' in config_lines[i-5:i+1].__str__():
        modal_end_idx = i + 1
        break

if modal_start_idx is None:
    print("Modal non trouvé")
    exit(1)

# Extraire le modal
modal_lines = config_lines[modal_start_idx:modal_end_idx]

# Lire AdminWorkspaceComplete.tsx
with open(r'C:\devs\WiseBook\frontend\src\pages\workspace\AdminWorkspaceComplete.tsx', 'r', encoding='utf-8') as f:
    admin_lines = f.readlines()

# Trouver où insérer (juste avant le return)
return_idx = None
for i, line in enumerate(admin_lines):
    if 'return (' in line and 'WorkspaceLayout' in admin_lines[i+1]:
        return_idx = i
        break

if return_idx is None:
    print("Return non trouvé")
    exit(1)

# Insérer le modal
new_admin_lines = admin_lines[:return_idx] + ['\n'] + modal_lines + ['\n'] + admin_lines[return_idx:]

# Écrire le fichier
with open(r'C:\devs\WiseBook\frontend\src\pages\workspace\AdminWorkspaceComplete.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_admin_lines)

print(f"✅ Modal copié avec succès!")
print(f"   - {len(modal_lines)} lignes copiées")
print(f"   - Inséré à la ligne {return_idx}")