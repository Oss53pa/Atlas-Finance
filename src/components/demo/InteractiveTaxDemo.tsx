
/**
 * Démo interactive : Déclaration TVA automatique
 * Simule le calcul automatique de la TVA depuis les écritures
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, FileText, Calculator, AlertTriangle, Download } from 'lucide-react';

const TVA_ENTRIES = [
  { date: '2026-03-02', ref: 'VE-001', label: 'Vente marchandises Client ABC', ht: 2500000, tva: 450000, type: 'collectee' },
  { date: '2026-03-05', ref: 'VE-002', label: 'Prestation conseil TechCorp', ht: 1800000, tva: 324000, type: 'collectee' },
  { date: '2026-03-08', ref: 'AC-001', label: 'Achat matières premières FournX', ht: 1200000, tva: 216000, type: 'deductible' },
  { date: '2026-03-10', ref: 'VE-003', label: 'Vente produits finis Delta SA', ht: 3200000, tva: 576000, type: 'collectee' },
  { date: '2026-03-12', ref: 'AC-002', label: 'Fournitures de bureau Papeterie+', ht: 350000, tva: 63000, type: 'deductible' },
  { date: '2026-03-15', ref: 'AC-003', label: 'Location matériel informatique', ht: 800000, tva: 144000, type: 'deductible' },
  { date: '2026-03-18', ref: 'VE-004', label: 'Vente marchandises Client Omega', ht: 1500000, tva: 270000, type: 'collectee' },
  { date: '2026-03-22', ref: 'AC-004', label: 'Maintenance équipement', ht: 450000, tva: 81000, type: 'deductible' },
  { date: '2026-03-25', ref: 'VE-005', label: 'Services consulting Alpha Group', ht: 2800000, tva: 504000, type: 'collectee' },
  { date: '2026-03-28', ref: 'AC-005', label: 'Carburant et transport', ht: 280000, tva: 50400, type: 'deductible' },
];

const InteractiveTaxDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0); // 0=idle, 1=scanning, 2=calculating, 3=done
  const [scannedCount, setScannedCount] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const collectee = TVA_ENTRIES.filter(e => e.type === 'collectee').reduce((s, e) => s + e.tva, 0);
  const deductible = TVA_ENTRIES.filter(e => e.type === 'deductible').reduce((s, e) => s + e.tva, 0);
  const aPayer = collectee - deductible;

  const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';

  const startCalculation = () => {
    setStep(1);
    setScannedCount(0);
    const interval = setInterval(() => {
      setScannedCount(prev => {
        if (prev >= TVA_ENTRIES.length) {
          clearInterval(interval);
          setStep(2);
          setTimeout(() => setStep(3), 1200);
          return prev;
        }
        return prev + 1;
      });
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <span className="text-blue-600 text-lg">💡</span>
        <div className="text-sm text-blue-800">
          <strong>Démo interactive</strong> — Cliquez sur "Lancer le calcul" pour voir le moteur fiscal analyser les écritures et calculer la TVA automatiquement.
        </div>
      </div>

      {/* Period */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div>
          <p className="text-sm font-semibold text-[#141414]">Déclaration TVA — Mars 2026</p>
          <p className="text-xs text-gray-500">Régime réel — Déclaration mensuelle — Côte d'Ivoire</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-orange-600">
          <Clock className="w-4 h-4" /> Échéance : 15 avril 2026
        </div>
      </div>

      {step === 0 && (
        <div className="text-center py-8">
          <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-[#141414] mb-2">Calcul automatique de la TVA</h4>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Le moteur va analyser toutes les écritures comptables de mars 2026 sur les comptes 443x (TVA collectée) et 445x (TVA déductible).
          </p>
          <button onClick={startCalculation} className="px-8 py-3 bg-[#141414] text-white rounded-lg font-semibold hover:bg-[#2a2a2a] transition-colors">
            Lancer le calcul
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#141414]">Analyse des écritures en cours...</span>
            <span className="text-sm text-gray-500">{scannedCount} / {TVA_ENTRIES.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[#141414] h-2 rounded-full transition-all duration-300" style={{ width: `${(scannedCount / TVA_ENTRIES.length) * 100}%` }}></div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {TVA_ENTRIES.slice(0, scannedCount).map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 animate-fadeIn">
                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                <span className="font-mono text-gray-400">{e.ref}</span>
                <span>{e.label}</span>
                <span className={`ml-auto font-mono ${e.type === 'collectee' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {e.type === 'collectee' ? '+' : '-'}{fmt(e.tva)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="text-center py-8">
          <div className="animate-spin w-10 h-10 border-3 border-[#141414] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Calcul de la TVA nette à décaisser...</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/* Results */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 font-medium">TVA Collectée</p>
              <p className="text-xl font-bold text-blue-800">{fmt(collectee)}</p>
              <p className="text-xs text-blue-500 mt-1">{TVA_ENTRIES.filter(e => e.type === 'collectee').length} factures</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-xs text-orange-600 font-medium">TVA Déductible</p>
              <p className="text-xl font-bold text-orange-800">{fmt(deductible)}</p>
              <p className="text-xs text-orange-500 mt-1">{TVA_ENTRIES.filter(e => e.type === 'deductible').length} factures</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
              <p className="text-xs text-green-600 font-medium">TVA à Payer</p>
              <p className="text-xl font-bold text-green-800">{fmt(aPayer)}</p>
              <p className="text-xs text-green-500 mt-1">Collectée - Déductible</p>
            </div>
          </div>

          {/* Detail toggle */}
          <button onClick={() => setShowDetail(!showDetail)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            {showDetail ? 'Masquer le détail' : 'Voir le détail des écritures'} →
          </button>

          {showDetail && (
            <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Réf</th>
                    <th className="text-left p-2">Libellé</th>
                    <th className="text-right p-2">HT</th>
                    <th className="text-right p-2">TVA 18%</th>
                    <th className="text-center p-2">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {TVA_ENTRIES.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 font-mono text-gray-500">{e.date}</td>
                      <td className="p-2 font-mono">{e.ref}</td>
                      <td className="p-2 text-gray-700">{e.label}</td>
                      <td className="p-2 text-right font-mono">{fmt(e.ht)}</td>
                      <td className="p-2 text-right font-mono font-semibold">{fmt(e.tva)}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${e.type === 'collectee' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {e.type === 'collectee' ? 'Collectée' : 'Déductible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Générer la déclaration
            </button>
            <button className="px-4 py-2.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveTaxDemo;
