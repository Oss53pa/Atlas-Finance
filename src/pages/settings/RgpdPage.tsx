/**
 * Protection des données personnelles (CDC Paramètres §13).
 *
 * Politique de rétention + responsable des données. NON destructif : configure
 * les durées et désigne le responsable ; l'anonymisation effective des tiers
 * personnes physiques arrivera dans un lot contrôlé dédié.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, ShieldCheck, Save, Info } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getRetentionConfig, setRgpdParam, type RetentionConfig } from '../../services/param/rgpdService';

const RgpdPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [cfg, setCfg] = useState<RetentionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tiersMois, setTiersMois] = useState('');
  const [responsable, setResponsable] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getRetentionConfig(adapter);
      setCfg(c); setTiersMois(String(c.retentionTiersMois)); setResponsable(c.responsable || '');
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const saveRetention = async () => {
    const v = Number(tiersMois);
    if (Number.isNaN(v) || v < 0) { toast.error('Durée en mois invalide'); return; }
    try { await setRgpdParam(adapter, 'retention_tiers_mois', v); toast.success('Rétention mise à jour'); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const saveResponsable = async () => {
    try { await setRgpdParam(adapter, 'responsable_donnees', responsable.trim()); toast.success('Responsable enregistré'); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" /> Protection des données personnelles</h1>
            <p className="text-sm text-gray-600">Politique de rétention &amp; responsable des données</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900 flex items-start gap-2">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <span>La rétention des <b>pièces comptables ({cfg?.retentionPiecesAns ?? 10} ans)</b> prime — obligation SYSCOHADA, non modifiable. La rétention des données tiers ci-dessous s'applique aux <b>coordonnées hors-comptables</b> des personnes physiques (les écritures et soldes restent intacts).</span>
      </div>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-medium text-gray-800">Rétention des données tiers</div>
            <div className="text-xs text-gray-500">Mois après la fin de la relation, avant éligibilité à l'anonymisation</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={tiersMois} onChange={e => setTiersMois(e.target.value)} className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right" />
            <span className="text-sm text-gray-500">mois</span>
            <button onClick={saveRetention} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Save className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-medium text-gray-800">Responsable des données</div>
            <div className="text-xs text-gray-500">Repris dans le rapport d'audit des paramètres</div>
          </div>
          <div className="flex items-center gap-2">
            <input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Nom / contact" className="w-64 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <button onClick={saveResponsable} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center gap-1"><Save className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-center justify-between flex-wrap gap-2">
        <span><b>Anonymisation des tiers.</b> Purge des coordonnées des personnes physiques échues (écritures et soldes préservés), tracée dans un journal chaîné.</span>
        <button onClick={() => navigate('/settings/rgpd/anonymisation')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs whitespace-nowrap">Ouvrir l'anonymisation</button>
      </div>
    </div>
  );
};

export default RgpdPage;
