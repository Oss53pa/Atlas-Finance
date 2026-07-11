/**
 * BudgetEquationBar — widget d'équation budgétaire (refonte OPEX/CAPEX, Lot 2).
 *
 * Bandeau informatif : Budget / Engagé / Réalisé / Disponible d'une maille.
 * Réutilisable dans l'écran de saisie d'engagement, l'écran d'écriture comptable
 * (informatif, jamais bloquant côté compta), les drill-downs.
 *
 * Liseré du Disponible : vert sain · ambre si < 10 % du budget · rouge si < 0.
 * Montants en JetBrains Mono (font-mono). Purement présentationnel (aucun calcul LLM).
 */
import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export interface BudgetEquationBarProps {
  budget: number;
  engage: number;
  realise: number;
  disponible: number;
  /** Montant d'engagement envisagé (affiche le « après engagement »). */
  montantEnvisage?: number;
  /** Décision de contrôle éventuelle, pour le bandeau de statut. */
  decision?: 'ok' | 'warning' | 'blocked';
  seuil?: 'consommation_90' | 'depassement' | null;
  compact?: boolean;
}

const Tile: React.FC<{ label: string; value: number; accent?: string; borderClass?: string }> = ({
  label, value, accent = 'text-neutral-900 dark:text-white', borderClass = 'border-neutral-200 dark:border-neutral-700',
}) => (
  <div className={`flex-1 min-w-[120px] rounded-xl border ${borderClass} bg-white dark:bg-neutral-800 px-4 py-3`}>
    <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</div>
    <div className={`mt-1 font-mono text-sm font-semibold ${accent}`}>{formatCurrency(value)}</div>
  </div>
);

const DECISION_BANNER: Record<NonNullable<BudgetEquationBarProps['decision']>, { cls: string; label: string }> = {
  ok: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900', label: 'Disponible suffisant' },
  warning: { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900', label: 'Seuil d’alerte' },
  blocked: { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900', label: 'Dépassement — engagement bloqué' },
};

const BudgetEquationBar: React.FC<BudgetEquationBarProps> = ({
  budget, engage, realise, disponible, montantEnvisage, decision, seuil, compact,
}) => {
  // Couleur du liseré du Disponible.
  const dispoBorder =
    disponible < 0 ? 'border-red-300 dark:border-red-800'
    : budget > 0 && disponible < 0.1 * budget ? 'border-amber-300 dark:border-amber-800'
    : 'border-emerald-300 dark:border-emerald-800';
  const dispoAccent =
    disponible < 0 ? 'text-red-600 dark:text-red-400'
    : budget > 0 && disponible < 0.1 * budget ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const apres = montantEnvisage != null ? Math.round((disponible - montantEnvisage) * 100) / 100 : null;

  return (
    <div className="space-y-2">
      <div className={`flex gap-2 ${compact ? 'flex-wrap' : 'flex-wrap sm:flex-nowrap'}`}>
        <Tile label="Budget" value={budget} />
        <Tile label="Engagé" value={engage} accent="text-[#3D6FA8] dark:text-[#8fb4dd]" />
        <Tile label="Réalisé" value={realise} accent="text-[#235A6E] dark:text-[#8fc7d6]" />
        <Tile label="Disponible" value={disponible} accent={dispoAccent} borderClass={dispoBorder} />
      </div>
      {apres != null && (
        <div className="text-xs text-neutral-500">
          Après engagement envisagé :{' '}
          <span className={`font-mono font-medium ${apres < 0 ? 'text-red-600' : 'text-neutral-700 dark:text-neutral-200'}`}>
            {formatCurrency(apres)}
          </span>
        </div>
      )}
      {decision && (
        <div className={`text-xs rounded-lg border px-3 py-2 ${DECISION_BANNER[decision].cls}`}>
          {DECISION_BANNER[decision].label}
          {seuil === 'consommation_90' && ' — consommation ≥ 90 %'}
        </div>
      )}
    </div>
  );
};

export default BudgetEquationBar;
