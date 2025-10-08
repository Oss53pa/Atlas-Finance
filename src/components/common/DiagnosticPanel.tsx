import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button, Card, CardContent } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

/**
 * Panneau de diagnostic pour déboguer les problèmes de modals
 */
export const DiagnosticPanel: React.FC = () => {
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);

  const runDiagnostics = () => {
    const results: string[] = [];

    // Test 1: React est chargé
    results.push(typeof React !== 'undefined' ? '✅ React chargé' : '❌ React non chargé');

    // Test 2: Z-index
    const highZElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const z = window.getComputedStyle(el).zIndex;
        return z !== 'auto' && parseInt(z) > 1000;
      });
    results.push(`✅ ${highZElements.length} éléments avec z-index > 1000`);

    // Test 3: Modals dans le DOM
    const modals = document.querySelectorAll('[role="dialog"]');
    results.push(`${modals.length > 0 ? '✅' : 'ℹ️'} ${modals.length} modal(s) dans le DOM`);

    // Test 4: Backdrop
    const backdrops = document.querySelectorAll('.bg-black.bg-opacity-50');
    results.push(`${backdrops.length > 0 ? '✅' : 'ℹ️'} ${backdrops.length} backdrop(s) trouvé(s)`);

    // Test 5: Boutons cliquables
    const buttons = document.querySelectorAll('button');
    const clickableButtons = Array.from(buttons).filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.pointerEvents !== 'none';
    });
    results.push(`✅ ${clickableButtons.length}/${buttons.length} boutons cliquables`);

    // Test 6: Erreurs dans la console
    results.push('ℹ️ Vérifiez la console pour les erreurs JavaScript');

    setDiagnostics(results);
  };

  const testModal = () => {
    console.log('🧪 Test Modal - État avant:', testModalOpen);
    setTestModalOpen(true);
    console.log('🧪 Test Modal - setTestModalOpen(true) appelé');

    setTimeout(() => {
      console.log('🧪 Test Modal - État après:', testModalOpen);
      const modalInDOM = document.querySelector('[role="dialog"]');
      console.log('🧪 Modal dans DOM:', !!modalInDOM);
      if (!modalInDOM) {
        alert('❌ Le modal ne s\'affiche pas dans le DOM!\nVérifiez la console pour plus de détails.');
      }
    }, 100);
  };

  const checkZIndex = () => {
    const allElements = Array.from(document.querySelectorAll('*'))
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        z: window.getComputedStyle(el).zIndex
      }))
      .filter(item => item.z !== 'auto')
      .sort((a, b) => parseInt(b.z) - parseInt(a.z))
      .slice(0, 10);

    console.table(allElements);
    alert('Top 10 z-indexes affichés dans la console');
  };

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardContent className="pt-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
          Panneau de Diagnostic
        </h3>

        <div className="space-y-3">
          <Button onClick={runDiagnostics} variant="outline" className="w-full">
            🔍 Exécuter les diagnostics
          </Button>

          <Button onClick={testModal} variant="outline" className="w-full">
            🧪 Tester un modal
          </Button>

          <Button onClick={checkZIndex} variant="outline" className="w-full">
            📊 Vérifier les z-index
          </Button>

          <Button
            onClick={() => {
              console.log('📋 État de tous les éléments avec z-index:');
              document.querySelectorAll('[class*="z-"]').forEach(el => {
                console.log({
                  element: el,
                  computed: window.getComputedStyle(el).zIndex,
                  class: el.className
                });
              });
            }}
            variant="outline"
            className="w-full"
          >
            🔬 Inspecter les z-index (console)
          </Button>
        </div>

        {diagnostics.length > 0 && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium mb-2 flex items-center">
              <Info className="mr-2 h-4 w-4" />
              Résultats:
            </h4>
            <ul className="space-y-1 text-sm">
              {diagnostics.map((diag, i) => (
                <li key={i} className="font-mono">{diag}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium mb-2">💡 Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Cliquez sur "Exécuter les diagnostics"</li>
            <li>Cliquez sur "Tester un modal"</li>
            <li>Si le modal ne s'ouvre pas, vérifiez la console</li>
            <li>Utilisez F12 pour ouvrir les DevTools</li>
          </ol>
        </div>
      </CardContent>

      {/* Modal de test */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              ✅ Le Modal Fonctionne !
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-green-700 font-medium">
              Si vous voyez ce message, les modals fonctionnent correctement !
            </p>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
              <p className="font-medium mb-2">État du modal:</p>
              <ul className="space-y-1">
                <li>✅ Le modal s'est ouvert</li>
                <li>✅ Le backdrop est visible</li>
                <li>✅ Le z-index est correct</li>
                <li>✅ Le contenu est affiché</li>
              </ul>
            </div>
            <Button onClick={() => setTestModalOpen(false)} className="w-full">
              Fermer le modal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
