# INSTRUCTIONS: SUPPRESSION BACKEND NODE.JS

**Date**: 27 Septembre 2025
**Raison**: Backend Node.js inutilisé (code mort)
**Espace libéré**: ~100-200 MB

---

## CONTEXTE

Le projet WiseBook utilise Django comme backend principal. Un backend Node.js existe dans `./backend/` mais n'est **pas utilisé** et constitue du code mort.

**Audit a confirmé**:
- Django backend actif sur port 8000 ✅
- Node.js backend non utilisé ❌
- Contient: node_modules, prisma, scripts

---

## MÉTHODE 1: SUPPRESSION MANUELLE (RECOMMANDÉ)

### Étape 1: Fermer tous les processus

**Fermer complètement**:
1. VS Code / IDE
2. Terminaux/consoles ouverts
3. Explorateur de fichiers (dans le dossier backend)
4. Git Bash / PowerShell

### Étape 2: Vérifier aucun processus Node.js

Ouvrir PowerShell en **Administrateur**:

```powershell
# Vérifier processus Node.js
Get-Process -Name node -ErrorAction SilentlyContinue

# Si des processus trouvés, les arrêter
Get-Process -Name node | Stop-Process -Force
```

### Étape 3: Supprimer le dossier

**Option A: Explorateur Windows**
1. Ouvrir `C:\devs\WiseBook\`
2. Clic droit sur dossier `backend`
3. Supprimer
4. Si erreur "fichier utilisé":
   - Redémarrer ordinateur
   - Réessayer suppression

**Option B: PowerShell (Administrateur)**
```powershell
cd C:\devs\WiseBook
Remove-Item -Path .\backend -Recurse -Force
```

**Option C: CMD (Administrateur)**
```cmd
cd C:\devs\WiseBook
rmdir /s /q backend
```

### Étape 4: Vérifier suppression

```powershell
cd C:\devs\WiseBook
ls -la | findstr backend
# Ne devrait rien retourner
```

---

## MÉTHODE 2: SUPPRESSION AVEC UNLOCKER (SI BLOQUÉ)

Si le dossier refuse d'être supprimé:

### Option 1: IOBit Unlocker (Gratuit)

1. Télécharger: https://www.iobit.com/en/iobit-unlocker.php
2. Installer IOBit Unlocker
3. Clic droit sur dossier `backend` → IOBit Unlocker
4. Sélectionner "Delete"
5. Confirmer

### Option 2: LockHunter (Gratuit)

1. Télécharger: https://lockhunter.com/
2. Installer LockHunter
3. Clic droit sur dossier `backend` → What is locking this folder?
4. Unlock All → Delete

### Option 3: Mode Sans Échec Windows

1. Redémarrer Windows en Mode Sans Échec
2. Naviguer vers `C:\devs\WiseBook\`
3. Supprimer dossier `backend`
4. Redémarrer normalement

---

## MÉTHODE 3: ARCHIVAGE (ALTERNATIVE)

Si suppression impossible ou si vous voulez garder une copie:

### Archiver au lieu de supprimer

```powershell
cd C:\devs\WiseBook

# Compresser en ZIP
Compress-Archive -Path .\backend -DestinationPath .\backend_archive_20250927.zip

# Déplacer l'archive ailleurs
Move-Item .\backend_archive_20250927.zip C:\Backups\

# Supprimer le dossier original
Remove-Item -Path .\backend -Recurse -Force
```

---

## VÉRIFICATION POST-SUPPRESSION

### 1. Vérifier dossier supprimé

```bash
ls -la | grep backend
# Ne devrait rien retourner
```

### 2. Vérifier .gitignore

Le dossier `backend/` est déjà dans `.gitignore`:

```bash
cat .gitignore | grep backend
# Devrait afficher: backend/
```

### 3. Vérifier espace disque libéré

```powershell
# Voir espace disque C:
Get-PSDrive C | Select-Object Used,Free
```

Devrait montrer ~100-200 MB libérés.

### 4. Vérifier projet fonctionne

```bash
# Backend Django toujours OK
python manage.py check --settings=wisebook.simple_settings

# Frontend toujours OK
cd frontend
npm run dev
```

---

## POURQUOI SUPPRIMER?

### Raisons Techniques

1. **Code mort**: Backend Node.js jamais utilisé
2. **Confusion**: Présence de 2 backends confuse
3. **Espace**: 100-200 MB inutilisés
4. **Maintenance**: Dépendances obsolètes potentielles
5. **Sécurité**: Code non maintenu = risque

### Impact Suppression

**Aucun impact négatif**:
- ✅ Django backend continue de fonctionner
- ✅ Frontend continue de fonctionner
- ✅ APIs restent accessibles
- ✅ Base de données intacte
- ✅ Pas de dépendances

---

## SI PROBLÈME

### Backend Django ne démarre plus

**Impossible** - Les deux backends sont indépendants.

Vérifier quand même:
```bash
python manage.py runserver --settings=wisebook.simple_settings
```

### Frontend ne build plus

**Impossible** - Frontend utilise Vite, pas le backend Node.js.

Vérifier quand même:
```bash
cd frontend
npm run build
```

### Besoin de restaurer backend Node.js

Si jamais besoin de restaurer (peu probable):

1. Récupérer depuis Git:
```bash
git checkout HEAD -- backend/
```

2. Ou depuis backup ZIP si créé

---

## CHECKLIST SUPPRESSION

- [ ] Fermer VS Code / IDE
- [ ] Fermer tous terminaux
- [ ] Fermer Explorateur dans dossier backend
- [ ] Vérifier aucun processus Node.js
- [ ] Supprimer dossier `backend/`
- [ ] Vérifier dossier supprimé
- [ ] Vérifier Django backend fonctionne
- [ ] Vérifier frontend fonctionne
- [ ] Vérifier espace disque libéré

---

## COMMANDES RAPIDES

### PowerShell (Administrateur)

```powershell
# Tout en un
cd C:\devs\WiseBook
Get-Process -Name node | Stop-Process -Force
Remove-Item -Path .\backend -Recurse -Force
python manage.py check --settings=wisebook.simple_settings
```

### Git Bash

```bash
# Tout en un
cd /c/devs/WiseBook
rm -rf backend
python manage.py check --settings=wisebook.simple_settings
```

---

## RÉSULTAT ATTENDU

**Avant**:
```
C:\devs\WiseBook\
├── backend/           <- 100-200 MB
├── frontend/
├── apps/
├── wisebook/
...
```

**Après**:
```
C:\devs\WiseBook\
├── frontend/
├── apps/
├── wisebook/
...
```

**Espace libéré**: ~100-200 MB ✅

---

## SUPPORT

Si aucune méthode ne fonctionne:

1. **Redémarrer Windows** - Libère tous verrous fichiers
2. **Mode Sans Échec** - Suppression garantie
3. **Archiver + Renommer** - Alternative temporaire
4. **Laisser tel quel** - Pas critique, juste désordre

Le dossier backend n'affecte **PAS** le fonctionnement de WiseBook.

---

**Action recommandée**: Fermer tout → Redémarrer Windows → Supprimer backend/