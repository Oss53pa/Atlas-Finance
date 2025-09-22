#!/usr/bin/env node

/**
 * Script pour moderniser automatiquement tous les dashboards WiseBook
 * Applique la charte graphique moderne avec les couleurs chaudes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardFiles = [
  'src/pages/treasury/TreasuryDashboard.tsx',
  'src/pages/assets/AssetsDashboard.tsx', 
  'src/pages/security/SecurityDashboard.tsx',
  'src/pages/analytics/AnalyticsDashboard.tsx',
  'src/pages/taxation/TaxationDashboard.tsx',
  'src/pages/third-party/ThirdPartyDashboard.tsx',
  'src/pages/reporting/ReportingDashboard.tsx'
];

const modernImports = `import { 
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';`;

const transformations = [
  // 1. Mise à jour des imports
  {
    pattern: /import\s*{\s*UnifiedCard[^}]*}\s*from\s*['"][^'"]*DesignSystem['"];?/g,
    replacement: modernImports
  },
  
  // 2. Background warm 
  {
    pattern: /background=["'](?:pattern|gradient|default)["']/g,
    replacement: 'background="warm"'
  },
  
  // 3. Ajout de withChart aux KPICard
  {
    pattern: /(<KPICard[^>]*delay=\{[^}]*\})/g,
    replacement: '$1\n            withChart={true}'
  },
  
  // 4. Mise à jour des couleurs des cartes
  {
    pattern: /bg-blue-50/g,
    replacement: 'bg-amber-50/90'
  },
  {
    pattern: /bg-green-50/g, 
    replacement: 'bg-green-50/90'
  },
  {
    pattern: /bg-purple-50/g,
    replacement: 'bg-orange-50/90'
  },
  {
    pattern: /rounded-2xl/g,
    replacement: 'rounded-3xl'
  },
  
  // 5. Mise à jour des borders
  {
    pattern: /border-blue-200/g,
    replacement: 'border-yellow-200/60'
  },
  {
    pattern: /border-green-200/g,
    replacement: 'border-green-200/60'
  }
];

async function modernizeDashboard(filePath) {
  try {
    console.log(`🎨 Modernisation de ${filePath}...`);
    
    const fullPath = path.join(__dirname, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');
    
    // Appliquer toutes les transformations
    transformations.forEach((transform, index) => {
      const before = content;
      content = content.replace(transform.pattern, transform.replacement);
      if (content !== before) {
        console.log(`  ✅ Transformation ${index + 1} appliquée`);
      }
    });
    
    // Sauvegarder le fichier modifié
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`  ✨ ${filePath} modernisé avec succès !`);
    
  } catch (error) {
    console.error(`  ❌ Erreur lors de la modernisation de ${filePath}:`, error.message);
  }
}

async function modernizeAllDashboards() {
  console.log('🚀 Démarrage de la modernisation des dashboards WiseBook');
  console.log('📋 Charte graphique: Couleurs chaudes, gradients, glassmorphism\n');
  
  for (const filePath of dashboardFiles) {
    try {
      const fullPath = path.join(__dirname, filePath);
      await fs.access(fullPath);
      await modernizeDashboard(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`  ⚠️  ${filePath} n'existe pas, ignoré`);
      }
    }
    console.log(''); // Ligne vide pour la lisibilité
  }
  
  console.log('🎉 Modernisation terminée !');
  console.log('🔥 Toutes les pages utilisent maintenant la charte graphique moderne');
}

// Exécuter le script
modernizeAllDashboards().catch(console.error);