/**
 * StockModuleGate — enveloppe les écrans du module Stock.
 * Si le module n'est pas activé pour le tenant (« muet sans classe 3 »), affiche
 * un écran d'activation au lieu du contenu — jamais d'erreur, jamais d'écran vide subi.
 */
import React from 'react';
import { Boxes, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStockModule } from './useStockModule';

export default function StockModuleGate({ children }: { children: React.ReactNode }) {
  const { enabled, loading, working, activate } = useStockModule();

  if (loading || enabled === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement du module Stock…</span>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#235A6E]/10 text-[#235A6E] flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestion des stocks — non activée</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ce module gère les articles, magasins, mouvements et la valorisation (SYSCOHADA classe 3).
            Il reste masqué pour les entreprises qui ne tiennent pas de stock. Activez‑le pour
            initialiser le catalogue des mouvements, la détermination comptable et un magasin par défaut.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left text-xs text-blue-800 mb-6 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            L'activation ne crée aucune écriture comptable. Les postings au grand livre n'ont lieu
            qu'aux mouvements de stock réels, et respectent le verrou de clôture.
          </div>
          <button
            onClick={async () => {
              try {
                await activate();
                toast.success('Module Stock activé');
                // Le menu latéral vérifie isStockModuleEnabled une seule fois au
                // montage (état local, non réactif à cette activation) : recharger
                // pour que l'entrée « Stocks » apparaisse immédiatement partout.
                setTimeout(() => window.location.reload(), 600);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Échec de l\'activation');
              }
            }}
            disabled={working}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50 text-sm font-medium"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
            Activer la gestion des stocks
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
