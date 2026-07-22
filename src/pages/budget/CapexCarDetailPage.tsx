/**
 * CapexCarDetailPage — /capex/car/:id
 *
 * Vue 360° d'une appropriation (CAR) : l'appropriation elle-même, puis son cycle
 * de vie reconstitué DEPUIS LA COMPTABILITÉ — engagements (PO), fournisseurs,
 * factures rapprochées, et la chaîne approprié → engagé → facturé → réalisé GL.
 *
 * Périmètre assumé (docs/integration-suite-atlas/DESIGN.md §L3.3) : le processus
 * achats (PR/PO/réception/facture) appartient à Atlas Procure. Cet écran ne crée
 * aucun document d'achat — il restitue le résultat comptable, seule vérité côté F&A.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import { listAllCars, type Car } from '../../features/budget/services/capexCarService';
import { listProjets, type CapexProjet } from '../../features/budget/services/carService';
import { getCarCockpit, type CarCockpit } from '../../features/budget/services/carCockpitService';
import { engagementRestant } from '../../features/budget/services/engagementService';
import { Landmark, Loader2, ArrowLeft, FileText, Truck, Receipt, Layers, AlertTriangle, ExternalLink } from 'lucide-react';

type Onglet = 'appropriation' | 'engagements' | 'fournisseurs' | 'factures';

const TABS: { key: Onglet; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'appropriation', label: 'Appropriation', icon: Landmark },
  { key: 'engagements', label: 'Engagements (PO)', icon: FileText },
  { key: 'fournisseurs', label: 'Fournisseurs', icon: Truck },
  { key: 'factures', label: 'Factures', icon: Receipt },
];

const Kpi: React.FC<{ label: string; value: string; hint?: string; accent?: string }> = ({ label, value, hint, accent }) => (
  <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-4">
    <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div>
    <div className="font-mono text-base font-semibold" style={{ color: accent || 'var(--color-text-primary)' }}>{value}</div>
    {hint && <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{hint}</div>}
  </div>
);

const CapexCarDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { adapter } = useData();
  const navigate = useNavigate();
  const annee = String(new Date().getFullYear());

  const [car, setCar] = useState<(Car & { business_case?: string }) | null>(null);
  const [projet, setProjet] = useState<CapexProjet | null>(null);
  const [cockpit, setCockpit] = useState<CarCockpit | null>(null);
  const [tab, setTab] = useState<Onglet>('appropriation');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const cars = await listAllCars(adapter);
      const c = cars.find((x) => x.id === id) || null;
      if (!c) { setError('CAR introuvable.'); setLoading(false); return; }
      setCar(c);
      // Le projet CAPEX porte la section analytique — clé de liaison vers la compta.
      const projets = await listProjets(adapter);
      const p = projets.find((x) => x.request_id === c.request_id) || null;
      setProjet(p);
      setCockpit(await getCarCockpit(adapter, {
        approprie: c.montant_approprie || 0,
        sectionProjetId: p?.section_analytique_projet_id ?? null,
        sectionCode: p?.code ?? null,
        annee,
      }));
    } catch (e: any) { setError(e?.message || 'Erreur de chargement'); }
    finally { setLoading(false); }
  }, [adapter, id, annee]);
  useEffect(() => { load(); }, [load]);

  const resteAEngager = useMemo(
    () => Math.max(0, (cockpit?.approprie || 0) - (cockpit?.engage || 0) - (cockpit?.facture || 0)),
    [cockpit],
  );

  if (loading) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  if (error || !car) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || 'CAR introuvable.'}</div>
        <button onClick={() => navigate('/capex/car')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">← Retour au registre</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/capex/car')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center"><Landmark className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{car.reference || 'CAR'}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {car.business_case || '—'}
            {projet && <> · projet <button onClick={() => navigate(`/capex/projet/${projet.id}`)} className="font-mono text-[var(--color-primary)] hover:underline">{projet.code}</button></>}
          </p>
        </div>
        <button onClick={() => navigate(`/capex/bc/${car.request_id}`)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">
          <Layers className="w-4 h-4" /> Business Case
        </button>
      </header>

      {/* Chaîne approprié → engagé → facturé → réalisé */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Approprié" value={formatCurrency(cockpit?.approprie || 0)} accent="var(--color-primary)" />
        <Kpi label="Engagé (PO)" value={formatCurrency(cockpit?.engage || 0)} hint={`${cockpit?.engagements.length || 0} engagement(s)`} />
        <Kpi label="Facturé" value={formatCurrency(cockpit?.facture || 0)} hint={`${cockpit?.factures.length || 0} ligne(s) rapprochée(s)`} />
        <Kpi label="Réalisé GL (cl.2)" value={formatCurrency(cockpit?.realiseGl || 0)} hint={`exercice ${annee}`} accent="var(--color-success)" />
        <Kpi label="Reste à engager" value={formatCurrency(resteAEngager)} accent={resteAEngager === 0 ? 'var(--color-text-tertiary)' : 'var(--color-secondary)'} />
      </div>

      {cockpit?.sansProjet && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Aucun projet CAPEX rattaché à ce business case : sans section analytique, les engagements et le réalisé ne peuvent pas être reliés à cette appropriation.
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
                on ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-medium' : 'border-transparent text-[var(--color-text-secondary)] hover:text-neutral-800'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'appropriation' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 grid gap-4 sm:grid-cols-2 max-w-3xl">
          {[
            ['Référence', car.reference || '—'],
            ['Montant approprié', formatCurrency(car.montant_approprie)],
            ["Date d'appropriation", car.date_appropriation || '—'],
            ['Statut', String(car.statut)],
            ['Business Case', car.business_case || '—'],
            ['Projet CAPEX', projet?.code || '— (non émis)'],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div className="text-xs text-[var(--color-text-secondary)]">{k}</div>
              <div className="text-sm text-[var(--color-text-primary)] font-medium">{v as string}</div>
            </div>
          ))}
          <div className="sm:col-span-2">
            <div className="text-xs text-[var(--color-text-secondary)]">Justification</div>
            <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{car.justification || '—'}</p>
          </div>
        </div>
      )}

      {tab === 'engagements' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          {(cockpit?.engagements.length || 0) === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
              Aucun engagement rattaché. Les bons de commande approuvés dans Atlas Procure alimentent les engagements de ce projet.
            </p>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left">Référence / PO</th>
                  <th className="px-4 py-3 text-left">Fournisseur</th>
                  <th className="px-4 py-3 text-left">Compte</th>
                  <th className="px-4 py-3 text-left">Période</th>
                  <th className="px-4 py-3 text-right">Engagé initial</th>
                  <th className="px-4 py-3 text-right">Facturé</th>
                  <th className="px-4 py-3 text-right">Restant</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {cockpit!.engagements.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono text-xs">{e.reference_document || e.external_ref || '—'}</td>
                    <td className="px-4 py-3">{e.fournisseur_libelle || '—'}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs">{e.account_code}</span><span className="block text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[160px]">{getAccountLabel(e.account_code)}</span></td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{e.periode}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(e.montant_initial)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(e.montant_facture)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(engagementRestant(e))}</td>
                    <td className="px-4 py-3 text-xs">{String(e.statut).replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'fournisseurs' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          {(cockpit?.fournisseurs.length || 0) === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">Aucun fournisseur rattaché à cette appropriation.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left">Fournisseur</th>
                  <th className="px-4 py-3 text-right">Engagements</th>
                  <th className="px-4 py-3 text-right">Engagé restant</th>
                  <th className="px-4 py-3 text-right">Facturé</th>
                </tr>
              </thead>
              <tbody>
                {cockpit!.fournisseurs.map((f) => (
                  <tr key={f.libelle} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{f.libelle}</td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--color-text-secondary)]">{f.nbEngagements}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(f.engage)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(f.facture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'factures' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-x-auto">
          {(cockpit?.factures.length || 0) === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]">
              Aucune facture rapprochée. Une facture apparaît ici dès qu'elle est rapprochée d'un engagement du projet (écriture validée).
            </p>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Pièce</th>
                  <th className="px-4 py-3 text-left">Fournisseur</th>
                  <th className="px-4 py-3 text-left">Compte</th>
                  <th className="px-4 py-3 text-left">Libellé</th>
                  <th className="px-4 py-3 text-left">PO</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cockpit!.factures.map((f) => (
                  <tr key={f.journalLineId} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50">
                    <td className="px-4 py-3 text-xs">{f.date || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.piece || '—'}</td>
                    <td className="px-4 py-3">{f.fournisseur || '—'}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs">{f.accountCode}</span><span className="block text-[11px] text-[var(--color-text-tertiary)] truncate max-w-[150px]">{getAccountLabel(f.accountCode || '')}</span></td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[220px] truncate" title={f.libelle || ''}>{f.libelle || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.engagementRef || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(f.montant)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/accounting/general-ledger?compte=${f.accountCode || ''}`)} title="Voir dans le Grand Livre" className="text-gray-300 hover:text-[var(--color-primary)]"><ExternalLink className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="text-xs text-[var(--color-text-tertiary)]">
        Le processus achats (demande, commande, réception, facture fournisseur) est porté par Atlas Procure ; cet écran en restitue le résultat comptable — engagements, factures rapprochées et immobilisation constatée au Grand Livre.
      </p>
    </div>
  );
};

export default CapexCarDetailPage;
