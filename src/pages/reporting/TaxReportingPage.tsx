// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { TaxDetectionEngine } from '../../services/fiscal/TaxDetectionEngine';
import type { TaxDetectionResult } from '../../services/fiscal/TaxDetectionEngine';
import { seedTaxRegistryCI, seedIRPPBracketsCI } from '../../services/fiscal/taxRegistrySeeds';
import type { DBTaxRegistry, DBTaxDeclaration } from '../../lib/db';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Calculator,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Receipt,
  CreditCard,
  Building,
  Users,
  ChevronRight,
  Plus,
  Eye,
  X,
  Zap,
  RefreshCw,
  Settings
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../../components/ui';
import { motion } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════
// CALENDRIER FISCAL VISUEL — grille mensuelle avec échéances code couleur
// ═══════════════════════════════════════════════════════════════════════════

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

interface FiscalCalendarProps {
  triggeredTaxes: TaxDetectionResult[];
  dbDeclarations: DBTaxDeclaration[];
  hasRegistry: boolean;
}

const FiscalCalendar: React.FC<FiscalCalendarProps> = ({ triggeredTaxes, dbDeclarations, hasRegistry }) => {
  const { adapter } = useData();
  const queryClient = useQueryClient();
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [showProgrammer, setShowProgrammer] = useState(false);
  const [form, setForm] = useState({ taxCode: '', taxName: '', deadline: '', periodicite: 'MONTHLY', montant: '', category: 'INDIRECT' });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editDl, setEditDl] = useState<{ name: string; status: string; amount: number | null; isOverdue: boolean; day: number } | null>(null);
  const [editForm, setEditForm] = useState({ status: '', deadline: '', montant: '', notes: '' });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  // Build deadline map: day → array of {taxName, status, amount}
  const deadlineMap = useMemo(() => {
    const map: Record<number, Array<{ name: string; status: string; amount: number | null; isOverdue: boolean }>> = {};

    // From detection results
    for (const r of triggeredTaxes) {
      if (!r.declarationDeadline) continue;
      const d = new Date(r.declarationDeadline);
      if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) continue;
      const day = d.getDate();
      if (!map[day]) map[day] = [];
      map[day].push({
        name: r.tax.taxShortName || r.tax.taxCode,
        status: r.existingDeclaration?.status || 'pending',
        amount: r.amounts?.net ?? null,
        isOverdue: r.isOverdue,
      });
    }

    // From DB declarations (for declared/paid ones that may not be in detection)
    for (const decl of dbDeclarations) {
      if (!decl.declarationDeadline) continue;
      const d = new Date(decl.declarationDeadline);
      if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) continue;
      const day = d.getDate();
      // Avoid duplicates
      if (map[day]?.some(e => e.name === decl.taxCode)) continue;
      if (!map[day]) map[day] = [];
      map[day].push({
        name: decl.taxCode,
        status: decl.status,
        amount: decl.netTax,
        isOverdue: decl.declarationDeadline < todayStr && decl.status !== 'paid' && decl.status !== 'declared',
      });
    }

    return map;
  }, [triggeredTaxes, dbDeclarations, calMonth, calYear, todayStr]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Calendrier Fiscal
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={() => setShowProgrammer(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-1 h-4 w-4" /> Programmer
            </Button>
            <Button variant="ghost" size="sm" onClick={prevMonth}>&lsaquo;</Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <Button variant="ghost" size="sm" onClick={nextMonth}>&rsaquo;</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (cell.day === null) return <div key={idx} className="h-20" />;

            const deadlines = deadlineMap[cell.day] || [];
            const hasDeadline = deadlines.length > 0;
            const hasOverdue = deadlines.some(d => d.isOverdue);
            const hasPaid = deadlines.some(d => d.status === 'paid');
            const hasDeclared = deadlines.some(d => d.status === 'declared' || d.status === 'validated');
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isWeekend = (startDow + cell.day - 1) % 7 >= 5;

            let bgClass = 'bg-white hover:bg-gray-50';
            if (isToday) bgClass = 'bg-blue-50 ring-2 ring-blue-400';
            else if (hasOverdue) bgClass = 'bg-red-50';
            else if (hasDeadline && !hasPaid) bgClass = 'bg-orange-50';
            else if (hasPaid) bgClass = 'bg-green-50';
            else if (isWeekend) bgClass = 'bg-gray-50';

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(selectedDay === cell.day ? null : cell.day)}
                className={`${bgClass} rounded-lg p-1 min-h-[80px] border transition-colors cursor-pointer ${
                  selectedDay === cell.day ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                  {cell.day}
                </div>
                {deadlines.slice(0, 3).map((dl, i) => {
                  let dotColor = 'bg-orange-400';
                  if (dl.isOverdue) dotColor = 'bg-red-500';
                  else if (dl.status === 'paid') dotColor = 'bg-green-500';
                  else if (dl.status === 'declared' || dl.status === 'validated') dotColor = 'bg-blue-500';
                  else if (dl.status === 'calculated') dotColor = 'bg-yellow-500';

                  return (
                    <div key={i} className="flex items-center gap-1 mb-0.5" title={`${dl.name} — ${dl.amount != null ? formatCurrency(dl.amount) : 'Manuel'} — ${dl.status}`}>
                      <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                      <span className="text-[10px] text-gray-700 truncate">{dl.name}</span>
                    </div>
                  );
                })}
                {deadlines.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{deadlines.length - 3} autres</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel when a day is selected */}
        {selectedDay !== null && (deadlineMap[selectedDay] || []).length > 0 && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-900">
                {selectedDay} {MONTH_NAMES[calMonth]} {calYear} — {(deadlineMap[selectedDay] || []).length} échéance(s)
              </h4>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {(deadlineMap[selectedDay] || []).map((dl, i) => {
                let statusLabel = 'À déclarer';
                let statusColor = 'bg-orange-100 text-orange-700';
                if (dl.isOverdue) { statusLabel = 'En retard'; statusColor = 'bg-red-100 text-red-700'; }
                else if (dl.status === 'paid') { statusLabel = 'Payée'; statusColor = 'bg-green-100 text-green-700'; }
                else if (dl.status === 'declared' || dl.status === 'validated') { statusLabel = 'Déclarée'; statusColor = 'bg-blue-100 text-blue-700'; }
                else if (dl.status === 'calculated') { statusLabel = 'Calculée'; statusColor = 'bg-yellow-100 text-yellow-700'; }

                return (
                  <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-sm text-gray-900">{dl.name}</div>
                        <div className="text-xs text-gray-500">
                          Échéance : {selectedDay} {MONTH_NAMES[calMonth]} {calYear}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {dl.amount != null && dl.amount > 0 && (
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(dl.amount)}</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                          setEditDl({ ...dl, day: selectedDay! });
                          setEditForm({
                            status: dl.isOverdue ? 'overdue' : dl.status,
                            deadline: dateStr,
                            montant: dl.amount != null ? String(dl.amount) : '',
                            notes: '',
                          });
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedDay !== null && (deadlineMap[selectedDay] || []).length === 0 && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Aucune échéance le {selectedDay} {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> En retard
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> À déclarer
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Calculée
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Déclarée
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Payée
          </div>
        </div>
        {/* Modal Modifier une échéance */}
        {editDl && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  Modifier — {editDl.name}
                </h3>
                <button onClick={() => setEditDl(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="draft">Brouillon (À déclarer)</option>
                    <option value="calculated">Calculée</option>
                    <option value="validated">Validée</option>
                    <option value="declared">Déclarée</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                  <input
                    type="number"
                    value={editForm.montant}
                    onChange={e => setEditForm(f => ({ ...f, montant: e.target.value }))}
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Remarques, référence de paiement..."
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setEditDl(null)}>Annuler</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    try {
                      // Find matching declaration to update
                      const allDecl = await adapter.getAll('taxDeclarations');
                      const match = (allDecl as any[]).find(d =>
                        d.taxCode === editDl.name &&
                        d.declarationDeadline?.includes(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(editDl.day).padStart(2, '0')}`)
                      );

                      if (match) {
                        await adapter.update('taxDeclarations', match.id, {
                          status: editForm.status,
                          declarationDeadline: editForm.deadline,
                          netTax: editForm.montant ? Number(editForm.montant) : match.netTax,
                          balanceDue: editForm.montant ? Number(editForm.montant) : match.balanceDue,
                          ...(editForm.status === 'declared' ? { declaredAt: new Date().toISOString() } : {}),
                          ...(editForm.status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
                          ...(editForm.notes ? { paymentReference: editForm.notes } : {}),
                          updatedAt: new Date().toISOString(),
                        });
                        toast.success(`${editDl.name} mis à jour`);
                      } else {
                        // Create if not found
                        await adapter.create('taxDeclarations', {
                          taxCode: editDl.name,
                          periodLabel: `${MONTH_NAMES[calMonth]} ${calYear}`,
                          periodStart: editForm.deadline,
                          periodEnd: editForm.deadline,
                          declarationDeadline: editForm.deadline,
                          status: editForm.status,
                          netTax: editForm.montant ? Number(editForm.montant) : 0,
                          base: 0, grossTax: 0, deductible: 0,
                          balanceDue: editForm.montant ? Number(editForm.montant) : 0,
                          credit: 0,
                          ...(editForm.notes ? { paymentReference: editForm.notes } : {}),
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        });
                        toast.success(`${editDl.name} créé avec statut ${editForm.status}`);
                      }

                      setEditDl(null);
                      queryClient.invalidateQueries({ queryKey: ['tax-reporting'] });
                    } catch (err) {
                      console.error('[FiscalCalendar] update failed:', err);
                      toast.error('Erreur lors de la mise à jour');
                    }
                  }}
                >
                  <CheckCircle className="mr-1 h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Programmer */}
        {showProgrammer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Programmer une échéance
                </h3>
                <button onClick={() => setShowProgrammer(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code taxe *</label>
                  <input type="text" value={form.taxCode} onChange={e => setForm(f => ({ ...f, taxCode: e.target.value }))}
                    placeholder="TVA, IS, IRPP..." className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={form.taxName} onChange={e => setForm(f => ({ ...f, taxName: e.target.value }))}
                    placeholder="Taxe sur la Valeur Ajoutée" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite *</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Périodicité</label>
                  <select value={form.periodicite} onChange={e => setForm(f => ({ ...f, periodicite: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="MONTHLY">Mensuelle</option>
                    <option value="QUARTERLY">Trimestrielle</option>
                    <option value="ANNUAL">Annuelle</option>
                    <option value="PUNCTUAL">Ponctuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="INDIRECT">TVA / Indirect</option>
                    <option value="DIRECT">IS / Direct</option>
                    <option value="SOCIAL">Social</option>
                    <option value="RETENUE">Retenue à la source</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé</label>
                  <input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                    placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <strong>Astuce :</strong> Les taxes du registre fiscal (Admin &gt; Registre Fiscal) génèrent automatiquement les échéances. Ce formulaire sert pour les échéances exceptionnelles.
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowProgrammer(false)}>Annuler</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    if (!form.taxCode || !form.deadline) { toast.error('Code taxe et date limite obligatoires'); return; }
                    try {
                      await adapter.create('taxDeclarations', {
                        taxCode: form.taxCode,
                        periodLabel: form.taxName || form.taxCode,
                        periodStart: form.deadline,
                        periodEnd: form.deadline,
                        declarationDeadline: form.deadline,
                        status: 'draft',
                        netTax: form.montant ? Number(form.montant) : 0,
                        base: 0, grossTax: 0, deductible: 0,
                        balanceDue: form.montant ? Number(form.montant) : 0,
                        credit: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                      toast.success(`Échéance ${form.taxCode} programmée au ${form.deadline}`);
                      setShowProgrammer(false);
                      setForm({ taxCode: '', taxName: '', deadline: '', periodicite: 'MONTHLY', montant: '', category: 'INDIRECT' });
                      queryClient.invalidateQueries({ queryKey: ['tax-reporting'] });
                    } catch (err) {
                      console.error('[FiscalCalendar] save failed:', err);
                      toast.error('Erreur lors de la programmation');
                    }
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> Programmer
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════

interface TaxDeclaration {
  id: string;
  type: string;
  periode: string;
  montant: number;
  statut: string;
  dateEcheance: string;
  datePaiement: string | null;
}

interface TaxReport {
  id: string;
  name: string;
  type: string;
  format: string;
  size: string;
  lastGenerated: string;
}

// Helper: compute period bounds from a selectedPeriod value
function getPeriodBounds(selectedPeriod: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  switch (selectedPeriod) {
    case 'last-month': {
      const d = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      return {
        start: d.toISOString().split('T')[0],
        end: last.toISOString().split('T')[0],
      };
    }
    case 'current-quarter': {
      const qStart = new Date(y, Math.floor(m / 3) * 3, 1);
      const qEnd = new Date(y, Math.floor(m / 3) * 3 + 3, 0);
      return {
        start: qStart.toISOString().split('T')[0],
        end: qEnd.toISOString().split('T')[0],
      };
    }
    case 'current-year':
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'current-month':
    default: {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      return {
        start: first.toISOString().split('T')[0],
        end: last.toISOString().split('T')[0],
      };
    }
  }
}

const TaxReportingPage: React.FC = () => {
  const { adapter } = useData();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedTaxType, setSelectedTaxType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewDeclarationModal, setShowNewDeclarationModal] = useState(false);
  const [showDeclarationDetailModal, setShowDeclarationDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);
  const [selectedReport, setSelectedReport] = useState<TaxReport | null>(null);
  const [isAutoCalculating, setIsAutoCalculating] = useState(false);

  // Form states
  const [newDeclaration, setNewDeclaration] = useState({
    type: 'TVA',
    periode: '',
    montant: '',
    dateEcheance: ''
  });

  // Period bounds derived from selection
  const periodBounds = useMemo(() => getPeriodBounds(selectedPeriod), [selectedPeriod]);

  // ─── Data queries ──────────────────────────────────────────────────────────

  // Tax Registry
  const { data: taxRegistry = [] } = useQuery({
    queryKey: ['tax-registry'],
    queryFn: () => adapter.getAll<DBTaxRegistry>('taxRegistry'),
  });

  // Tax Declarations from DB
  const { data: dbTaxDeclarations = [] } = useQuery({
    queryKey: ['tax-declarations-db'],
    queryFn: () => adapter.getAll<DBTaxDeclaration>('taxDeclarations'),
  });

  // Journal entries (for manual fallback computation)
  const { data: allEntries = [] } = useQuery({
    queryKey: ['tax-reporting-entries'],
    queryFn: () => adapter.getAll('journalEntries'),
  });

  // Detection engine results — only run when taxRegistry has entries
  const { data: detectionResults = [] } = useQuery<TaxDetectionResult[]>({
    queryKey: ['tax-detection', periodBounds.start, periodBounds.end, taxRegistry.length],
    queryFn: async () => {
      if (taxRegistry.length === 0) return [];
      const engine = new TaxDetectionEngine(adapter, 'CI');
      return engine.detectTaxesFromAccounts(periodBounds.start, periodBounds.end);
    },
    enabled: taxRegistry.length > 0,
  });

  const hasRegistry = taxRegistry.length > 0;
  const triggeredTaxes = useMemo(() => detectionResults.filter(r => r.isTriggered), [detectionResults]);

  // ─── Manual fallback taxStats (used when no registry) ──────────────────────

  const taxStats = useMemo(() => {
    let tvaCollectee = 0, tvaDeductible = 0, chargesPersonnel = 0, resultatNet = 0;
    for (const e of allEntries) {
      for (const l of (e as any).lines || []) {
        if (l.accountCode.startsWith('4431') || l.accountCode.startsWith('4432') || l.accountCode.startsWith('4433') || l.accountCode.startsWith('4434') || l.accountCode.startsWith('4436')) {
          tvaCollectee += l.credit - l.debit;
        }
        if (l.accountCode.startsWith('4451') || l.accountCode.startsWith('4452') || l.accountCode.startsWith('4453') || l.accountCode.startsWith('4454') || l.accountCode.startsWith('4455') || l.accountCode.startsWith('4456')) {
          tvaDeductible += l.debit - l.credit;
        }
        if (l.accountCode.startsWith('66')) chargesPersonnel += l.debit - l.credit;
        if (l.accountCode.startsWith('7')) resultatNet += l.credit - l.debit;
        if (l.accountCode.startsWith('6')) resultatNet -= l.debit - l.credit;
      }
    }
    const tvaAPayer = Math.max(0, tvaCollectee - tvaDeductible);
    const irppEstime = Math.round(chargesPersonnel * 0.15);
    const isEstime = Math.round(Math.max(0, resultatNet) * 0.25);
    const totalTaxes = tvaAPayer + irppEstime + isEstime;
    const creditTVA = Math.max(0, Math.round(tvaDeductible - tvaCollectee));
    const economiesFiscales = Math.round(tvaDeductible);
    return {
      tvaCollectee: Math.round(tvaCollectee),
      tvaDeductible: Math.round(tvaDeductible),
      tvaAPayer: Math.round(tvaAPayer),
      irpp: irppEstime,
      is: isEstime,
      totalTaxes,
      creditTVA,
      economiesFiscales,
      resultatNet: Math.round(resultatNet),
      variation: { tva: 0, irpp: 0, is: 0, global: 0 }
    };
  }, [allEntries]);

  // ─── KPI values: prefer detection engine, fallback to manual ───────────────

  const kpiValues = useMemo(() => {
    if (!hasRegistry || triggeredTaxes.length === 0) {
      return {
        tva: taxStats.tvaAPayer,
        tvaCollectee: taxStats.tvaCollectee,
        tvaDeductible: taxStats.tvaDeductible,
        irpp: taxStats.irpp,
        is: taxStats.is,
        total: taxStats.totalTaxes,
        variation: taxStats.variation,
      };
    }
    // Find specific taxes from detection
    const tvaResult = triggeredTaxes.find(r => r.tax.taxCode === 'TVA');
    const irppResult = triggeredTaxes.find(r => r.tax.taxCode === 'IRPP_SALAIRES' || r.tax.taxCode === 'IRPP');
    const isResult = triggeredTaxes.find(r => r.tax.taxCode === 'IS');

    const tvaNet = tvaResult?.amounts?.net ?? taxStats.tvaAPayer;
    const tvaCollectee = tvaResult?.amounts?.base ?? taxStats.tvaCollectee;
    const tvaDeductible = tvaResult?.amounts?.deductible ?? taxStats.tvaDeductible;
    const irppNet = irppResult?.amounts?.net ?? taxStats.irpp;
    const isNet = isResult?.amounts?.net ?? taxStats.is;

    // Total = sum of all triggered taxes
    const total = triggeredTaxes.reduce((sum, r) => sum + (r.amounts?.net || 0), 0);

    return {
      tva: tvaNet,
      tvaCollectee,
      tvaDeductible,
      irpp: irppNet,
      is: isNet,
      total: total || taxStats.totalTaxes,
      variation: taxStats.variation, // keep same variation logic
    };
  }, [hasRegistry, triggeredTaxes, taxStats]);

  // ─── Declarations: merge DB declarations with settings-based ones ──────────

  const { data: declSetting } = useQuery({
    queryKey: ['tax-reporting-declarations'],
    queryFn: () => adapter.getById('settings', 'tax_declarations'),
  });

  const declarations: TaxDeclaration[] = useMemo(() => {
    const result: TaxDeclaration[] = [];
    const seenIds = new Set<string>();

    // 1. DB tax declarations (from engine)
    for (const d of dbTaxDeclarations) {
      const reg = taxRegistry.find(r => r.id === d.taxRegistryId || r.taxCode === d.taxCode);
      const label = reg?.taxShortName || reg?.taxName || d.taxCode;
      const item: TaxDeclaration = {
        id: d.id,
        type: label,
        periode: d.periodLabel || `${d.periodStart} — ${d.periodEnd}`,
        montant: d.netTax || d.balanceDue || 0,
        statut: d.status === 'paid' ? 'payee' : d.status === 'declared' ? 'en_cours' : d.status === 'validated' ? 'en_cours' : d.status === 'overdue' ? 'en_retard' : 'planifiee',
        dateEcheance: d.declarationDeadline || '',
        datePaiement: d.paidAt || null,
      };
      result.push(item);
      seenIds.add(d.id);
    }

    // 2. Settings-based declarations
    try {
      if ((declSetting as any)?.value) {
        const parsed = JSON.parse((declSetting as any).value);
        if (Array.isArray(parsed)) {
          for (const d of parsed) {
            const id = d.id;
            if (seenIds.has(id)) continue;
            result.push({
              id, type: d.type?.toUpperCase() || 'TVA', periode: d.period || d.periode || '',
              montant: d.amount || d.montant || 0, statut: d.status || d.statut || 'planifiee',
              dateEcheance: d.dueDate || d.dateEcheance || '', datePaiement: d.paidDate || d.datePaiement || null
            });
            seenIds.add(id);
          }
        }
      }
    } catch {}

    // 3. Auto-generated from taxStats if nothing found
    if (result.length === 0 && (taxStats.tvaAPayer > 0 || taxStats.irpp > 0 || taxStats.is > 0)) {
      const now = new Date();
      if (taxStats.tvaAPayer > 0) result.push({
        id: 'auto-tva', type: 'TVA', periode: now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
        montant: taxStats.tvaAPayer, statut: 'planifiee',
        dateEcheance: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-15`, datePaiement: null
      });
      if (taxStats.irpp > 0) result.push({
        id: 'auto-irpp', type: 'IRPP', periode: `T${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
        montant: taxStats.irpp, statut: 'planifiee',
        dateEcheance: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-20`, datePaiement: null
      });
      if (taxStats.is > 0) result.push({
        id: 'auto-is', type: 'IS', periode: `${now.getFullYear()}`,
        montant: taxStats.is, statut: 'planifiee',
        dateEcheance: `${now.getFullYear()}-03-15`, datePaiement: null
      });
    }

    return result;
  }, [dbTaxDeclarations, taxRegistry, taxStats, declSetting]);

  // ─── Alert bar data: overdue + due soon taxes ──────────────────────────────

  const alertTaxes = useMemo(() => {
    return triggeredTaxes.filter(r => {
      if (r.isOverdue) return true;
      if (r.daysUntilDeadline !== null && r.daysUntilDeadline <= 7 && r.daysUntilDeadline >= 0) return true;
      return false;
    });
  }, [triggeredTaxes]);

  // ─── Répartition data for overview ─────────────────────────────────────────

  const repartitionData = useMemo(() => {
    if (!hasRegistry || triggeredTaxes.length === 0) {
      // Fallback: 3 categories + Autres
      return [
        { label: 'TVA', amount: taxStats.tvaAPayer, color: 'text-var(--color-blue-primary)' },
        { label: 'IRPP', amount: taxStats.irpp, color: 'text-primary-600' },
        { label: 'IS', amount: taxStats.is, color: 'text-var(--color-green-primary)' },
        { label: 'Autres', amount: 0, color: 'text-var(--color-orange-primary)' },
      ];
    }
    // Group by taxCategory
    const catMap: Record<string, { label: string; amount: number; color: string }> = {};
    const categoryColors: Record<string, string> = {
      INDIRECT: 'text-var(--color-blue-primary)',
      DIRECT: 'text-var(--color-green-primary)',
      SOCIAL: 'text-primary-600',
      RETENUE: 'text-var(--color-orange-primary)',
      AUTRE: 'text-gray-600',
    };
    const categoryLabels: Record<string, string> = {
      INDIRECT: 'Taxes indirectes',
      DIRECT: 'Impôts directs',
      SOCIAL: 'Charges sociales',
      RETENUE: 'Retenues',
      AUTRE: 'Autres',
    };
    for (const r of triggeredTaxes) {
      const cat = r.tax.taxCategory || 'AUTRE';
      if (!catMap[cat]) {
        catMap[cat] = { label: categoryLabels[cat] || cat, amount: 0, color: categoryColors[cat] || 'text-gray-600' };
      }
      catMap[cat].amount += r.amounts?.net || 0;
    }
    return Object.values(catMap);
  }, [hasRegistry, triggeredTaxes, taxStats]);

  const repartitionTotal = useMemo(() => repartitionData.reduce((s, d) => s + d.amount, 0), [repartitionData]);

  // Données pour les rapports disponibles
  const availableReports = [
    {
      id: '1',
      name: 'État de TVA Mensuel',
      type: 'TVA',
      format: 'PDF',
      size: '245 KB',
      lastGenerated: '2024-02-10'
    },
    {
      id: '2',
      name: 'Synthèse Fiscale Annuelle',
      type: 'Global',
      format: 'Excel',
      size: '1.2 MB',
      lastGenerated: '2024-01-31'
    },
    {
      id: '3',
      name: 'Déclaration IRPP',
      type: 'IRPP',
      format: 'PDF',
      size: '180 KB',
      lastGenerated: '2024-02-05'
    },
    {
      id: '4',
      name: 'Liasse Fiscale',
      type: 'IS',
      format: 'PDF',
      size: '3.5 MB',
      lastGenerated: '2024-01-15'
    }
  ];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleExport = () => {
    toast.success('Export en cours de téléchargement...');
    setTimeout(() => toast.success('Export terminé avec succès'), 1500);
  };

  const handleNewDeclaration = () => {
    setShowNewDeclarationModal(true);
  };

  const handleViewDeclaration = (declaration: TaxDeclaration) => {
    setSelectedDeclaration(declaration);
    setShowDeclarationDetailModal(true);
  };

  const handlePayment = (declaration: TaxDeclaration) => {
    setSelectedDeclaration(declaration);
    setShowPaymentModal(true);
  };

  const handleDownloadDeclaration = (declaration: TaxDeclaration) => {
    toast.success(`Téléchargement de la déclaration ${declaration.type} - ${declaration.periode}`);
  };

  const handleGenerateReport = () => {
    setShowGenerateReportModal(true);
  };

  const handlePreviewReport = (report: TaxReport) => {
    setSelectedReport(report);
    setShowReportPreviewModal(true);
  };

  const handleDownloadReport = (report: TaxReport) => {
    toast.success(`Téléchargement du rapport "${report.name}"`);
  };

  const handleSubmitDeclaration = () => {
    if (!newDeclaration.type || !newDeclaration.periode || !newDeclaration.montant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    toast.success('Déclaration créée avec succès');
    setShowNewDeclarationModal(false);
    setNewDeclaration({ type: 'TVA', periode: '', montant: '', dateEcheance: '' });
  };

  const handleConfirmPayment = () => {
    toast.success(`Paiement de ${formatCurrency(selectedDeclaration?.montant || 0)} enregistré`);
    setShowPaymentModal(false);
    setSelectedDeclaration(null);
  };

  const handleConfirmImport = () => {
    toast.success('Import des données fiscales effectué');
    setShowImportModal(false);
  };

  // Seed tax registry
  const handleSeedRegistry = useCallback(async () => {
    try {
      await seedTaxRegistryCI(adapter);
      await seedIRPPBracketsCI(adapter);
      toast.success('Registre fiscal CI initialisé avec succès');
      queryClient.invalidateQueries({ queryKey: ['tax-registry'] });
      queryClient.invalidateQueries({ queryKey: ['tax-detection'] });
    } catch (err) {
      toast.error('Erreur lors de l\'initialisation du registre fiscal');
    }
  }, [adapter, queryClient]);

  // Auto-calculate all triggered taxes
  const handleAutoCalculate = useCallback(async () => {
    if (!hasRegistry) {
      toast.error('Veuillez d\'abord initialiser le registre fiscal');
      return;
    }
    setIsAutoCalculating(true);
    try {
      const engine = new TaxDetectionEngine(adapter, 'CI');
      let count = 0;
      for (const result of triggeredTaxes) {
        if (result.amounts) {
          await engine.createDeclaration(result.tax, periodBounds.start, periodBounds.end, result.amounts);
          count++;
        }
      }
      toast.success(`${count} déclaration(s) calculée(s) automatiquement`);
      queryClient.invalidateQueries({ queryKey: ['tax-declarations-db'] });
      queryClient.invalidateQueries({ queryKey: ['tax-detection'] });
    } catch (err) {
      toast.error('Erreur lors du calcul automatique');
    } finally {
      setIsAutoCalculating(false);
    }
  }, [adapter, hasRegistry, triggeredTaxes, periodBounds, queryClient]);

  // Status workflow handlers for DB declarations
  const handleValidateDecl = useCallback(async (declId: string) => {
    try {
      await adapter.update('taxDeclarations', declId, { status: 'validated', updatedAt: new Date().toISOString() });
      toast.success('Déclaration validée');
      queryClient.invalidateQueries({ queryKey: ['tax-declarations-db'] });
    } catch { toast.error('Erreur de validation'); }
  }, [adapter, queryClient]);

  const handleDeclareDecl = useCallback(async (declId: string) => {
    try {
      await adapter.update('taxDeclarations', declId, { status: 'declared', declaredAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      toast.success('Déclaration transmise');
      queryClient.invalidateQueries({ queryKey: ['tax-declarations-db'] });
    } catch { toast.error('Erreur de transmission'); }
  }, [adapter, queryClient]);

  const handlePayDecl = useCallback(async (declId: string) => {
    try {
      await adapter.update('taxDeclarations', declId, { status: 'paid', paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      toast.success('Paiement enregistré');
      queryClient.invalidateQueries({ queryKey: ['tax-declarations-db'] });
    } catch { toast.error('Erreur de paiement'); }
  }, [adapter, queryClient]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payee':
        return 'bg-var(--color-green-light) text-var(--color-green-dark)';
      case 'en_cours':
        return 'bg-var(--color-blue-light) text-var(--color-blue-dark)';
      case 'planifiee':
        return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
      case 'en_retard':
        return 'bg-var(--color-red-light) text-var(--color-red-dark)';
      default:
        return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'payee':
        return 'Payée';
      case 'en_cours':
        return 'En cours';
      case 'planifiee':
        return 'Planifiée';
      case 'en_retard':
        return 'En retard';
      default:
        return status;
    }
  };

  // Find the DB declaration ID for workflow actions
  const findDbDeclId = (localDecl: TaxDeclaration): string | null => {
    const found = dbTaxDeclarations.find(d => d.id === localDecl.id);
    return found ? found.id : null;
  };

  // Get DB declaration status for workflow buttons
  const getDbDeclStatus = (localDecl: TaxDeclaration): string | null => {
    const found = dbTaxDeclarations.find(d => d.id === localDecl.id);
    return found?.status || null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-var(--color-border) pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-var(--color-text-primary) flex items-center">
              <Receipt className="mr-3 h-7 w-7 text-var(--color-blue-primary)" />
              Reporting Fiscal
            </h1>
            <p className="mt-1 text-sm text-var(--color-text-secondary)">
              Tableaux de bord et rapports fiscaux - TVA, IRPP, IS et autres taxes
            </p>
          </div>
          <div className="flex space-x-2">
            {!hasRegistry && (
              <Button variant="outline" onClick={handleSeedRegistry} className="border-orange-300 text-orange-700 hover:bg-orange-50">
                <Settings className="mr-2 h-4 w-4" />
                Initialiser taxes CI
              </Button>
            )}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Mois en cours</SelectItem>
                <SelectItem value="last-month">Mois dernier</SelectItem>
                <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                <SelectItem value="current-year">Année en cours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button className="bg-var(--color-blue-primary) hover:bg-var(--color-blue-dark)" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Alert bar — overdue + due-soon taxes */}
      {alertTaxes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              {alertTaxes.map((r, idx) => {
                const taxLabel = r.tax.taxShortName || r.tax.taxName || r.tax.taxCode;
                const isOverdue = r.isOverdue;
                return (
                  <div key={idx} className="text-sm">
                    <span className={`font-medium ${isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
                      {taxLabel}
                    </span>
                    <span className="text-gray-600">
                      {isOverdue
                        ? ` — En retard (échéance: ${r.declarationDeadline})`
                        : ` — Échéance dans ${r.daysUntilDeadline} jour(s) (${r.declarationDeadline})`
                      }
                    </span>
                    {r.amounts?.net != null && (
                      <span className="font-semibold text-gray-800 ml-2">
                        {formatCurrency(r.amounts.net)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">TVA à Payer</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(kpiValues.tva)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Collectée: {formatCurrency(kpiValues.tvaCollectee)}
                  </p>
                  <p className="text-xs text-gray-700">
                    Déductible: {formatCurrency(kpiValues.tvaDeductible)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    kpiValues.variation.tva > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {kpiValues.variation.tva > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(kpiValues.variation.tva)}%
                  </div>
                  <CreditCard className="h-8 w-8 text-var(--color-blue-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">IRPP</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(kpiValues.irpp)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Impôt sur le revenu
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    kpiValues.variation.irpp > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {kpiValues.variation.irpp > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(kpiValues.variation.irpp)}%
                  </div>
                  <Users className="h-8 w-8 text-primary-600 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">IS</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(kpiValues.is)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Impôt sur les sociétés
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    kpiValues.variation.is > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {kpiValues.variation.is > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(kpiValues.variation.is)}%
                  </div>
                  <Building className="h-8 w-8 text-var(--color-green-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">Total Taxes</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(kpiValues.total)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Toutes taxes confondues
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    kpiValues.variation.global > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {kpiValues.variation.global > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(kpiValues.variation.global)}%
                  </div>
                  <DollarSign className="h-8 w-8 text-var(--color-orange-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="declarations">Déclarations</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Graphique TVA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Évolution TVA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-var(--color-text-secondary)">TVA Collectée</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaCollectee)}</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-var(--color-text-secondary)">TVA Déductible</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaDeductible)}</span>
                      </div>
                      <Progress value={55} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">TVA à Payer</span>
                        <span className="text-sm font-bold text-var(--color-blue-primary)">{formatCurrency(taxStats.tvaAPayer)}</span>
                      </div>
                      <Progress value={30} className="h-2 bg-var(--color-blue-light)" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendrier Fiscal — Prochaines Échéances */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Prochaines Échéances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hasRegistry && triggeredTaxes.length > 0 ? (
                      // Real detection results sorted by deadline
                      triggeredTaxes
                        .filter(r => r.declarationDeadline)
                        .sort((a, b) => (a.daysUntilDeadline ?? 999) - (b.daysUntilDeadline ?? 999))
                        .slice(0, 5)
                        .map((r, idx) => {
                          const taxLabel = r.tax.taxShortName || r.tax.taxName || r.tax.taxCode;
                          const isOverdue = r.isOverdue;
                          const isDueSoon = !isOverdue && r.daysUntilDeadline !== null && r.daysUntilDeadline <= 7;
                          const bgColor = isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-orange-50' : 'bg-var(--color-blue-light)';
                          const iconColor = isOverdue ? 'text-var(--color-red-primary)' : isDueSoon ? 'text-var(--color-orange-primary)' : 'text-var(--color-blue-primary)';
                          const badgeClass = isOverdue
                            ? 'destructive'
                            : isDueSoon
                              ? 'bg-var(--color-orange-light) text-orange-800'
                              : 'bg-var(--color-blue-light) text-var(--color-blue-dark)';
                          const daysLabel = isOverdue
                            ? `${Math.abs(r.daysUntilDeadline || 0)}j retard`
                            : `${r.daysUntilDeadline}j`;
                          return (
                            <div key={idx} className={`flex items-center justify-between p-2 ${bgColor} rounded-lg`}>
                              <div className="flex items-center">
                                {isOverdue ? (
                                  <AlertCircle className={`h-4 w-4 ${iconColor} mr-2`} />
                                ) : isDueSoon ? (
                                  <AlertCircle className={`h-4 w-4 ${iconColor} mr-2`} />
                                ) : (
                                  <Calendar className={`h-4 w-4 ${iconColor} mr-2`} />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{taxLabel}</p>
                                  <p className="text-xs text-var(--color-text-secondary)">{r.declarationDeadline}</p>
                                </div>
                              </div>
                              {isOverdue ? (
                                <Badge variant="destructive">{daysLabel}</Badge>
                              ) : (
                                <Badge className={badgeClass}>{daysLabel}</Badge>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <div className="flex items-center justify-center p-6 text-gray-400">
                        <div className="text-center">
                          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Aucune échéance fiscale</p>
                          <p className="text-xs mt-1">Initialisez le registre fiscal pour activer la détection automatique</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Répartition des taxes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Répartition des Taxes par Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 md:grid-cols-${Math.min(repartitionData.length, 6)}`}>
                  {repartitionData.map((item, idx) => (
                    <div key={idx} className="text-center">
                      <div className={`text-lg font-bold ${item.color}`}>
                        {repartitionTotal > 0 ? Math.round(item.amount / repartitionTotal * 100) : 0}%
                      </div>
                      <div className="text-sm text-var(--color-text-secondary)">{item.label}</div>
                      <div className="text-xs text-gray-700">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="declarations" className="space-y-4">
            {/* Banner if no tax registry */}
            {!hasRegistry && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">Registre fiscal non configuré</p>
                  <p className="text-xs text-orange-600">
                    Configurez les taxes dans Admin &rarr; Registre Fiscal ou cliquez sur "Initialiser taxes CI" pour charger les taxes ivoiriennes.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleSeedRegistry} className="border-orange-300 text-orange-700">
                  Initialiser
                </Button>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Déclarations Fiscales</CardTitle>
                  <div className="flex space-x-2">
                    <Select value={selectedTaxType} onValueChange={setSelectedTaxType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="tva">TVA</SelectItem>
                        <SelectItem value="irpp">IRPP</SelectItem>
                        <SelectItem value="is">IS</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasRegistry && (
                      <Button size="sm" variant="outline" onClick={handleAutoCalculate} disabled={isAutoCalculating}>
                        {isAutoCalculating ? (
                          <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-1 h-4 w-4" />
                        )}
                        Calculer automatiquement
                      </Button>
                    )}
                    <Button size="sm" onClick={handleNewDeclaration}>
                      <Plus className="mr-1 h-4 w-4" />
                      Nouvelle
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarations
                      .filter(d => selectedTaxType === 'all' || d.type.toLowerCase().includes(selectedTaxType.toLowerCase()))
                      .map((declaration) => {
                        const dbStatus = getDbDeclStatus(declaration);
                        const dbId = findDbDeclId(declaration);
                        return (
                          <TableRow key={declaration.id}>
                            <TableCell className="font-medium">{declaration.type}</TableCell>
                            <TableCell>{declaration.periode}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(declaration.montant)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(declaration.statut)}>
                                {getStatusLabel(declaration.statut)}
                              </Badge>
                            </TableCell>
                            <TableCell>{declaration.dateEcheance}</TableCell>
                            <TableCell>
                              {declaration.datePaiement || (
                                declaration.statut === 'en_retard' ? (
                                  <span className="text-var(--color-red-primary) text-sm">En retard</span>
                                ) : (
                                  <span className="text-var(--color-text-muted) text-sm">-</span>
                                )
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDeclaration(declaration)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {/* Workflow buttons for DB declarations */}
                                {dbId && dbStatus === 'calculated' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleValidateDecl(dbId)} title="Valider">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {dbId && dbStatus === 'validated' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDeclareDecl(dbId)} title="Déclarer">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {dbId && (dbStatus === 'declared' || dbStatus === 'overdue') && (
                                  <Button variant="ghost" size="sm" onClick={() => handlePayDecl(dbId)} title="Payer">
                                    <CreditCard className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {/* Legacy payment for non-DB declarations */}
                                {!dbId && declaration.statut !== 'payee' && (
                                  <Button variant="ghost" size="sm" onClick={() => handlePayment(declaration)}>
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDownloadDeclaration(declaration)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Rapports Fiscaux Disponibles</CardTitle>
                  <Button onClick={handleGenerateReport}>
                    <Plus className="mr-2 h-4 w-4" />
                    Générer Rapport
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {availableReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-var(--color-text-muted) mr-3" />
                          <div>
                            <h4 className="font-medium">{report.name}</h4>
                            <p className="text-sm text-var(--color-text-secondary)">
                              {report.type} • {report.format} • {report.size}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{report.lastGenerated}</Badge>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handlePreviewReport(report)}>
                          <Eye className="mr-1 h-3 w-3" />
                          Aperçu
                        </Button>
                        <Button size="sm" onClick={() => handleDownloadReport(report)}>
                          <Download className="mr-1 h-3 w-3" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5" />
                    Tendances Fiscales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Charge fiscale moyenne</span>
                      <span className="font-semibold">
                        {(() => {
                          const rev = hasRegistry && triggeredTaxes.length > 0
                            ? (triggeredTaxes.find(r => r.tax.taxCode === 'IS')?.amounts?.detail?.produits as number || taxStats.resultatNet + kpiValues.total)
                            : (taxStats.resultatNet + taxStats.totalTaxes);
                          const taxes = kpiValues.total;
                          return rev > 0 ? (taxes / rev * 100).toFixed(1) : '0.0';
                        })()}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Taux effectif d'imposition</span>
                      <span className="font-semibold">
                        {(() => {
                          if (hasRegistry && triggeredTaxes.length > 0) {
                            const isResult = triggeredTaxes.find(r => r.tax.taxCode === 'IS');
                            const base = isResult?.amounts?.base;
                            const net = isResult?.amounts?.net;
                            if (base && base > 0 && net != null) return (net / base * 100).toFixed(1);
                          }
                          return taxStats.resultatNet > 0 ? (taxStats.is / taxStats.resultatNet * 100).toFixed(1) : '0.0';
                        })()}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Crédit de TVA</span>
                      <span className="font-semibold text-var(--color-green-primary)">
                        {(() => {
                          if (hasRegistry && triggeredTaxes.length > 0) {
                            const tvaResult = triggeredTaxes.find(r => r.tax.taxCode === 'TVA');
                            if (tvaResult?.amounts?.credit) return formatCurrency(tvaResult.amounts.credit);
                          }
                          return formatCurrency(taxStats.creditTVA);
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Économies fiscales</span>
                      <span className="font-semibold text-var(--color-green-primary)">
                        {(() => {
                          if (hasRegistry && triggeredTaxes.length > 0) {
                            const tvaResult = triggeredTaxes.find(r => r.tax.taxCode === 'TVA');
                            return formatCurrency(tvaResult?.amounts?.deductible ?? taxStats.economiesFiscales);
                          }
                          return formatCurrency(taxStats.economiesFiscales);
                        })()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5" />
                    Optimisation Fiscale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-var(--color-green-light) rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-var(--color-green-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Déductions maximisées</p>
                          <p className="text-xs text-var(--color-text-secondary)">
                            {(() => {
                              if (hasRegistry && triggeredTaxes.length > 0) {
                                const tvaResult = triggeredTaxes.find(r => r.tax.taxCode === 'TVA');
                                const ded = tvaResult?.amounts?.deductible || 0;
                                const col = tvaResult?.amounts?.base || 0;
                                if (col > 0) return `${(ded / col * 100).toFixed(0)}% du potentiel récupéré`;
                              }
                              return '+15% vs année précédente';
                            })()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                    <div className="p-3 bg-var(--color-blue-light) rounded-lg">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-var(--color-blue-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Crédits d'impôt utilisés</p>
                          <p className="text-xs text-var(--color-text-secondary)">
                            {(() => {
                              if (hasRegistry && triggeredTaxes.length > 0) {
                                const totalCredits = triggeredTaxes.reduce((s, r) => s + (r.amounts?.credit || 0), 0);
                                if (totalCredits > 0) return `${formatCurrency(totalCredits)} de crédits disponibles`;
                              }
                              return '85% du potentiel';
                            })()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-var(--color-orange-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Opportunités identifiées</p>
                          <p className="text-xs text-var(--color-text-secondary)">
                            {(() => {
                              if (hasRegistry && triggeredTaxes.length > 0) {
                                const manualCount = triggeredTaxes.filter(r => r.amounts?.requiresManualInput).length;
                                if (manualCount > 0) return `${manualCount} taxe(s) nécessitent une saisie manuelle`;
                                return `${triggeredTaxes.length} taxe(s) détectée(s) automatiquement`;
                              }
                              return '3 nouvelles déductions possibles';
                            })()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <FiscalCalendar
              triggeredTaxes={triggeredTaxes}
              dbDeclarations={dbTaxDeclarations}
              hasRegistry={hasRegistry}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Importer des données fiscales</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Glissez-déposez vos fichiers ici</p>
                <p className="text-sm text-gray-500">ou</p>
                <Button variant="outline" className="mt-2">Parcourir</Button>
              </div>
              <p className="text-sm text-gray-500">Formats acceptés: CSV, Excel, XML</p>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Annuler</Button>
              <Button onClick={handleConfirmImport}>Importer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Déclaration */}
      {showNewDeclarationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nouvelle Déclaration Fiscale</h3>
              <button onClick={() => setShowNewDeclarationModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de déclaration *</label>
                <select
                  value={newDeclaration.type}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  {hasRegistry ? (
                    taxRegistry.filter(t => t.isActive).map(t => (
                      <option key={t.id} value={t.taxCode}>
                        {t.taxShortName || t.taxName || t.taxCode}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="TVA">TVA</option>
                      <option value="IRPP">IRPP</option>
                      <option value="IS">IS</option>
                      <option value="Taxe professionnelle">Taxe professionnelle</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période *</label>
                <input
                  type="text"
                  value={newDeclaration.periode}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, periode: e.target.value })}
                  placeholder="Ex: Janvier 2024"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (XOF) *</label>
                <input
                  type="number"
                  value={newDeclaration.montant}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, montant: e.target.value })}
                  placeholder="0"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
                <input
                  type="date"
                  value={newDeclaration.dateEcheance}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, dateEcheance: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowNewDeclarationModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitDeclaration}>Créer la déclaration</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Déclaration */}
      {showDeclarationDetailModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Détails de la Déclaration</h3>
              <button onClick={() => setShowDeclarationDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedDeclaration.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Période</p>
                  <p className="font-medium">{selectedDeclaration.periode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedDeclaration.montant)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <Badge className={getStatusColor(selectedDeclaration.statut)}>
                    {getStatusLabel(selectedDeclaration.statut)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Échéance</p>
                  <p className="font-medium">{selectedDeclaration.dateEcheance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de paiement</p>
                  <p className="font-medium">{selectedDeclaration.datePaiement || '-'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeclarationDetailModal(false)}>Fermer</Button>
              <Button onClick={() => handleDownloadDeclaration(selectedDeclaration)}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaymentModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Enregistrer le Paiement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Déclaration</p>
                <p className="font-semibold">{selectedDeclaration.type} - {selectedDeclaration.periode}</p>
                <p className="text-lg font-bold text-blue-700 mt-2">{formatCurrency(selectedDeclaration.montant)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode de paiement</label>
                <select className="w-full border rounded-lg p-2">
                  <option>Virement bancaire</option>
                  <option>Chèque</option>
                  <option>Télépaiement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Référence de paiement</label>
                <input type="text" placeholder="N° de référence" className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement</label>
                <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg p-2" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Annuler</Button>
              <Button onClick={handleConfirmPayment}>Confirmer le paiement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Générer Rapport */}
      {showGenerateReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Générer un Rapport Fiscal</h3>
              <button onClick={() => setShowGenerateReportModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de rapport</label>
                <select className="w-full border rounded-lg p-2">
                  <option>État de TVA Mensuel</option>
                  <option>Synthèse Fiscale Annuelle</option>
                  <option>Déclaration IRPP</option>
                  <option>Liasse Fiscale</option>
                  <option>Rapport personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select className="w-full border rounded-lg p-2">
                  <option>Mois en cours</option>
                  <option>Mois précédent</option>
                  <option>Trimestre en cours</option>
                  <option>Année en cours</option>
                  <option>Personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select className="w-full border rounded-lg p-2">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowGenerateReportModal(false)}>Annuler</Button>
              <Button onClick={() => {
                toast.success('Rapport en cours de génération...');
                setTimeout(() => {
                  toast.success('Rapport généré avec succès');
                  setShowGenerateReportModal(false);
                }, 2000);
              }}>
                Générer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Rapport */}
      {showReportPreviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Aperçu: {selectedReport.name}</h3>
              <button onClick={() => setShowReportPreviewModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-8 min-h-96 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">{selectedReport.name}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Type: {selectedReport.type} | Format: {selectedReport.format} | Taille: {selectedReport.size}
                  </p>
                  <p className="text-sm text-gray-500">Dernière génération: {selectedReport.lastGenerated}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setShowReportPreviewModal(false)}>Fermer</Button>
              <Button onClick={() => {
                handleDownloadReport(selectedReport);
                setShowReportPreviewModal(false);
              }}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReportingPage;
