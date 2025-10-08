# Composants Réutilisables Import/Export

Ce dossier contient tous les composants réutilisables pour les fonctionnalités d'import/export à travers le projet WiseBook.

## Composants Disponibles

### 1. FileUpload
Composant de téléchargement de fichiers avec drag & drop.

```tsx
import { FileUpload } from '@/components/common';

<FileUpload
  onFilesSelect={(files) => console.log(files)}
  accept=".csv,.xlsx,.xls,.json,.xml"
  multiple={true}
  maxSize={50} // en MB
  showPreview={true}
/>
```

**Props:**
- `accept` - Types de fichiers acceptés (défaut: `.csv,.xlsx,.xls,.json,.xml`)
- `multiple` - Autoriser plusieurs fichiers (défaut: `true`)
- `onFilesSelect` - Callback appelé quand des fichiers sont sélectionnés
- `maxSize` - Taille maximale en MB (défaut: `10`)
- `showPreview` - Afficher l'aperçu des fichiers (défaut: `true`)

---

### 2. ImportButton
Bouton d'import avec modal de configuration complet.

```tsx
import { ImportButton } from '@/components/common';

<ImportButton
  module="Comptabilité"
  onImport={(files, options) => {
    console.log('Import:', files, options);
  }}
  label="Importer"
  variant="default"
  size="default"
/>
```

**Props:**
- `module` - Nom du module (requis)
- `onImport` - Callback appelé lors du lancement de l'import
- `className` - Classes CSS additionnelles
- `variant` - Style du bouton (`default` | `outline` | `ghost`)
- `size` - Taille du bouton (`sm` | `default` | `lg`)
- `showIcon` - Afficher l'icône (défaut: `true`)
- `label` - Texte du bouton (défaut: "Importer")

---

### 3. ExportButton
Bouton d'export avec modal de configuration et choix de format.

```tsx
import { ExportButton } from '@/components/common';

<ExportButton
  module="Clients"
  onExport={(format, options) => {
    console.log('Export:', format, options);
  }}
  label="Exporter"
/>
```

**Props:**
- `module` - Nom du module (requis)
- `onExport` - Callback appelé lors de l'export
- `className` - Classes CSS additionnelles
- `variant` - Style du bouton
- `size` - Taille du bouton
- `showIcon` - Afficher l'icône
- `label` - Texte du bouton

**Formats supportés:**
- `excel` - Excel (.xlsx)
- `csv` - CSV (.csv)
- `pdf` - PDF (.pdf)
- `json` - JSON (.json)
- `xml` - XML (.xml)

---

### 4. ScheduleModal
Modal de configuration de planification automatique.

```tsx
import { ScheduleModal } from '@/components/common';

<ScheduleModal
  open={showModal}
  onOpenChange={setShowModal}
  type="export"
  module="Comptabilité"
  onSave={(config) => {
    console.log('Schedule:', config);
  }}
/>
```

**Props:**
- `open` - État d'ouverture du modal (requis)
- `onOpenChange` - Callback pour changer l'état (requis)
- `type` - Type de planification (`import` | `export` | `backup`)
- `module` - Nom du module
- `onSave` - Callback appelé lors de la sauvegarde
- `initialConfig` - Configuration initiale

**ScheduleConfig:**
```typescript
{
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string; // Format HH:MM
  dayOfWeek?: number; // 0-6 pour weekly
  dayOfMonth?: number; // 1-31 pour monthly
  active: boolean;
  notification: boolean;
  format?: string; // Pour exports
}
```

---

### 5. ActionButtons
Composant pour afficher des boutons d'action dans les tableaux.

```tsx
import { ActionButtons } from '@/components/common';

<ActionButtons
  actions={[
    { type: 'download', onClick: () => download() },
    { type: 'edit', onClick: () => edit() },
    { type: 'delete', onClick: () => remove() }
  ]}
  size="sm"
  variant="ghost"
/>
```

**Types d'actions disponibles:**
- `download` - Télécharger
- `upload` - Uploader
- `refresh` - Rafraîchir/Réessayer
- `play` - Lancer
- `pause` - Mettre en pause
- `settings` - Paramètres
- `delete` - Supprimer
- `view` - Voir
- `edit` - Modifier
- `copy` - Copier
- `validate` - Valider
- `report` - Voir le rapport
- `more` - Plus d'options

**Composants spécifiques:**
```tsx
import { DownloadButton, UploadButton, SettingsButton } from '@/components/common';

<DownloadButton onClick={() => download()} />
<UploadButton onClick={() => upload()} />
<SettingsButton onClick={() => openSettings()} />
```

---

### 6. MappingModal
Modal de configuration du mapping de champs.

```tsx
import { MappingModal } from '@/components/common';

<MappingModal
  open={showModal}
  onOpenChange={setShowModal}
  dataType="customers"
  sourceFields={['customer_id', 'name', 'email']}
  targetFields={['Code', 'Nom', 'Email']}
  onSave={(config) => {
    console.log('Mapping:', config);
  }}
/>
```

**Props:**
- `open` - État d'ouverture du modal (requis)
- `onOpenChange` - Callback pour changer l'état (requis)
- `dataType` - Type de données (défaut: `customers`)
- `sourceFields` - Liste des champs sources
- `targetFields` - Liste des champs cibles
- `onSave` - Callback appelé lors de la sauvegarde
- `initialConfig` - Configuration initiale

---

## Exemples d'Utilisation

### Exemple 1: Page d'import simple

```tsx
import { ImportButton, FileUpload } from '@/components/common';

function MyImportPage() {
  return (
    <div>
      <FileUpload
        onFilesSelect={(files) => console.log(files)}
      />
      <ImportButton
        module="Clients"
        onImport={(files, options) => {
          // Logique d'import
        }}
      />
    </div>
  );
}
```

### Exemple 2: Tableau avec actions

```tsx
import { ActionButtons } from '@/components/common';

function MyTable() {
  const handleDownload = (id: string) => {
    // Logique de téléchargement
  };

  return (
    <table>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>
              <ActionButtons
                actions={[
                  { type: 'download', onClick: () => handleDownload(row.id) },
                  { type: 'edit', onClick: () => edit(row.id) },
                  { type: 'delete', onClick: () => remove(row.id) }
                ]}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Exemple 3: Export avec planification

```tsx
import { ExportButton, ScheduleModal } from '@/components/common';

function MyExportPage() {
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div>
      <ExportButton module="Comptabilité" />
      <Button onClick={() => setShowSchedule(true)}>
        Planifier
      </Button>

      <ScheduleModal
        open={showSchedule}
        onOpenChange={setShowSchedule}
        type="export"
        module="Comptabilité"
        onSave={(config) => {
          console.log('Planification créée:', config);
        }}
      />
    </div>
  );
}
```

---

## Personnalisation

Tous les composants acceptent une prop `className` pour ajouter des styles personnalisés :

```tsx
<ImportButton
  module="Clients"
  className="my-custom-class bg-blue-500"
/>
```

---

## Types TypeScript

Tous les types sont exportés depuis `@/components/common`:

```tsx
import type {
  ExportFormat,
  ExportOptions,
  ImportOptions,
  ScheduleConfig,
  ActionButton,
  FieldMapping,
  MappingConfig
} from '@/components/common';
```

---

## Notes

- Tous les composants utilisent `react-hot-toast` pour les notifications
- Les modals utilisent le composant `Dialog` de `@/components/ui/dialog`
- Les composants sont entièrement typés avec TypeScript
- Tous les composants sont responsives et accessibles
