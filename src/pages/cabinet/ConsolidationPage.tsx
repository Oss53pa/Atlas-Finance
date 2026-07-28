/**
 * ConsolidationPage — consolidation multi-entités sur données RÉELLES.
 *
 * Périmètre = sociétés de l'utilisateur (cross-tenant, agrégées côté serveur).
 * Config des participations (mère, %détention, méthode) → balances réelles →
 * moteur consoliderGroupe → états consolidés (résultat part groupe, intérêts
 * minoritaires, lignes par classe).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Network, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import { getCabinetPortfolio, type CabinetDossier } from '../../services/cabinet/cabinetPortfolioService';
import { getConsolidationBalances, partitionEntities } from '../../services/cdg/consolidationDataService';
import { consoliderGroupe, type ParticipationConso } from '../../services/cdg/consolidationEngine';
import type { MethodeConsolidation } from '../../services/cdg/consolidationService';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const CLASSES: Record<string, string> = {
  '1': 'Ressources durables', '2': 'Immobilisations', '3': 'Stocks', '4': 'Tiers',
  '5': 'Trésorerie', '6': 'Charges', '7': 'Produits', '8': 'Spécial',
};

interface ParticipationConfig { include: boolean; pourcentage: number; methode: MethodeConsolidation; }

const ConsolidationPage: React.FC = () => {
  const { adapter } = useData();
  const [dossiers, setDossiers] = useState<CabinetDossier[]>([]);
  const [mereId, setMereId] = useState('');
  const [config, setConfig] = useState<Record<string, ParticipationConfig>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof consoliderGroupe> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getCabinetPortfolio(adapter);
        setDossiers(p.dossiers);
        if (p.dossiers[0]) setMereId(p.dossiers[0].id);
        const cfg: Record<string, ParticipationConfig> = {};
        p.dossiers.forEach(d => { cfg[d.id] = { include: true, pourcentage: 100, methode: 'integration_globale' }; });
        setConfig(cfg);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Périmètre indisponible');
      } finally {
        setLoading(false);
      }
    })();
  }, [adapter]);

  const filialesSelectionnees = useMemo(
    () => dossiers.filter(d => d.id !== mereId && config[d.id]?.include),
    [dossiers, mereId, config],
  );

  const consolider = useCallback(async () => {
    if (!mereId) { toast.error('Choisir la société mère'); return; }
    setRunning(true); setError(null); setResult(null);
    try {
      const perimetre = [mereId, ...filialesSelectionnees.map(f => f.id)];
      const { entities } = await getConsolidationBalances(adapter, perimetre);
      const { mere, filiales } = partitionEntities(entities, mereId);
      if (!mere) throw new Error('Balance de la société mère introuvable');

      const participations: ParticipationConso[] = filialesSelectionnees.map(f => {
        const filiale = entities.find(e => e.societeId === f.id);
        // Situation nette = fonds propres (classe 1). Créditeurs → solde signé
        // négatif ; on renvoie le montant positif (−Σ classe 1).
        const situationNette = filiale ? -sumClasse(filiale.soldes, '1') : 0;
        return {
          filialId: f.id,
          pourcentageDetention: config[f.id].pourcentage,
          methode: config[f.id].methode,
          situationNette: config[f.id].methode === 'mise_en_equivalence' ? situationNette : undefined,
        };
      });

      setResult(consoliderGroupe({ mere, filiales, participations }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Consolidation impossible');
    } finally {
      setRunning(false);
    }
  }, [adapter, mereId, filialesSelectionnees, config]);

  // Regroupement des lignes consolidées par classe.
  const parClasse = useMemo(() => {
    if (!result) return [];
    const m = new Map<string, number>();
    for (const l of result.lignes) {
      const cl = (l.compte || '0')[0];
      m.set(cl, (m.get(cl) ?? 0) + l.montantConsolide);
    }
    return [...m.entries()].sort().map(([cl, montant]) => ({ cl, libelle: CLASSES[cl] ?? cl, montant }));
  }, [result]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-6 h-6 text-[#235A6E]" /> Consolidation multi-entités
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Périmètre, participations, et états consolidés sur les balances réelles des sociétés
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : dossiers.length < 1 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
          Aucune société dans votre périmètre. (La consolidation agrège plusieurs sociétés côté serveur.)
        </div>
      ) : (
        <>
          {/* Périmètre & participations */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold">Périmètre de consolidation</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-4 py-2">Société</th>
                  <th className="px-4 py-2 text-center">Mère</th>
                  <th className="px-4 py-2 text-center">Inclure</th>
                  <th className="px-4 py-2 text-right">% détention</th>
                  <th className="px-4 py-2">Méthode</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map(d => {
                  const isMere = d.id === mereId;
                  const c = config[d.id] ?? { include: true, pourcentage: 100, methode: 'integration_globale' as MethodeConsolidation };
                  return (
                    <tr key={d.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 font-medium text-gray-900">{d.nom}</td>
                      <td className="px-4 py-2 text-center">
                        <input type="radio" name="mere" checked={isMere} onChange={() => setMereId(d.id)} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" disabled={isMere} checked={isMere || c.include}
                          onChange={e => setConfig(p => ({ ...p, [d.id]: { ...c, include: e.target.checked } }))} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" min={0} max={100} value={c.pourcentage} disabled={isMere}
                          onChange={e => setConfig(p => ({ ...p, [d.id]: { ...c, pourcentage: Number(e.target.value) } }))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-right disabled:opacity-40" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={c.methode} disabled={isMere}
                          onChange={e => setConfig(p => ({ ...p, [d.id]: { ...c, methode: e.target.value as MethodeConsolidation } }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded disabled:opacity-40">
                          <option value="integration_globale">Intégration globale</option>
                          <option value="integration_proportionnelle">Intégration proportionnelle</option>
                          <option value="mise_en_equivalence">Mise en équivalence</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-200">
              <button onClick={consolider} disabled={running}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />} Consolider
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Kpi label="Résultat part groupe" value={fmt(result.resultatPartGroupe)} tone={result.resultatPartGroupe >= 0 ? 'ok' : 'bad'} />
                <Kpi label="Intérêts minoritaires" value={fmt(result.interetsMinoritaires)} />
                <Kpi label="Éliminations intra-groupe" value={fmt(result.totalEliminations)} />
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold">Bilan / résultat consolidé par classe</span>
                  <span className={`text-xs flex items-center gap-1 ${result.equilibre ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {result.equilibre ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {result.equilibre ? 'équilibré' : 'déséquilibre'}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {parClasse.map(c => (
                      <tr key={c.cl} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-1.5"><span className="font-mono text-xs text-gray-400 mr-2">{c.cl}</span>{c.libelle}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums">{fmt(c.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                  {result.lignes.length} comptes consolidés · solde signé (débit +, crédit −).
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

/** Somme signée d'une classe de comptes. */
function sumClasse(soldes: Record<string, number>, classe: string): number {
  return Object.entries(soldes)
    .filter(([code]) => code.startsWith(classe))
    .reduce((s, [, v]) => s + v, 0);
}

const Kpi: React.FC<{ label: string; value: string; tone?: 'ok' | 'bad' }> = ({ label, value, tone }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-lg font-bold tabular-nums ${tone === 'ok' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
  </div>
);

export default ConsolidationPage;
