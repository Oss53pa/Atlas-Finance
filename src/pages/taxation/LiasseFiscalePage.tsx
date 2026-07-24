import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, ExternalLink, Info, Download, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '../../components/ui';
import { useData } from '../../contexts/DataContext';
import type { DBFiscalYear } from '../../lib/db';
import {
  buildClosingBalance,
  closingBalanceToCSV,
  type ClosingBalance,
} from '../../services/fiscal/closingBalanceService';

/**
 * LiasseFiscalePage
 *
 * Les ANNEXES de la liasse restent produites par Liass'Pilot (outil spécialisé
 * d'Atlas Studio). Le point d'intégration est la BALANCE GÉNÉRALE DE CLÔTURE
 * (8 colonnes, après inventaire, avant affectation) : Atlas F&A l'expose,
 * Liass'Pilot la récupère pour bâtir la DSF des 14 pays UEMOA/CEMAC.
 *
 * Cette page permet de consulter et d'exporter cette balance, et documente la
 * connexion sécurisée par laquelle Liass'Pilot la tire.
 */
const LIASS_PILOT_URL = 'https://liass-pilot.atlas-studio.org';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const LiasseFiscalePage: React.FC = () => {
  const { adapter } = useData();
  const [years, setYears] = useState<DBFiscalYear[]>([]);
  const [yearId, setYearId] = useState<string>('');
  const [balance, setBalance] = useState<ClosingBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = (await adapter.getAll<DBFiscalYear>('fiscalYears')) ?? [];
        const sorted = [...rows].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
        setYears(sorted);
        if (sorted[0]) setYearId(sorted[0].id);
      } catch {
        setYears([]);
      }
    })();
  }, [adapter]);

  const year = useMemo(() => years.find(y => y.id === yearId), [years, yearId]);

  const compute = useCallback(async () => {
    if (!year) { toast.error('Sélectionnez un exercice'); return; }
    setLoading(true);
    try {
      const [{ resolveCompanyCountry }] = await Promise.all([
        loadCompanyCountry(adapter),
      ]);
      const bal = await buildClosingBalance(
        adapter,
        { startDate: year.startDate, endDate: year.endDate },
        { fiscalYearId: year.id, fiscalYearLabel: year.name, countryInput: resolveCompanyCountry },
      );
      setBalance(bal);
      if (!bal.balanced) {
        toast('Balance déséquilibrée — vérifier les écritures avant transmission', { icon: '⚠️' });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Calcul impossible');
    } finally {
      setLoading(false);
    }
  }, [adapter, year]);

  const exportCsv = () => {
    if (!balance) return;
    const csv = closingBalanceToCSV(balance);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance-cloture-${year?.name ?? 'exercice'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-gray-200 pb-4"
      >
        <h1 className="text-lg font-bold text-gray-900 flex items-center">
          <FileCheck className="mr-3 h-7 w-7 text-blue-600" />
          Liasse fiscale — balance de clôture
        </h1>
        <p className="mt-2 text-gray-600">
          Atlas F&amp;A fournit la balance générale de clôture ; Liass'Pilot produit les annexes
          de la DSF (UEMOA &amp; CEMAC).
        </p>
      </motion.div>

      {/* Balance de clôture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Balance générale de clôture</span>
            <span className="text-xs font-normal text-gray-500">
              après inventaire, avant affectation du résultat
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Exercice</label>
              <select
                value={yearId}
                onChange={e => { setYearId(e.target.value); setBalance(null); }}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <Button onClick={compute} disabled={loading || !year} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Calculer la balance
            </Button>
            {balance && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>

          {balance && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <Metric label="Comptes" value={String(balance.rows.length)} />
                <Metric label="Pays" value={`${balance.countryName ?? '—'}${balance.zone ? ` (${balance.zone})` : ''}`} />
                <Metric label="Devise" value={balance.currency} />
                <Metric
                  label="Équilibre"
                  value={balance.balanced ? 'équilibrée' : 'déséquilibrée'}
                  tone={balance.balanced ? 'ok' : 'bad'}
                />
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="px-3 py-2">Compte</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="px-3 py-2 text-right">Ouv. D</th>
                      <th className="px-3 py-2 text-right">Ouv. C</th>
                      <th className="px-3 py-2 text-right">Mvt D</th>
                      <th className="px-3 py-2 text-right">Mvt C</th>
                      <th className="px-3 py-2 text-right">Solde D</th>
                      <th className="px-3 py-2 text-right">Solde C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.rows.map(r => (
                      <tr key={r.accountCode} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-1.5 font-mono text-xs">{r.accountCode}</td>
                        <td className="px-3 py-1.5 text-gray-600 max-w-[16rem] truncate">{r.accountName}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.openingDebit ? fmt(r.openingDebit) : ''}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.openingCredit ? fmt(r.openingCredit) : ''}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.movementDebit ? fmt(r.movementDebit) : ''}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{r.movementCredit ? fmt(r.movementCredit) : ''}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{r.closingDebit ? fmt(r.closingDebit) : ''}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{r.closingCredit ? fmt(r.closingCredit) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-gray-100">
                    <tr className="text-xs font-semibold border-t border-gray-300">
                      <td className="px-3 py-2" colSpan={6}>TOTAL</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(balance.totals.closingDebit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(balance.totals.closingCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {balance.integrityHash && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Empreinte d'intégrité : <code>{balance.integrityHash.slice(0, 24)}…</code>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Connexion Liass'Pilot */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Info className="mr-2 h-5 w-5" />
            Génération des annexes par Liass'Pilot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-neutral-700">
            Les annexes de la liasse (DSF) sont produites par{' '}
            <span className="font-semibold text-blue-800">Liass'Pilot</span>, qui récupère
            automatiquement la balance de clôture ci-dessus via une connexion sécurisée
            (clé de service en lecture seule). Le mapping vers les postes de la DSF de chaque pays
            UEMOA/CEMAC est réalisé par Liass'Pilot.
          </p>
          <div className="flex items-center gap-3">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(LIASS_PILOT_URL, '_blank', 'noopener,noreferrer')}
            >
              Ouvrir Liass'Pilot
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <span className="text-xs text-neutral-500">
              La clé de connexion se gère dans Intégration › Clés de service (satellite « Liass'Pilot »).
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; tone?: 'ok' | 'bad' }> = ({ label, value, tone }) => (
  <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
    <div className="text-[11px] text-gray-500">{label}</div>
    <div className={`font-semibold ${tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900'}`}>
      {value}
    </div>
  </div>
);

/** Lit le pays de la société (settings canonique sinon table societes). */
async function loadCompanyCountry(adapter: unknown): Promise<{ resolveCompanyCountry: string }> {
  try {
    const a = adapter as { getAll: (t: string) => Promise<any[]> };
    const companies = await a.getAll('companies');
    const pays = companies?.[0]?.pays ?? companies?.[0]?.country ?? '';
    return { resolveCompanyCountry: pays };
  } catch {
    return { resolveCompanyCountry: '' };
  }
}

export default LiasseFiscalePage;
