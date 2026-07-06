/**
 * CostCentersPage — /analytics/cost-centers
 *
 * Centres de coût = sections analytiques RÉELLES (table sections_analytiques via
 * analyticsService). Réalisé = charges ventilées (getSectionPerformance →
 * v_actual_by_section). Écart budgétaire = budget − coûts réels (favorable si
 * l'on est sous le budget). Création/édition/(dés)activation persistées ; export
 * CSV ; amorçage d'une structure standard. Zéro champ fantôme, zéro bouton mort.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Filter, Edit, Target, DollarSign, BarChart3,
  CheckCircle, XCircle, Download, Sparkles, User, Building, Gauge, X,
} from 'lucide-react';
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Badge,
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  LoadingSpinner, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui';
import { useData } from '../../contexts/DataContext';
import {
  createSection, updateSection, listAxes, getSectionPerformance, seedStandardAnalyticalStructure,
} from '../../features/budget/services/analyticsService';
import { STANDARD_ANALYTICAL_STRUCTURE } from '../../features/budget/data/standardAnalyticalStructure';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface CostCentersFilters { search: string; axe: string; statut: string; responsable: string }
interface CenterRow {
  id: string; code: string; libelle: string; axeId: string | null; nom_axe: string; code_axe: string;
  responsable: string | null; budget: number; couts_reels: number; ecart_budget: number;
  realisation: number | null; actif: boolean;
}
const PAGE_SIZE = 20;
const emptyForm = { id: '', code: '', libelle: '', axe_id: '', responsable: '', budget_annuel: 0, actif: true };

const CostCentersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { adapter } = useData();
  const annee = String(new Date().getFullYear());

  const [filters, setFilters] = useState<CostCentersFilters>({ search: '', axe: '', statut: '', responsable: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!form.id;

  const { data: axesData } = useQuery({
    queryKey: ['analytical-axes', 'list'],
    queryFn: async () => ({ results: await listAxes(adapter) }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers', 'list', annee],
    queryFn: async (): Promise<CenterRow[]> => {
      const [perf, axesList] = await Promise.all([getSectionPerformance(adapter, annee), listAxes(adapter)]);
      const axeById = new Map(axesList.map(a => [a.id, a]));
      return perf.map((s): CenterRow => {
        const ax = s.axe_id ? axeById.get(s.axe_id) : null;
        const couts = s.charges;
        return {
          id: s.id, code: s.code, libelle: s.libelle, axeId: s.axe_id,
          nom_axe: ax?.libelle || '—', code_axe: ax?.code || '',
          responsable: s.responsable, budget: s.budget_annuel, couts_reels: couts,
          ecart_budget: s.budget_annuel - couts, // > 0 = sous le budget (favorable)
          realisation: s.budget_annuel > 0 ? (couts / s.budget_annuel) * 100 : null,
          actif: s.actif,
        };
      });
    },
  });

  const centers = useMemo(() => {
    let rows = data || [];
    const q = filters.search.trim().toLowerCase();
    if (q) rows = rows.filter(r => r.code.toLowerCase().includes(q) || (r.libelle || '').toLowerCase().includes(q));
    if (filters.axe) rows = rows.filter(r => r.code_axe === filters.axe);
    if (filters.responsable) rows = rows.filter(r => (r.responsable || '').toLowerCase().includes(filters.responsable.toLowerCase()));
    if (filters.statut) rows = rows.filter(r => (filters.statut === 'actif') === r.actif);
    return rows;
  }, [data, filters]);

  const totals = useMemo(() => {
    const budget = centers.reduce((a, r) => a + r.budget, 0);
    const couts = centers.reduce((a, r) => a + r.couts_reels, 0);
    return {
      count: centers.length,
      active: centers.filter(r => r.actif).length,
      budget, couts, ecart: budget - couts,
      realisation: budget > 0 ? (couts / budget) * 100 : null,
    };
  }, [centers]);

  const pageRows = centers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setFilter = (k: keyof CostCentersFilters, v: string) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cost-centers'] });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof emptyForm) => {
      if (f.id) {
        await updateSection(adapter, f.id, { libelle: f.libelle.trim(), responsable: f.responsable || null, budget_annuel: Number(f.budget_annuel) || 0, actif: f.actif });
      } else {
        await createSection(adapter, { axe_id: f.axe_id || null, code: f.code.trim(), libelle: f.libelle.trim(), responsable: f.responsable || undefined, budget_annuel: Number(f.budget_annuel) || 0 });
      }
    },
    onSuccess: () => { toast.success(isEdit ? 'Centre mis à jour' : 'Centre créé'); invalidate(); setShowModal(false); setForm({ ...emptyForm }); },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const toggleActif = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) => updateSection(adapter, id, { actif }),
    onSuccess: (_d, v) => { toast.success(v.actif ? 'Centre réactivé' : 'Centre désactivé'); invalidate(); },
    onError: () => toast.error('Action impossible'),
  });

  const seedMutation = useMutation({
    mutationFn: () => seedStandardAnalyticalStructure(adapter, STANDARD_ANALYTICAL_STRUCTURE),
    onSuccess: (r) => {
      toast.success(`Structure standard : ${r.axesCreated} axe(s) + ${r.sectionsCreated} centre(s) créés (${r.sectionsSkipped} déjà présents).`);
      queryClient.invalidateQueries({ queryKey: ['analytical-axes'] });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Amorçage impossible'),
  });

  const openCreate = () => { setForm({ ...emptyForm }); setErrors({}); setShowModal(true); };
  const openEdit = (c: CenterRow) => { setForm({ id: c.id, code: c.code, libelle: c.libelle, axe_id: c.axeId || '', responsable: c.responsable || '', budget_annuel: c.budget, actif: c.actif }); setErrors({}); setShowModal(true); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Code requis';
    if (!form.libelle.trim()) e.libelle = 'Libellé requis';
    if (!isEdit && !form.axe_id) e.axe_id = 'Axe requis';
    setErrors(e);
    if (Object.keys(e).length) { toast.error('Corrigez les champs requis'); return; }
    setIsSubmitting(true);
    try { await saveMutation.mutateAsync(form); } finally { setIsSubmitting(false); }
  };

  const exportCsv = () => {
    const header = ['Code', 'Libellé', 'Axe', 'Responsable', 'Budget', 'Coûts réels', 'Écart', 'Réalisation %', 'Statut'];
    const lines = centers.map(c => [
      c.code, c.libelle, c.code_axe, c.responsable || '', c.budget, c.couts_reels, c.ecart_budget,
      c.realisation != null ? Math.round(c.realisation) : '', c.actif ? 'actif' : 'inactif',
    ]);
    const csv = [header, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `centres_de_couts_${annee}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const axes = axesData?.results || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center"><Users className="mr-3 h-7 w-7" />Centres de Coûts</h1>
            <p className="mt-1 text-[var(--color-text-secondary)]">Sections analytiques · réalisé ventilé vs budget · Exercice {annee}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PageHeaderActions
              onToggleFilters={() => setShowFilters(v => !v)}
              filtersOpen={showFilters}
              activeFilters={[filters.search, filters.axe, filters.statut, filters.responsable].filter(Boolean).length}
              printTitle={`Centres de coûts ${annee}`}
            />
            <Button variant="outline" onClick={exportCsv} disabled={centers.length === 0}><Download className="mr-2 h-4 w-4" />Exporter</Button>
            <Button variant="outline" onClick={() => { if (window.confirm('Créer la structure analytique standard (axes + 10 centres de coût courants) ? Idempotent : n’ajoute que ce qui manque.')) seedMutation.mutate(); }} disabled={seedMutation.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />{seedMutation.isPending ? 'Amorçage…' : 'Structure standard'}
            </Button>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau Centre</Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center p-6"><div className="flex items-center space-x-4"><div className="p-2 bg-[var(--color-primary)]/10 rounded-full"><Users className="h-6 w-6 text-[var(--color-primary)]" /></div><div><p className="text-sm font-medium text-gray-600">Total Centres</p><p className="text-lg font-bold text-gray-900">{totals.count || '—'}</p></div></div></CardContent></Card>
        <Card><CardContent className="flex items-center p-6"><div className="flex items-center space-x-4"><div className="p-2 bg-green-100 rounded-full"><CheckCircle className="h-6 w-6 text-green-600" /></div><div><p className="text-sm font-medium text-gray-600">Centres Actifs</p><p className="text-lg font-bold text-green-700">{totals.active || '—'}</p></div></div></CardContent></Card>
        <Card><CardContent className="flex items-center p-6"><div className="flex items-center space-x-4"><div className="p-2 bg-[var(--color-text-secondary)]/10 rounded-full"><DollarSign className="h-6 w-6 text-[var(--color-text-secondary)]" /></div><div><p className="text-sm font-medium text-gray-600">Coûts Réels</p><p className="text-lg font-bold text-[var(--color-text-secondary)]">{totals.couts ? formatCurrency(totals.couts) : '—'}</p></div></div></CardContent></Card>
        <Card><CardContent className="flex items-center p-6"><div className="flex items-center space-x-4"><div className="p-2 bg-orange-100 rounded-full"><Gauge className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm font-medium text-gray-600">Taux de Réalisation</p><p className="text-lg font-bold text-orange-700">{totals.realisation != null ? formatPercentage(totals.realisation) : '—'}</p></div></div></CardContent></Card>
      </div>

      {showFilters && (
        <Card>
          <CardHeader><CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5" />Filtres</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" /><Input placeholder="Rechercher un centre..." value={filters.search} onChange={(e) => setFilter('search', e.target.value)} className="pl-10" /></div>
              <Select value={filters.axe} onValueChange={(v) => setFilter('axe', v)}>
                <SelectTrigger><SelectValue placeholder="Tous les axes" /></SelectTrigger>
                <SelectContent><SelectItem value="">Tous les axes</SelectItem>{axes.map((a: any) => <SelectItem key={a.id} value={a.code}>{a.libelle}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.statut} onValueChange={(v) => setFilter('statut', v)}>
                <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                <SelectContent><SelectItem value="">Tous les statuts</SelectItem><SelectItem value="actif">Actif</SelectItem><SelectItem value="inactif">Inactif</SelectItem></SelectContent>
              </Select>
              <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-gray-700" /><Input placeholder="Responsable" value={filters.responsable} onChange={(e) => setFilter('responsable', e.target.value)} className="pl-10" /></div>
            </div>
            <div className="flex justify-end mt-4"><Button variant="outline" onClick={() => { setFilters({ search: '', axe: '', statut: '', responsable: '' }); setPage(1); }}>Réinitialiser</Button></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between"><span>Liste des Centres de Coûts</span>{data && <Badge variant="outline">{centers.length} centre(s)</Badge>}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="lg" text="Chargement des centres..." /></div>
          ) : centers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun centre de coût</h3>
              <p className="text-gray-600 mb-6">{filters.search || filters.axe || filters.statut || filters.responsable ? 'Aucun centre ne correspond aux critères.' : 'Amorcez une structure standard ou créez un centre pour démarrer.'}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}><Sparkles className="mr-2 h-4 w-4" />Structure standard</Button>
                <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Créer un centre</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code/Libellé</TableHead>
                      <TableHead>Axe</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Coûts Réels</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                      <TableHead className="text-right">Réalisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((c) => (
                      <TableRow key={c.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[var(--color-primary)]/10 rounded-full"><Building className="h-4 w-4 text-[var(--color-primary)]" /></div>
                            <div><p className="font-medium text-[var(--color-text-primary)]">{c.libelle}</p><p className="text-sm text-[var(--color-text-secondary)] font-mono">{c.code}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><div><p className="font-medium text-sm">{c.nom_axe}</p><p className="text-xs text-gray-700 font-mono">{c.code_axe}</p></div></TableCell>
                        <TableCell>{c.responsable ? <div className="flex items-center space-x-2"><div className="p-1 bg-gray-100 rounded-full"><User className="h-3 w-3 text-gray-600" /></div><span className="text-sm font-medium">{c.responsable}</span></div> : <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="text-right"><span className="font-semibold text-[var(--color-primary)]">{formatCurrency(c.budget)}</span></TableCell>
                        <TableCell className="text-right"><span className="font-semibold text-gray-700">{formatCurrency(c.couts_reels)}</span></TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${c.budget === 0 ? 'text-gray-400' : c.ecart_budget >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {c.budget === 0 ? '—' : `${c.ecart_budget >= 0 ? '+' : ''}${formatCurrency(c.ecart_budget)}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {c.realisation == null ? <span className="text-gray-400">—</span>
                            : <span className={`font-medium ${c.realisation > 100 ? 'text-red-700' : c.realisation > 90 ? 'text-orange-600' : 'text-green-700'}`}>{formatPercentage(c.realisation)}</span>}
                        </TableCell>
                        <TableCell><Badge className={c.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>{c.actif ? 'Actif' : 'Inactif'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/budget/exploitation')} aria-label="Analyse Budget vs Réalisé" title="Budget vs Réalisé"><BarChart3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(c)} aria-label="Modifier" title="Modifier"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleActif.mutate({ id: c.id, actif: !c.actif })} aria-label={c.actif ? 'Désactiver' : 'Réactiver'} title={c.actif ? 'Désactiver' : 'Réactiver'} className={c.actif ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}>{c.actif ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg grid gap-4 md:grid-cols-4">
                <div className="text-center"><p className="text-sm font-medium text-gray-600">Budget Total</p><p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totals.budget)}</p></div>
                <div className="text-center"><p className="text-sm font-medium text-gray-600">Coûts Réels</p><p className="text-lg font-bold text-gray-700">{formatCurrency(totals.couts)}</p></div>
                <div className="text-center"><p className="text-sm font-medium text-gray-600">Écart Global</p><p className={`text-lg font-bold ${totals.ecart >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totals.ecart >= 0 ? '+' : ''}{formatCurrency(totals.ecart)}</p></div>
                <div className="text-center"><p className="text-sm font-medium text-gray-600">Taux de Réalisation</p><p className="text-lg font-bold text-[var(--color-text-secondary)]">{totals.realisation != null ? formatPercentage(totals.realisation) : '—'}</p></div>
              </div>

              {centers.length > PAGE_SIZE && (
                <div className="mt-6"><Pagination currentPage={page} totalPages={Math.ceil(centers.length / PAGE_SIZE)} onPageChange={setPage} /></div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit modal — uniquement des champs réellement persistés */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3"><div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-lg"><Target className="w-5 h-5" /></div><h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Modifier le centre' : 'Nouveau centre de coût'}</h2></div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800" disabled={isSubmitting}><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="ex. PROD" className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} disabled={isSubmitting || isEdit} />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Axe analytique <span className="text-red-500">*</span></label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100" value={form.axe_id} onChange={(e) => setForm(f => ({ ...f, axe_id: e.target.value }))} disabled={isSubmitting || isEdit}>
                    <option value="">Sélectionner un axe</option>
                    {axes.map((a: any) => <option key={a.id} value={a.id}>{a.code} · {a.libelle}</option>)}
                  </select>
                  {errors.axe_id && <p className="mt-1 text-sm text-red-600">{errors.axe_id}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libellé <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Nom du centre" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.libelle} onChange={(e) => setForm(f => ({ ...f, libelle: e.target.value }))} disabled={isSubmitting} />
                {errors.libelle && <p className="mt-1 text-sm text-red-600">{errors.libelle}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <input type="text" placeholder="Nom du responsable" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.responsable} onChange={(e) => setForm(f => ({ ...f, responsable: e.target.value }))} disabled={isSubmitting} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget annuel (FCFA)</label>
                  <input type="number" placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={form.budget_annuel} onChange={(e) => setForm(f => ({ ...f, budget_annuel: parseFloat(e.target.value) || 0 }))} disabled={isSubmitting} />
                </div>
              </div>
              {isEdit && (
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.actif} onChange={(e) => setForm(f => ({ ...f, actif: e.target.checked }))} />Centre actif</label>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} disabled={isSubmitting} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50">Annuler</button>
              <button onClick={submit} disabled={isSubmitting} className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center space-x-2 disabled:opacity-50">
                {isSubmitting ? <><LoadingSpinner size="sm" /><span>Enregistrement…</span></> : <><CheckCircle className="w-4 h-4" /><span>{isEdit ? 'Enregistrer' : 'Créer le centre'}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCentersPage;
