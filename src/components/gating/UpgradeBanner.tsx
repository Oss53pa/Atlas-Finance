/**
 * UpgradeBanner — Bloc sobre affiché lorsqu'une feature Premium est verrouillée.
 * Design Atlas F&A : fond #1a1a1a, bordure amber #EF9F27, texte blanc.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';

export interface UpgradeBannerProps {
  feature: string;
  title?: string;
  description?: string;
  /** Affichage compact pour les petits containers (widgets, onglets) */
  compact?: boolean;
  className?: string;
}

const FEATURE_LABELS: Record<string, { title: string; description: string }> = {
  budget_analytique: {
    title: 'Budget & Analytique',
    description:
      'Pilotez vos budgets prévisionnels et votre comptabilité analytique par section, projet ou centre de coût.',
  },
  position_tresorerie: {
    title: 'Position de trésorerie',
    description: 'Suivez en temps réel vos soldes bancaires et caisse consolidés.',
  },
  recouvrement_balance_agee: {
    title: 'Balance âgée & Recouvrement',
    description: 'Identifiez les créances en retard et automatisez les relances par tranches d\'âge.',
  },
  proph3t_ia: {
    title: 'PROPH3T IA avancé',
    description:
      'Assistant IA expert-comptable SYSCOHADA avec suggestions proactives, alertes et corrections automatiques.',
  },
  multi_societes: {
    title: 'Multi-sociétés',
    description: 'Gérez plusieurs sociétés dans un seul tenant avec vue consolidée.',
  },
  consolidation_groupe: {
    title: 'Consolidation de groupe',
    description: 'Consolidez les états financiers de vos filiales selon les normes SYSCOHADA.',
  },
  audit_trail_ohada_certifie: {
    title: 'Audit Trail certifié OHADA',
    description: 'Export certifié avec chaînage SHA-256 conforme aux exigences OHADA.',
  },
  tableaux_bord_groupe: {
    title: 'Tableaux de bord Groupe',
    description: 'Vue consolidée des KPIs de toutes les sociétés du groupe.',
  },
  api_integrations: {
    title: 'API & Intégrations',
    description: 'API REST complète et intégrations avec vos outils métier (CRM, banque, paie...).',
  },
  support_dedie: {
    title: 'Support dédié',
    description: 'Chat prioritaire, account manager dédié et SLA 99.5%.',
  },
};

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  feature,
  title,
  description,
  compact = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const meta = FEATURE_LABELS[feature] ?? { title: 'Fonctionnalité Premium', description: '' };
  const resolvedTitle = title ?? meta.title;
  const resolvedDescription = description ?? meta.description;

  const handleUpgrade = () => {
    navigate('/settings/billing');
  };

  if (compact) {
    return (
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${className}`}
        style={{
          background: '#1a1a1a',
          border: '1px solid #EF9F27',
        }}
      >
        <Lock className="w-5 h-5 shrink-0" style={{ color: '#EF9F27' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{resolvedTitle}</p>
          <p className="text-[11px] text-neutral-400">Disponible en plan Premium</p>
        </div>
        <button
          onClick={handleUpgrade}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
          style={{ background: '#EF9F27', color: '#1a1a1a' }}
        >
          Voir les offres
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-8 text-center ${className}`}
      style={{
        background: '#1a1a1a',
        border: '1px solid #EF9F27',
      }}
    >
      <div
        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
        style={{ background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.3)' }}
      >
        <Lock className="w-8 h-8" style={{ color: '#EF9F27' }} />
      </div>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Sparkles className="w-4 h-4" style={{ color: '#EF9F27' }} />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: '#EF9F27' }}
        >
          Disponible en plan Premium
        </span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{resolvedTitle}</h3>
      {resolvedDescription && (
        <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">{resolvedDescription}</p>
      )}
      <button
        onClick={handleUpgrade}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ background: '#EF9F27', color: '#1a1a1a' }}
      >
        Voir les offres
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UpgradeBanner;
