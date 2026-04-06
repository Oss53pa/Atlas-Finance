
/**
 * Démo interactive : Bilan SYSCOHADA en temps réel
 * Simule un bilan avec drill-down par poste
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

const BILAN_ACTIF = [
  { code: 'AD', label: 'Charges immobilisées', montant: 1200000, detail: [
    { code: '201', label: 'Frais d\'établissement', montant: 800000 },
    { code: '202', label: 'Charges à répartir', montant: 400000 },
  ]},
  { code: 'AE', label: 'Immobilisations incorporelles', montant: 3500000, detail: [
    { code: '213', label: 'Brevets et licences', montant: 2100000 },
    { code: '215', label: 'Logiciels', montant: 1400000 },
  ]},
  { code: 'AF', label: 'Immobilisations corporelles', montant: 18700000, detail: [
    { code: '231', label: 'Bâtiments', montant: 12000000 },
    { code: '244', label: 'Matériel et outillage', montant: 3500000 },
    { code: '245', label: 'Matériel de transport', montant: 2200000 },
    { code: '246', label: 'Matériel de bureau', montant: 1000000 },
  ]},
  { code: 'AK', label: 'Stocks et en-cours', montant: 8400000, detail: [
    { code: '311', label: 'Marchandises', montant: 5200000 },
    { code: '321', label: 'Matières premières', montant: 3200000 },
  ]},
  { code: 'AL', label: 'Créances clients', montant: 12300000, detail: [
    { code: '411', label: 'Clients — entreprises', montant: 9800000 },
    { code: '416', label: 'Clients douteux', montant: 2500000 },
  ]},
  { code: 'AT', label: 'Trésorerie-Actif', montant: 6200000, detail: [
    { code: '521', label: 'Banque SGBCI', montant: 4800000 },
    { code: '571', label: 'Caisse principale', montant: 1400000 },
  ]},
];

const BILAN_PASSIF = [
  { code: 'CA', label: 'Capital social', montant: 15000000, detail: [
    { code: '101', label: 'Capital souscrit', montant: 15000000 },
  ]},
  { code: 'CB', label: 'Réserves', montant: 8200000, detail: [
    { code: '111', label: 'Réserve légale', montant: 3000000 },
    { code: '118', label: 'Autres réserves', montant: 5200000 },
  ]},
  { code: 'CD', label: 'Report à nouveau', montant: 2400000, detail: [
    { code: '121', label: 'Report à nouveau (solde créditeur)', montant: 2400000 },
  ]},
  { code: 'CF', label: 'Résultat net de l\'exercice', montant: 4700000, detail: [
    { code: '131', label: 'Résultat net (bénéfice)', montant: 4700000 },
  ]},
  { code: 'DA', label: 'Emprunts', montant: 8500000, detail: [
    { code: '162', label: 'Emprunts bancaires', montant: 6500000 },
    { code: '164', label: 'Dettes de crédit-bail', montant: 2000000 },
  ]},
  { code: 'DB', label: 'Dettes fournisseurs', montant: 9200000, detail: [
    { code: '401', label: 'Fournisseurs locaux', montant: 6300000 },
    { code: '408', label: 'Fournisseurs — factures non parvenues', montant: 2900000 },
  ]},
  { code: 'DC', label: 'Dettes fiscales et sociales', montant: 2300000, detail: [
    { code: '421', label: 'Personnel — rémunérations', montant: 800000 },
    { code: '443', label: 'TVA à reverser', montant: 1500000 },
  ]},
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

const BilanSection: React.FC<{ title: string; items: typeof BILAN_ACTIF; color: string }> = ({ title, items, color }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const total = items.reduce((s, i) => s + i.montant, 0);

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className={`px-4 py-3 font-bold text-white text-sm flex justify-between items-center`} style={{ backgroundColor: color }}>
        <span>{title}</span>
        <span>{fmt(total)}</span>
      </div>
      <div className="divide-y">
        {items.map(item => (
          <div key={item.code}>
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [item.code]: !prev[item.code] }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                {expanded[item.code] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="text-xs text-gray-400 font-mono">{item.code}</span>
                <span className="text-sm text-gray-800">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 font-mono">{fmt(item.montant)}</span>
            </button>
            {expanded[item.code] && (
              <div className="bg-gray-50 px-4 pb-2">
                {item.detail.map(d => (
                  <div key={d.code} className="flex justify-between py-1.5 pl-8 text-xs text-gray-600">
                    <span><span className="font-mono text-gray-400">{d.code}</span> — {d.label}</span>
                    <span className="font-mono">{fmt(d.montant)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const InteractiveBilanDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const totalActif = BILAN_ACTIF.reduce((s, i) => s + i.montant, 0);
  const totalPassif = BILAN_PASSIF.reduce((s, i) => s + i.montant, 0);
  const isBalanced = totalActif === totalPassif;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <span className="text-blue-600 text-lg">💡</span>
        <div className="text-sm text-blue-800">
          <strong>Démo interactive</strong> — Cliquez sur chaque poste pour voir le détail des sous-comptes. Le bilan est calculé en temps réel depuis les écritures comptables.
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Actif</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalActif)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Passif</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalPassif)}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500">Équilibre</p>
          <p className={`text-lg font-bold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>{isBalanced ? '✓ Équilibré' : 'Écart'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BilanSection title="ACTIF" items={BILAN_ACTIF} color="#1e40af" />
        <BilanSection title="PASSIF" items={BILAN_PASSIF} color="#166534" />
      </div>
    </div>
  );
};

export default InteractiveBilanDemo;
