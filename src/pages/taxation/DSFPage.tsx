/**
 * DSFPage — Déclaration Statistique et Fiscale, assemblée en interne (B2).
 *
 * Réf. docs/fiscal-dsf-multipays/DESIGN.md § B2
 *
 * Remplace la simple redirection vers Liass'Pilot par une liasse RÉELLE :
 *  - tableau de passage du résultat comptable au résultat fiscal (B1),
 *  - export FEC conforme avec rapport de contrôle (B3),
 *  - paramètres fiscaux versionnés par (pays, exercice) (B0).
 *
 * Liass'Pilot reste accessible comme UNE option d'export, plus le seul chemin.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileCheck, Loader2, Download, AlertTriangle, ExternalLink, Scale, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import {
  determineResultatFiscal,
  type ResultatFiscalResult,
} from '../../services/fiscal/resultatFiscalService';
import { exportFEC, type FecExportResult } from '../../services/fiscal/fecExportService';
import {
  getFiscalCountries,
  getFiscalYears,
} from '../../services/fiscal/fiscalParameters';
import {
  buildTaxEntryPreview,
  postTaxEntry,
  isTaxPosted,
  type TaxEntryPreview,
} from '../../services/fiscal/taxPostingService';

const LIASS_PILOT_URL = 'https://liass-pilot.atlas-studio.org';

interface FiscalYearRow {
  id: string;
  name?: string;
  startDate: string;
  endDate: string;
}

const fmt = (n: number, currency: string) =>
  `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${currency}`;

const DSFPage: React.FC = () => {
  const { adapter } = useData();

  const [country, setCountry] = useState('CI');
  const [years, setYears] = useState<FiscalYearRow[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [determination, setDetermination] = useState<ResultatFiscalResult | null>(null);
  const [fec, setFec] = useState<FecExportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Écriture d'impôt (B1-post) : prévisualisation → confirmation.
  const [taxPreview, setTaxPreview] = useState<TaxEntryPreview | null>(null);
  const [taxBusy, setTaxBusy] = useState(false);
  const [taxDone, setTaxDone] = useState(false);

  // Exercices comptables réels du tenant.
  useEffect(() => {
    (async () => {
      try {
        const rows = (await adapter.getAll<FiscalYearRow>('fiscalYears')) ?? [];
        const sorted = [...rows].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
        setYears(sorted);
        if (sorted[0]) setSelectedYearId(sorted[0].id);
      } catch {
        setYears([]);
      }
    })();
  }, [adapter]);

  const selectedYear = useMemo(
    () => years.find(y => y.id === selectedYearId),
    [years, selectedYearId],
  );

  const fiscalYearNumber = useMemo(() => {
    if (!selectedYear) return new Date().getUTCFullYear();
    return Number((selectedYear.endDate ?? selectedYear.startDate ?? '').slice(0, 4)) || 2026;
  }, [selectedYear]);

  const compute = useCallback(async () => {
    if (!selectedYear) {
      toast.error('Sélectionnez un exercice comptable');
      return;
    }
    setLoading(true);
    setFec(null);
    try {
      const result = await determineResultatFiscal(adapter, {
        countryCode: country,
        fiscalYear: fiscalYearNumber,
        startDate: selectedYear.startDate,
        endDate: selectedYear.endDate,
      });
      setDetermination(result);
      // Prévisualise l'écriture d'impôt (sans rien écrire) et vérifie si elle
      // est déjà comptabilisée pour cet exercice.
      setTaxPreview(null);
      if (selectedYear.id) {
        const [preview, posted] = await Promise.all([
          buildTaxEntryPreview(adapter, result, { fiscalYearId: selectedYear.id }),
          isTaxPosted(adapter, selectedYear.id),
        ]);
        setTaxPreview(preview);
        setTaxDone(posted);
      }
      if (result.parametersFallback || result.parametersProvisional) {
        toast(result.parametersWarning ?? 'Paramètres fiscaux à valider', { icon: '⚠️' });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Détermination impossible');
    } finally {
      setLoading(false);
    }
  }, [adapter, country, fiscalYearNumber, selectedYear]);

  const comptabiliserImpot = useCallback(async () => {
    if (!determination || !selectedYear) return;
    setTaxBusy(true);
    try {
      const res = await postTaxEntry(adapter, determination, {
        fiscalYearId: selectedYear.id,
        fiscalYearLabel: selectedYear.name,
        entryDate: selectedYear.endDate,
      });
      if (res.posted) {
        toast.success(res.message);
        setTaxDone(true);
        // Rafraîchit la prévisualisation (classe 89 désormais à l'impôt dû).
        setTaxPreview(await buildTaxEntryPreview(adapter, determination, { fiscalYearId: selectedYear.id }));
      } else {
        toast(res.message, { icon: 'ℹ️' });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Comptabilisation impossible');
    } finally {
      setTaxBusy(false);
    }
  }, [adapter, determination, selectedYear]);

  const runFec = async () => {
    if (!selectedYear) return;
    setExporting(true);
    try {
      const result = await exportFEC(adapter, {
        startDate: selectedYear.startDate,
        endDate: selectedYear.endDate,
        fiscalYear: fiscalYearNumber,
      });
      setFec(result);
      if (!result.ok) {
        toast.error(`FEC non conforme — ${result.issues.length} anomalie(s)`);
      }
    } finally {
      setExporting(false);
    }
  };

  const downloadFec = () => {
    if (!fec?.ok) return;
    const blob = new Blob([fec.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fec.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cur = determination?.currency ?? 'XOF';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-[#235A6E]" /> Déclaration Statistique et Fiscale
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Passage du résultat comptable au résultat fiscal, IS/IMF et fichier des écritures — assemblés en interne
        </p>
      </div>

      {/* Sélecteurs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pays (loi de finances)</label>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm"
          >
            {getFiscalCountries().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Exercice comptable</label>
          <select
            value={selectedYearId}
            onChange={e => setSelectedYearId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded text-sm min-w-[14rem]"
          >
            {years.length === 0 && <option value="">Aucun exercice</option>}
            {years.map(y => (
              <option key={y.id} value={y.id}>
                {y.name || `${y.startDate} → ${y.endDate}`}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={compute}
          disabled={loading || !selectedYearId}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
          Déterminer le résultat fiscal
        </button>
      </div>

      {determination && (
        <>
          {(determination.parametersFallback || determination.parametersProvisional) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {determination.parametersWarning}
            </div>
          )}

          {/* Tableau de passage */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900">
                Tableau de passage du résultat comptable au résultat fiscal
              </span>
              <span className="text-xs text-gray-500">{determination.legalReference}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <Row label="Résultat net comptable de l'exercice" value={fmt(determination.resultatNetComptable, cur)} strong />

                <SectionRow label={`Réintégrations (+${fmt(determination.totalReintegrations, cur)})`} />
                {determination.reintegrations.map(l => (
                  <AdjustmentRow key={l.code} label={l.label} basis={l.legalBasis} origin={l.origin} value={fmt(l.amount, cur)} sign="+" />
                ))}

                <SectionRow label={`Déductions (−${fmt(determination.totalDeductions, cur)})`} />
                {determination.deductions.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-2 text-xs text-gray-400 italic">Aucune déduction</td></tr>
                )}
                {determination.deductions.map(l => (
                  <AdjustmentRow key={l.code} label={l.label} basis={l.legalBasis} origin={l.origin} value={fmt(l.amount, cur)} sign="−" />
                ))}

                {determination.deficitsImputes > 0 && (
                  <Row label="Imputation des déficits antérieurs" value={`− ${fmt(determination.deficitsImputes, cur)}`} />
                )}

                <Row label="Résultat fiscal" value={fmt(determination.resultatFiscal, cur)} strong highlight />

                <Row label={`IS théorique (${determination.tauxIS} %)`} value={fmt(determination.impotTheorique, cur)} />
                <Row label="Impôt minimum forfaitaire (IMF)" value={fmt(determination.impotMinimumForfaitaire, cur)} />
                <Row label="Impôt dû (max IS / IMF)" value={fmt(determination.impotDu, cur)} strong highlight />
                <Row label="Acompte trimestriel N+1" value={fmt(determination.acomptesTrimestriels, cur)} />
              </tbody>
            </table>
          </div>

          {/* Comptabilisation de l'impôt (B1-post) */}
          {taxPreview && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                <Scale className="w-4 h-4 text-[#235A6E]" /> Écriture d'impôt sur le résultat
              </div>

              {taxDone ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  L'impôt de cet exercice est déjà comptabilisé (pièce <code>{taxPreview.reference}</code>).
                  Classe 89 = {fmt(taxPreview.alreadyBooked, cur)}.
                </div>
              ) : taxPreview.nothingToPost ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                  {taxPreview.message}
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Charge d'impôt déjà comptabilisée (classe 89) : {fmt(taxPreview.alreadyBooked, cur)}.
                    Complément pour atteindre l'impôt dû : <strong>{fmt(Math.abs(taxPreview.complement), cur)}</strong>.
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                          <th className="px-3 py-1.5">Compte</th>
                          <th className="px-3 py-1.5">Libellé</th>
                          <th className="px-3 py-1.5 text-right">Débit</th>
                          <th className="px-3 py-1.5 text-right">Crédit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxPreview.lines.map((l, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-1.5 font-mono text-xs">{l.accountCode}</td>
                            <td className="px-3 py-1.5 text-gray-600">{l.accountName}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{l.debit ? fmt(l.debit, cur) : ''}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{l.credit ? fmt(l.credit, cur) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={comptabiliserImpot}
                      disabled={taxBusy || !taxPreview.balanced}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50"
                    >
                      {taxBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                      Comptabiliser l'impôt
                    </button>
                    <span className="text-xs text-gray-400">
                      Écriture au journal OD, datée de la clôture ({selectedYear?.endDate}). Une seule par exercice.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* FEC */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#235A6E]" /> Fichier des Écritures Comptables (FEC)
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Export normalisé exigé en cas de contrôle. Produit uniquement s'il passe les contrôles de conformité.
            </p>
          </div>
          <button
            onClick={runFec}
            disabled={exporting || !selectedYearId}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            Contrôler et générer
          </button>
        </div>

        {fec && (
          <div className={`rounded-lg border p-3 text-sm ${fec.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-700">
                {fec.stats.entries} écritures · {fec.stats.lines} lignes ·
                débit {fec.stats.totalDebit.toLocaleString('fr-FR')} = crédit {fec.stats.totalCredit.toLocaleString('fr-FR')}
              </div>
              {fec.ok && (
                <button
                  onClick={downloadFec}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger {fec.fileName}
                </button>
              )}
            </div>
            {fec.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-red-800">
                {fec.issues.slice(0, 20).map((i, idx) => (
                  <li key={idx} className="flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span><strong>{i.code}</strong> — {i.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Liass'Pilot en option */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <p className="text-xs text-gray-600">
          Pour la mise en forme réglementaire finale de la liasse, vous pouvez aussi exporter vers Liass'Pilot.
        </p>
        <button
          onClick={() => window.open(LIASS_PILOT_URL, '_blank', 'noopener,noreferrer')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-white"
        >
          Ouvrir Liass'Pilot <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; strong?: boolean; highlight?: boolean }> = ({
  label, value, strong, highlight,
}) => (
  <tr className={`border-b border-gray-100 ${highlight ? 'bg-[#235A6E]/5' : ''}`}>
    <td className={`px-4 py-2.5 ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</td>
    <td className={`px-4 py-2.5 text-right tabular-nums ${strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{value}</td>
  </tr>
);

const SectionRow: React.FC<{ label: string }> = ({ label }) => (
  <tr className="bg-gray-50/60">
    <td colSpan={2} className="px-4 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</td>
  </tr>
);

const AdjustmentRow: React.FC<{ label: string; basis: string; origin: string; value: string; sign: string }> = ({
  label, basis, origin, value, sign,
}) => (
  <tr className="border-b border-gray-100">
    <td className="px-4 py-2 pl-8">
      <div className="text-gray-700">{label}</div>
      <div className="text-[11px] text-gray-400">
        {basis} · {origin === 'account' ? 'dérivé du Grand Livre' : 'saisie motivée'}
      </div>
    </td>
    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{sign} {value}</td>
  </tr>
);

export default DSFPage;
