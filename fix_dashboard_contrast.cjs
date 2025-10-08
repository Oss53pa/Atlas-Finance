const fs = require('fs');
const path = require('path');

// Liste des fichiers à corriger
const dashboardFiles = [
  'frontend/src/pages/third-party/ThirdPartyDashboard.tsx',
  'frontend/src/pages/security/SecurityDashboard.tsx',
  'frontend/src/pages/reporting/ReportingDashboard.tsx',
  'frontend/src/pages/taxation/TaxationDashboard.tsx',
  'frontend/src/pages/budgeting/BudgetingDashboard.tsx',
  'frontend/src/pages/analytics/AnalyticsDashboard.tsx',
  'frontend/src/pages/assets/AssetsDashboard.tsx'
];

// Remplacements à effectuer
const replacements = [
  // Fond principal
  {
    pattern: /style={{backgroundColor:\s*['"]#F7F3E9['"],\s*minHeight:\s*['"]100vh['"],\s*padding:\s*['"]24px['"]}}/g,
    replacement: 'className="min-h-screen bg-slate-100 p-6"'
  },
  // Header gradient
  {
    pattern: /style={{background:\s*['"]linear-gradient\(135deg,\s*#363636\s*0%,\s*#6C757D\s*100%\)['"],\s*borderRadius:\s*['"]12px['"],\s*padding:\s*['"]32px['"],\s*marginBottom:\s*['"]32px['"]}}/g,
    replacement: 'className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 mb-8 shadow-lg"'
  },
  // Fond de chargement
  {
    pattern: /style={{display:\s*['"]flex['"],\s*justifyContent:\s*['"]center['"],\s*alignItems:\s*['"]center['"],\s*minHeight:\s*['"]100vh['"],\s*backgroundColor:\s*['"]#F7F3E9['"]}}/g,
    replacement: 'className="flex justify-center items-center min-h-screen bg-slate-100"'
  },
  // Cartes basiques avec fond blanc
  {
    pattern: /style={{backgroundColor:\s*['"]#FFFFFF['"],/g,
    replacement: 'className="bg-white shadow-md" style={{'
  },
  // Cartes avec border radius
  {
    pattern: /style={{backgroundColor:\s*['"]white['"],\s*borderRadius:\s*['"]12px['"],/g,
    replacement: 'className="bg-white rounded-xl shadow-md" style={{'
  }
];

// Fonction pour corriger un fichier
function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ pattern, replacement }) => {
    const originalContent = content;
    content = content.replace(pattern, replacement);
    if (content !== originalContent) {
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`ℹ️  Pas de changement: ${filePath}`);
  }
}

// Corriger tous les fichiers
console.log('🔧 Correction du contraste des dashboards...\n');
dashboardFiles.forEach(fixFile);
console.log('\n✨ Terminé!');