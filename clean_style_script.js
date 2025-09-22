#!/usr/bin/env node

/**
 * Script pour nettoyer et épurer le style de tous les dashboards WiseBook
 * Applique un style minimaliste et cohérent
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanTransformations = [
  // 1. Supprimer les styles inline problématiques
  {
    pattern: /style=\{[^}]*\}/g,
    replacement: ''
  },
  
  // 2. Remplacer les gros paddings par des plus petits
  {
    pattern: /p-8/g,
    replacement: 'p-6'
  },
  {
    pattern: /px-8/g,
    replacement: 'px-6'
  },
  {
    pattern: /py-8/g,
    replacement: 'py-6'
  },
  
  // 3. Réduire les espacements
  {
    pattern: /space-y-12/g,
    replacement: 'space-y-8'
  },
  {
    pattern: /gap-8/g,
    replacement: 'gap-6'
  },
  
  // 4. Simplifier les border radius
  {
    pattern: /rounded-3xl/g,
    replacement: 'rounded-xl'
  },
  
  // 5. Réduire les ombres
  {
    pattern: /shadow-2xl/g,
    replacement: 'shadow-md'
  },
  {
    pattern: /shadow-xl/g,
    replacement: 'shadow-sm'
  },
  
  // 6. Simplifier les gradients
  {
    pattern: /bg-gradient-to-br from-[^"']* to-[^"']*/g,
    replacement: 'bg-white/90'
  },
  
  // 7. Standardiser les transitions
  {
    pattern: /duration-500/g,
    replacement: 'duration-300'
  },
  
  // 8. Réduire la taille des textes de titre
  {
    pattern: /text-4xl/g,
    replacement: 'text-2xl'
  },
  {
    pattern: /text-3xl/g,
    replacement: 'text-xl'
  }
];

const dashboardFiles = [
  'src/pages/DashboardPage.tsx',
  'src/pages/accounting/AccountingDashboard.tsx',
  'src/pages/budgeting/BudgetingDashboard.tsx',
  'src/pages/treasury/TreasuryDashboard.tsx',
  'src/pages/assets/AssetsDashboard.tsx',
  'src/pages/security/SecurityDashboard.tsx',
  'src/pages/analytics/AnalyticsDashboard.tsx',
  'src/pages/taxation/TaxationDashboard.tsx',
  'src/pages/third-party/ThirdPartyDashboard.tsx',
  'src/pages/reporting/ReportingDashboard.tsx'
];

async function cleanDashboard(filePath) {
  try {
    console.log(`🧹 Nettoyage de ${filePath}...`);
    
    const fullPath = path.join(__dirname, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');
    
    // Appliquer les transformations de nettoyage
    cleanTransformations.forEach((transform, index) => {
      const before = content;
      content = content.replace(transform.pattern, transform.replacement);
      if (content !== before) {
        console.log(`  ✅ Nettoyage ${index + 1} appliqué`);
      }
    });
    
    // Sauvegarder le fichier nettoyé
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`  ✨ ${filePath} nettoyé avec succès !`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`  ⚠️  ${filePath} n'existe pas, ignoré`);
    } else {
      console.error(`  ❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    }
  }
}

async function cleanAllDashboards() {
  console.log('🧼 Démarrage du nettoyage des dashboards WiseBook');
  console.log('🎯 Objectif: Style épuré, minimaliste et cohérent\n');
  
  for (const filePath of dashboardFiles) {
    await cleanDashboard(filePath);
    console.log(''); // Ligne vide pour la lisibilité
  }
  
  console.log('🎉 Nettoyage terminé !');
  console.log('✨ Style épuré et minimaliste appliqué partout');
}

// Exécuter le script
cleanAllDashboards().catch(console.error);