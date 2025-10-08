# Guide de Débogage - Boutons qui ne fonctionnent pas

## 🔍 Problème
Les boutons suivants dans `BackupPage.tsx` ne semblent pas fonctionner :
- ❌ Nouvelle Planification
- ❌ Icône réglage (Settings)
- ❌ Lancer la restauration
- ❌ Icône clé (Générateur)
- ❌ Icône dossier (Sélection)
- ❌ Tester la connexion

## ✅ Solutions Appliquées

### 1. **Augmentation du z-index des modals**
**Fichier**: `frontend/src/components/ui/dialog.tsx`

Changé le z-index de `z-50` à `z-[9999]` pour s'assurer que les modals s'affichent au-dessus de tout contenu.

```tsx
// AVANT
<div className="fixed inset-0 z-50 flex items-center justify-center">

// APRÈS
<div className="fixed inset-0 z-[9999] flex items-center justify-center">
```

### 2. **Page de Test Créée**
**Fichier**: `frontend/src/pages/settings/BackupPageTest.tsx`

Une page de test dédiée pour vérifier que tous les boutons fonctionnent correctement.

## 🧪 Comment Tester

### Option 1: Utiliser la Page de Test

1. Accédez à la page de test dans votre navigateur:
   ```
   http://localhost:PORT/settings/backup-test
   ```

2. Cliquez sur chaque bouton de test

3. Vérifiez:
   - ✅ Un toast de succès apparaît
   - ✅ Un modal s'ouvre
   - ✅ Le modal peut être fermé
   - ✅ La console affiche les logs

### Option 2: Déboguer dans BackupPage

1. **Ouvrez la console du navigateur** (F12)

2. **Ajoutez des logs temporaires** dans `BackupPage.tsx`:

```tsx
// Ligne 555
<Button onClick={() => {
  console.log('🔵 CLICK: Nouvelle Planification');
  setShowNewScheduleModal(true);
  console.log('🔵 Modal state:', showNewScheduleModal);
}}>
  <Plus className="mr-2 h-4 w-4" />
  Nouvelle planification
</Button>
```

3. **Vérifiez l'état des modals** avec React DevTools:
   - Installez React DevTools
   - Cherchez le composant `BackupPage`
   - Vérifiez les états: `showNewScheduleModal`, `showRestoreModal`, etc.

### Option 3: Tester les Handlers Directement

Dans la console du navigateur:

```javascript
// Trouver tous les boutons
document.querySelectorAll('button').forEach((btn, i) => {
  console.log(`Button ${i}:`, btn.textContent, btn.onclick);
});

// Vérifier les z-index
document.querySelectorAll('[class*="z-"]').forEach(el => {
  console.log('Z-index:', window.getComputedStyle(el).zIndex, el);
});
```

## 🔧 Causes Possibles et Solutions

### Cause 1: Conflit de z-index
**Symptôme**: Le modal s'ouvre mais n'est pas visible

**Solution**:
```tsx
// Dans dialog.tsx - DÉJÀ APPLIQUÉ
className="fixed inset-0 z-[9999]"
```

### Cause 2: Événement onClick bloqué
**Symptôme**: Aucune réaction au clic

**Vérification**:
```tsx
<Button
  onClick={(e) => {
    e.stopPropagation();
    console.log('CLICKED');
    setShowModal(true);
  }}
>
```

### Cause 3: État du modal non synchronisé
**Symptôme**: L'état change mais le modal ne s'affiche pas

**Solution**:
```tsx
// Vérifier que le Dialog reçoit bien la prop open
<Dialog open={showNewScheduleModal} onOpenChange={setShowNewScheduleModal}>
  {/* Contenu */}
</Dialog>
```

### Cause 4: CSS conflictuel
**Symptôme**: Le modal est caché par un autre élément

**Vérification**:
```css
/* Dans les DevTools, vérifier: */
.dialog-container {
  pointer-events: auto !important;
  display: block !important;
  visibility: visible !important;
}
```

### Cause 5: Problème de portail/DOM
**Symptôme**: Le modal ne s'affiche pas dans le DOM

**Solution**: Ajouter un portail dans `dialog.tsx`:

```tsx
import { createPortal } from 'react-dom';

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Contenu */}
    </div>,
    document.body
  );
};
```

## 📋 Checklist de Débogage

- [ ] Les boutons ont bien un handler `onClick`
- [ ] Les handlers appellent bien `setState`
- [ ] L'état change dans React DevTools
- [ ] Le composant Dialog reçoit `open={true}`
- [ ] Le modal apparaît dans le DOM
- [ ] Le z-index du modal est suffisant
- [ ] Aucun élément ne bloque les clics
- [ ] La console ne montre aucune erreur
- [ ] Les toasts fonctionnent (teste la réactivité)

## 🚀 Test Rapide

Exécutez ce code dans la console pour tester rapidement:

```javascript
// Test 1: Vérifier que React est chargé
console.log('React:', typeof React !== 'undefined');

// Test 2: Vérifier les modals dans le DOM
console.log('Modals:', document.querySelectorAll('[role="dialog"]').length);

// Test 3: Forcer l'ouverture d'un modal (à adapter)
// Dans React DevTools, changez manuellement showNewScheduleModal à true

// Test 4: Vérifier z-index
const zIndexes = Array.from(document.querySelectorAll('*'))
  .map(el => ({ el, z: window.getComputedStyle(el).zIndex }))
  .filter(item => item.z !== 'auto')
  .sort((a, b) => parseInt(b.z) - parseInt(a.z));
console.log('Top 5 z-indexes:', zIndexes.slice(0, 5));
```

## 📞 Si Rien ne Fonctionne

1. **Vérifiez les erreurs JavaScript**:
   - Ouvrez la console (F12)
   - Cherchez des erreurs en rouge

2. **Vérifiez que les composants sont bien importés**:
   ```tsx
   import { Dialog, DialogContent } from '../../components/ui/dialog';
   ```

3. **Vérifiez que tous les fichiers sont sauvegardés**

4. **Redémarrez le serveur de développement**:
   ```bash
   npm run dev
   ```

5. **Videz le cache du navigateur** (Ctrl+Shift+R ou Cmd+Shift+R)

## ✉️ Contact

Si le problème persiste, fournissez:
1. Une capture d'écran de la console
2. Une capture d'écran de React DevTools
3. Le message d'erreur exact (s'il y en a un)
