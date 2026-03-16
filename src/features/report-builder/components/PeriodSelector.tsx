/**
 * PeriodSelector — Dropdown for selecting report period
 * CDC §11 — Project colors: neutral-*
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import type { PeriodType, PeriodSelection } from '../types';

const currentYear = new Date().getFullYear();

const periodTypes: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'annual', label: 'Annuel' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Personnalisé' },
];

const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface Props { onClose: () => void }

const PeriodSelector: React.FC<Props> = ({ onClose }) => {
  const { document: doc, setPeriod } = useReportBuilderStore();
  const [type, setType] = useState<PeriodType>(doc?.period.type || 'monthly');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3));

  const handleApply = () => {
    let period: PeriodSelection;
    switch (type) {
      case 'monthly': {
        const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        period = { type, startDate: start, endDate: end, label: `${months[month]} ${year}` };
        break;
      }
      case 'quarterly': {
        const startMonth = quarter * 3;
        const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`;
        const end = new Date(year, startMonth + 3, 0).toISOString().split('T')[0];
        period = { type, startDate: start, endDate: end, label: `T${quarter + 1} ${year}` };
        break;
      }
      case 'annual':
        period = { type, startDate: `${year}-01-01`, endDate: `${year}-12-31`, label: `Exercice ${year}` };
        break;
      case 'ytd': {
        const endDate = new Date().toISOString().split('T')[0];
        period = { type, startDate: `${year}-01-01`, endDate, label: `YTD ${year}`, includeYTD: true };
        break;
      }
      default:
        period = { type: 'annual', startDate: `${year}-01-01`, endDate: `${year}-12-31`, label: `Exercice ${year}` };
    }
    setPeriod(period);
    onClose();
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-neutral-200 p-4 w-[300px]" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-neutral-800">Période du Rapport</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-neutral-500 mb-1 block">Type</label>
        <div className="flex flex-wrap gap-1">
          {periodTypes.map(pt => (
            <button
              key={pt.value}
              onClick={() => setType(pt.value)}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium ${
                type === pt.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-neutral-500 mb-1 block">Année</label>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500">
          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {type === 'monthly' && (
        <div className="mb-3">
          <label className="text-[11px] text-neutral-500 mb-1 block">Mois</label>
          <div className="grid grid-cols-4 gap-1">
            {months.map((m, i) => (
              <button
                key={i}
                onClick={() => setMonth(i)}
                className={`px-1 py-1.5 text-[10px] rounded ${
                  month === i ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'quarterly' && (
        <div className="mb-3">
          <label className="text-[11px] text-neutral-500 mb-1 block">Trimestre</label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map(q => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`py-1.5 text-xs rounded ${
                  quarter === q ? 'bg-neutral-900 text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                T{q + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleApply}
        className="w-full mt-2 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md"
      >
        Appliquer
      </button>
    </div>
  );
};

export default PeriodSelector;
