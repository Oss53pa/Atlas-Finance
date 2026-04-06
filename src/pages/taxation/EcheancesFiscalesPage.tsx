// @ts-nocheck

import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Clock, AlertTriangle, CheckCircle, Bell, Filter, Download,
  Plus, Eye, Edit, DollarSign, FileText, ChevronLeft, ChevronRight,
  Calculator, Send, CreditCard, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';

// ============================================================================
// Types
// ============================================================================

type DeadlineStatus = 'en_retard' | 'a_declarer' | 'calculee' | 'declaree' | 'payee';

interface FiscalDeadline {
  id: string;
  taxCode: string;
  taxName: string;
  taxCategory: string;
  periodLabel: string;
  deadline: string; // ISO date
  status: DeadlineStatus;
  montant?: number;
  periodicite: string;
  obligatoire: boolean;
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<DeadlineStatus, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  en_retard:  { label: 'En retard',   color: 'text-red-700',    bg: 'bg-red-100',    dot: 'bg-red-500',    icon: <AlertCircle className="h-4 w-4" /> },
  a_declarer: { label: 'À déclarer',  color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500', icon: <Clock className="h-4 w-4" /> },
  calculee:   { label: 'Calculée',    color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500',   icon: <Calculator className="h-4 w-4" /> },
  declaree:   { label: 'Déclarée',    color: 'text-indigo-700', bg: 'bg-indigo-100', dot: 'bg-indigo-500', icon: <Send className="h-4 w-4" /> },
  payee:      { label: 'Payée',       color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500',  icon: <CheckCircle className="h-4 w-4" /> },
};

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ============================================================================
// Component
// ============================================================================

const EcheancesFiscalesPage: React.FC = () => {
  const { adapter } = useData();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ taxCode: '', taxName: '', deadline: '', periodicite: 'MONTHLY', montant: '', category: 'INDIRECT' });

  // Load tax declarations + registry from DB
  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['fiscal-deadlines', currentYear],
    queryFn: async (): Promise<FiscalDeadline[]> => {
      const [declarations, registries] = await Promise.all([
        adapter.getAll<Record<string, unknown>>('taxDeclarations'),
        adapter.getAll<Record<string, unknown>>('taxRegistry'),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const result: FiscalDeadline[] = [];

      // From existing tax declarations
      for (const decl of declarations) {
        const reg = registries.find(r => r.id === decl.taxRegistryId || r.taxCode === decl.taxCode);

        let status: DeadlineStatus;
        switch (decl.status) {
          case 'paid': status = 'payee'; break;
          case 'declared': case 'validated': status = 'declaree'; break;
          case 'calculated': status = 'calculee'; break;
          case 'overdue': status = 'en_retard'; break;
          default: {
            // draft or unknown — check if overdue
            if (decl.declarationDeadline && decl.declarationDeadline < todayStr) {
              status = 'en_retard';
            } else {
              status = 'a_declarer';
            }
          }
        }

        result.push({
          id: decl.id,
          taxCode: decl.taxCode || reg?.taxCode || '?',
          taxName: reg?.taxName || decl.taxCode || 'Taxe',
          taxCategory: reg?.taxCategory || 'AUTRE',
          periodLabel: decl.periodLabel || '',
          deadline: decl.declarationDeadline || decl.periodEnd || '',
          status,
          montant: decl.netTax ?? decl.balanceDue ?? 0,
          periodicite: reg?.periodicity || 'MONTHLY',
          obligatoire: reg?.isMandatory ?? true,
        });
      }

      // If no declarations exist, generate from registry for current year
      if (result.length === 0 && registries.length > 0) {
        for (const reg of registries) {
          if (!reg.isActive) continue;
          const months = reg.periodicity === 'MONTHLY' ? 12
            : reg.periodicity === 'QUARTERLY' ? 4
            : reg.periodicity === 'ANNUAL' ? 1 : 0;

          for (let i = 0; i < months; i++) {
            const periodMonth = reg.periodicity === 'QUARTERLY' ? (i + 1) * 3 : i + 1;
            const periodEnd = new Date(currentYear, periodMonth, 0);
            const deadlineDate = new Date(periodEnd);
            deadlineDate.setDate(deadlineDate.getDate() + (reg.declarationDeadlineDays || 15));
            const deadlineStr = deadlineDate.toISOString().split('T')[0];

            let status: DeadlineStatus;
            if (deadlineStr < todayStr) {
              status = 'en_retard';
            } else {
              status = 'a_declarer';
            }

            result.push({
              id: `${reg.taxCode}-${currentYear}-${String(periodMonth).padStart(2, '0')}`,
              taxCode: reg.taxCode,
              taxName: reg.taxName || reg.taxShortName,
              taxCategory: reg.taxCategory,
              periodLabel: reg.periodicity === 'ANNUAL'
                ? `${currentYear}`
                : reg.periodicity === 'QUARTERLY'
                  ? `T${i + 1} ${currentYear}`
                  : `${MONTH_NAMES[i]} ${currentYear}`,
              deadline: deadlineStr,
              status,
              periodicite: reg.periodicity,
              obligatoire: reg.isMandatory ?? true,
            });
          }
        }
      }

      return result.sort((a, b) => a.deadline.localeCompare(b.deadline));
    },
  });

  // Calendar grid generation (Monday-first)
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastOfMonth.getDate();

    // Monday = 0, Sunday = 6
    let startDow = firstOfMonth.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: { day: number | null; date: string; events: FiscalDeadline[] }[] = [];

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, date: '', events: [] });
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = deadlines.filter(dl => dl.deadline === dateStr);
      cells.push({ day: d, date: dateStr, events: dayEvents });
    }

    return cells;
  }, [currentYear, currentMonth, deadlines]);

  // Filter
  const filteredDeadlines = useMemo(() => {
    let result = deadlines;
    if (selectedType !== 'tous') {
      result = result.filter(d => d.taxCategory === selectedType || d.taxCode === selectedType);
    }
    // Filter by selected month
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return result.filter(d => d.deadline.startsWith(prefix));
  }, [deadlines, selectedType, currentYear, currentMonth]);

  // Counts
  const counts = useMemo(() => {
    const c = { en_retard: 0, a_declarer: 0, calculee: 0, declaree: 0, payee: 0 };
    for (const d of deadlines) c[d.status]++;
    return c;
  }, [deadlines]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <Calendar className="mr-3 h-7 w-7 text-blue-600" />
              Calendrier Fiscal
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Suivi des obligations fiscales — SYSCOHADA / OHADA
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowConfig(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Programmer
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              {viewMode === 'calendar' ? <FileText className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              {viewMode === 'calendar' ? 'Liste' : 'Calendrier'}
            </button>
            <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards — 5 statuts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.entries(STATUS_CONFIG) as [DeadlineStatus, typeof STATUS_CONFIG[DeadlineStatus]][]).map(([key, cfg]) => (
          <div key={key} className={`${cfg.bg} rounded-lg p-4 border`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cfg.color}>{cfg.icon}</span>
              <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className={`text-2xl font-bold ${cfg.color}`}>{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, i) => {
              const isToday = cell.date === todayStr;
              return (
                <div
                  key={i}
                  className={`min-h-[110px] border-b border-r p-1.5 ${
                    cell.day === null ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                >
                  {cell.day !== null && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {cell.events.map(ev => {
                          const cfg = STATUS_CONFIG[ev.status];
                          return (
                            <div
                              key={ev.id}
                              className={`${cfg.bg} ${cfg.color} rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer truncate`}
                              title={`${ev.taxName} — ${ev.periodLabel} — ${cfg.label}${ev.montant ? ` — ${formatCurrency(ev.montant)}` : ''}`}
                            >
                              {ev.taxCode}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 border-t">
            {(Object.entries(STATUS_CONFIG) as [DeadlineStatus, typeof STATUS_CONFIG[DeadlineStatus]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span className={`inline-block w-3 h-3 rounded-full ${cfg.dot}`} />
                <span className="text-gray-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {filteredDeadlines.length} échéance(s) — {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="tous">Toutes les taxes</option>
              <option value="INDIRECT">TVA / Indirect</option>
              <option value="DIRECT">IS / Direct</option>
              <option value="SOCIAL">Social (CNPS, CMU)</option>
              <option value="RETENUE">Retenues à la source</option>
              <option value="AUTRE">Autres</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Taxe', 'Période', 'Échéance', 'Statut', 'Montant', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDeadlines.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucune échéance pour cette période
                </td></tr>
              ) : filteredDeadlines.map(dl => {
                const cfg = STATUS_CONFIG[dl.status];
                const daysUntil = Math.ceil((new Date(dl.deadline).getTime() - today.getTime()) / 86400000);
                return (
                  <tr key={dl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{dl.taxName}</div>
                      <div className="text-xs text-gray-500">{dl.taxCode} — {dl.taxCategory}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{dl.periodLabel}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{dl.deadline}</div>
                      {dl.status !== 'payee' && dl.status !== 'declaree' && (
                        <div className={`text-xs ${daysUntil < 0 ? 'text-red-600 font-medium' : daysUntil <= 5 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}j de retard` : daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil}j`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {dl.montant ? formatCurrency(dl.montant) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Voir"><Eye className="h-4 w-4 text-gray-500" /></button>
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="Modifier"><Edit className="h-4 w-4 text-gray-500" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Alert banner for overdue */}
      {counts.en_retard > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">
              {counts.en_retard} échéance(s) en retard
            </p>
            <p className="text-sm text-red-700 mt-1">
              Des déclarations fiscales ont dépassé leur date limite. Régularisez-les pour éviter les pénalités.
            </p>
          </div>
        </div>
      )}

      {/* ══════════ MODAL PROGRAMMER UNE ÉCHÉANCE ══════════ */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Programmer une échéance fiscale
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code taxe</label>
                <input
                  type="text"
                  value={configForm.taxCode}
                  onChange={e => setConfigForm(f => ({ ...f, taxCode: e.target.value }))}
                  placeholder="TVA, IS, IRPP..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={configForm.taxName}
                  onChange={e => setConfigForm(f => ({ ...f, taxName: e.target.value }))}
                  placeholder="Taxe sur la Valeur Ajoutée"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                <input
                  type="date"
                  value={configForm.deadline}
                  onChange={e => setConfigForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Périodicité</label>
                <select
                  value={configForm.periodicite}
                  onChange={e => setConfigForm(f => ({ ...f, periodicite: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="MONTHLY">Mensuelle</option>
                  <option value="QUARTERLY">Trimestrielle</option>
                  <option value="ANNUAL">Annuelle</option>
                  <option value="PUNCTUAL">Ponctuelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                  value={configForm.category}
                  onChange={e => setConfigForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="INDIRECT">TVA / Indirect</option>
                  <option value="DIRECT">IS / Direct</option>
                  <option value="SOCIAL">Social (CNPS, CMU)</option>
                  <option value="RETENUE">Retenue à la source</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé</label>
                <input
                  type="number"
                  value={configForm.montant}
                  onChange={e => setConfigForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <strong>Astuce :</strong> Les taxes du registre fiscal (Admin &gt; Registre Fiscal) génèrent automatiquement
              les échéances pour chaque période. Utilisez ce formulaire uniquement pour les échéances exceptionnelles
              ou les ajustements manuels.
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowConfig(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!configForm.taxCode || !configForm.deadline) {
                    toast.error('Code taxe et date limite sont obligatoires');
                    return;
                  }
                  try {
                    await adapter.create('taxDeclarations', {
                      taxCode: configForm.taxCode,
                      periodLabel: configForm.taxName || configForm.taxCode,
                      periodStart: configForm.deadline,
                      periodEnd: configForm.deadline,
                      declarationDeadline: configForm.deadline,
                      status: 'draft',
                      netTax: configForm.montant ? Number(configForm.montant) : 0,
                      base: 0,
                      grossTax: 0,
                      deductible: 0,
                      balanceDue: configForm.montant ? Number(configForm.montant) : 0,
                      credit: 0,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    toast.success(`Échéance ${configForm.taxCode} programmée au ${configForm.deadline}`);
                    setShowConfig(false);
                    setConfigForm({ taxCode: '', taxName: '', deadline: '', periodicite: 'MONTHLY', montant: '', category: 'INDIRECT' });
                  } catch (err) {
                    toast.error('Erreur lors de la programmation');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Programmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcheancesFiscalesPage;
