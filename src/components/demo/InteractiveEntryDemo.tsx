
/**
 * Démo interactive : Saisie d'écriture comptable SYSCOHADA
 * Simule la création d'une écriture multi-lignes avec contrôle D=C
 */
import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Plus, Trash2, X } from 'lucide-react';

const ACCOUNTS = [
  { code: '601100', label: 'Achats de marchandises' },
  { code: '401100', label: 'Fournisseurs' },
  { code: '411100', label: 'Clients' },
  { code: '701000', label: 'Ventes de marchandises' },
  { code: '443100', label: 'TVA collectée 18%' },
  { code: '445100', label: 'TVA déductible 18%' },
  { code: '521100', label: 'Banque SGBCI' },
  { code: '571000', label: 'Caisse' },
  { code: '661000', label: 'Charges de personnel' },
  { code: '421000', label: 'Personnel — rémunérations dues' },
];

const JOURNALS = [
  { code: 'AC', label: 'Journal des Achats' },
  { code: 'VE', label: 'Journal des Ventes' },
  { code: 'BQ', label: 'Journal de Banque' },
  { code: 'CA', label: 'Journal de Caisse' },
  { code: 'OD', label: 'Opérations Diverses' },
];

interface Line { id: number; account: string; label: string; debit: number; credit: number; }

const InteractiveEntryDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [journal, setJournal] = useState('AC');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ref, setRef] = useState('FA-2026-0042');
  const [lines, setLines] = useState<Line[]>([
    { id: 1, account: '601100', label: 'Achat fournitures bureau', debit: 500000, credit: 0 },
    { id: 2, account: '445100', label: 'TVA déductible 18%', debit: 90000, credit: 0 },
    { id: 3, account: '401100', label: 'Fournisseur Papeterie Plus', debit: 0, credit: 0 },
  ]);
  const [step, setStep] = useState<'edit' | 'validated' | 'posted'>('edit');
  const [showSuccess, setShowSuccess] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const diff = totalDebit - totalCredit;

  const addLine = () => setLines(prev => [...prev, { id: Date.now(), account: '', label: '', debit: 0, credit: 0 }]);
  const removeLine = (id: number) => setLines(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: number, field: string, value: any) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: field === 'debit' || field === 'credit' ? Number(value) || 0 : value } : l));
  };

  const autoBalance = () => {
    if (diff > 0) {
      // Need more credit — put on last empty credit line
      const emptyLine = lines.find(l => l.credit === 0 && l.debit === 0) || lines[lines.length - 1];
      updateLine(emptyLine.id, 'credit', diff);
    } else if (diff < 0) {
      const emptyLine = lines.find(l => l.debit === 0 && l.credit === 0) || lines[lines.length - 1];
      updateLine(emptyLine.id, 'debit', Math.abs(diff));
    }
  };

  const validate = () => {
    if (!isBalanced) return;
    setStep('validated');
    setTimeout(() => {
      setStep('posted');
      setShowSuccess(true);
    }, 1500);
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <span className="text-blue-600 text-lg">💡</span>
        <div className="text-sm text-blue-800">
          <strong>Démo interactive</strong> — Modifiez les montants, ajoutez des lignes, et cliquez sur "Équilibrer" pour voir le contrôle débit = crédit en action.
        </div>
      </div>

      {/* Header fields */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Journal</label>
          <select value={journal} onChange={e => setJournal(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={step !== 'edit'}>
            {JOURNALS.map(j => <option key={j.code} value={j.code}>{j.code} — {j.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={step !== 'edit'} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">N° Pièce</label>
          <input value={ref} onChange={e => setRef(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={step !== 'edit'} />
        </div>
      </div>

      {/* Lines table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 font-medium text-gray-600 w-40">Compte</th>
              <th className="text-left p-2 font-medium text-gray-600">Libellé</th>
              <th className="text-right p-2 font-medium text-gray-600 w-32">Débit</th>
              <th className="text-right p-2 font-medium text-gray-600 w-32">Crédit</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => (
              <tr key={line.id} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  <select value={line.account} onChange={e => updateLine(line.id, 'account', e.target.value)} className="w-full border rounded px-2 py-1 text-xs" disabled={step !== 'edit'}>
                    <option value="">Sélectionner</option>
                    {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.code} — {a.label}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input value={line.label} onChange={e => updateLine(line.id, 'label', e.target.value)} className="w-full border rounded px-2 py-1 text-xs" placeholder="Libellé..." disabled={step !== 'edit'} />
                </td>
                <td className="p-2">
                  <input type="number" value={line.debit || ''} onChange={e => updateLine(line.id, 'debit', e.target.value)} className="w-full border rounded px-2 py-1 text-xs text-right" placeholder="0" disabled={step !== 'edit'} />
                </td>
                <td className="p-2">
                  <input type="number" value={line.credit || ''} onChange={e => updateLine(line.id, 'credit', e.target.value)} className="w-full border rounded px-2 py-1 text-xs text-right" placeholder="0" disabled={step !== 'edit'} />
                </td>
                <td className="p-2">
                  {step === 'edit' && lines.length > 2 && (
                    <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-gray-50 font-semibold">
              <td colSpan={2} className="p-2 text-right text-gray-600">TOTAUX</td>
              <td className="p-2 text-right text-blue-700">{fmt(totalDebit)}</td>
              <td className="p-2 text-right text-green-700">{fmt(totalCredit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance indicator */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-800">Écriture équilibrée ✓</span></>
          ) : (
            <><AlertTriangle className="w-5 h-5 text-red-600" /><span className="text-sm font-medium text-red-800">Écart : {fmt(Math.abs(diff))} FCFA ({diff > 0 ? 'excédent débit' : 'excédent crédit'})</span></>
          )}
        </div>
        {step === 'edit' && !isBalanced && (
          <button onClick={autoBalance} className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium hover:bg-gray-50">
            Équilibrer automatiquement
          </button>
        )}
      </div>

      {/* Actions */}
      {step === 'edit' && (
        <div className="flex items-center justify-between">
          <button onClick={addLine} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <Plus className="w-4 h-4" /> Ajouter une ligne
          </button>
          <button onClick={validate} disabled={!isBalanced} className={`px-6 py-2 rounded-lg text-sm font-semibold text-white ${isBalanced ? 'bg-[#141414] hover:bg-[#2a2a2a]' : 'bg-gray-300 cursor-not-allowed'}`}>
            Valider l'écriture
          </button>
        </div>
      )}

      {step === 'validated' && (
        <div className="text-center py-4">
          <div className="animate-spin w-8 h-8 border-2 border-[#141414] border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Validation en cours — contrôles SYSCOHADA...</p>
        </div>
      )}

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-800 mb-1">Écriture validée avec succès !</h4>
          <p className="text-sm text-green-600">Pièce {ref} • {fmt(totalDebit)} FCFA • Journal {journal}</p>
          <div className="flex gap-2 justify-center mt-3">
            <button onClick={() => { setStep('edit'); setShowSuccess(false); setLines([{ id: 1, account: '', label: '', debit: 0, credit: 0 }, { id: 2, account: '', label: '', debit: 0, credit: 0 }]); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Nouvelle écriture
            </button>
            <button onClick={onClose} className="px-4 py-2 text-sm bg-[#141414] text-white rounded-lg hover:bg-[#2a2a2a]">
              Fermer la démo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveEntryDemo;
