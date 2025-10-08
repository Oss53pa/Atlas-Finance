/**
 * Script de vérification des boutons dans BackupPage.tsx
 * Exécuter avec: node verifier_boutons.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'settings', 'BackupPage.tsx');

console.log('🔍 Vérification des boutons dans BackupPage.tsx\n');

try {
  const content = fs.readFileSync(filePath, 'utf8');

  // Vérifications
  const checks = {
    'Nouvelle Planification': {
      state: /const \[showNewScheduleModal, setShowNewScheduleModal\]/.test(content),
      button: /onClick=\{.*setShowNewScheduleModal\(true\)/.test(content),
      modal: /<Dialog open=\{showNewScheduleModal\}/.test(content)
    },
    'Icône Réglage': {
      state: /const \[showScheduleConfigModal, setShowScheduleConfigModal\]/.test(content),
      button: /onClick=\{.*setShowScheduleConfigModal\(schedule\)/.test(content),
      modal: /<Dialog open=\{!!showScheduleConfigModal\}/.test(content)
    },
    'Lancer Restauration': {
      state: /const \[showRestoreModal, setShowRestoreModal\]/.test(content),
      button: /onClick=\{.*setShowRestoreModal\(true\)/.test(content),
      modal: /<Dialog open=\{showRestoreModal\}/.test(content)
    },
    'Icône Clé': {
      state: /const \[showKeyGenerator, setShowKeyGenerator\]/.test(content),
      button: /onClick=\{.*setShowKeyGenerator\(true\)/.test(content),
      modal: /<Dialog open=\{showKeyGenerator\}/.test(content)
    },
    'Icône Dossier': {
      state: /const \[showFolderPicker, setShowFolderPicker\]/.test(content),
      button: /onClick=\{.*setShowFolderPicker\(true\)/.test(content),
      modal: /<Dialog open=\{showFolderPicker\}/.test(content)
    },
    'Tester Connexion': {
      state: /const \[showCloudTestModal, setShowCloudTestModal\]/.test(content),
      handler: /const handleTestCloudConnection/.test(content),
      button: /onClick=\{handleTestCloudConnection\}/.test(content),
      modal: /<Dialog open=\{showCloudTestModal\}/.test(content)
    }
  };

  // Afficher les résultats
  let allGood = true;

  for (const [name, tests] of Object.entries(checks)) {
    console.log(`\n📌 ${name}:`);

    for (const [test, result] of Object.entries(tests)) {
      const icon = result ? '✅' : '❌';
      console.log(`  ${icon} ${test}: ${result ? 'OK' : 'MANQUANT'}`);
      if (!result) allGood = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allGood) {
    console.log('✅ TOUS LES BOUTONS SONT CORRECTEMENT CONFIGURÉS');
  } else {
    console.log('❌ CERTAINS BOUTONS ONT DES PROBLÈMES');
  }

  // Vérifier l'import de Dialog
  const dialogImport = /import.*Dialog.*from.*dialog/.test(content);
  console.log(`\n📦 Import Dialog: ${dialogImport ? '✅' : '❌'}`);

  // Compter le nombre de modals
  const modalCount = (content.match(/<Dialog/g) || []).length;
  console.log(`📊 Nombre de modals trouvés: ${modalCount}`);

  // Vérifier le z-index dans dialog.tsx
  const dialogPath = path.join(__dirname, 'frontend', 'src', 'components', 'ui', 'dialog.tsx');
  const dialogContent = fs.readFileSync(dialogPath, 'utf8');
  const hasHighZIndex = /z-\[9999\]/.test(dialogContent);
  console.log(`🎨 Z-index élevé dans Dialog: ${hasHighZIndex ? '✅' : '❌'}`);

  console.log('\n' + '='.repeat(50));
  console.log('\n💡 RECOMMANDATIONS:');

  if (!allGood) {
    console.log('- Vérifiez que tous les handlers sont bien définis');
    console.log('- Vérifiez que les états sont bien initialisés');
    console.log('- Vérifiez que les modals utilisent les bons états');
  }

  if (!hasHighZIndex) {
    console.log('- Le z-index du Dialog devrait être élevé (z-[9999])');
  }

  console.log('\n📝 Pour tester en direct:');
  console.log('1. Accédez à /settings/backup dans votre navigateur');
  console.log('2. Ouvrez la console (F12)');
  console.log('3. Cliquez sur chaque bouton');
  console.log('4. Vérifiez qu\'un modal s\'ouvre');
  console.log('\n');

} catch (error) {
  console.error('❌ Erreur:', error.message);
}
