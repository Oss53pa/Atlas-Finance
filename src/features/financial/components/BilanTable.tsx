import React from 'react';
import { Bilan } from '../types/financialStatements.types';
import { formatCurrency } from '@/shared/utils/formatters';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BilanTableProps {
  bilan: Bilan;
  loading?: boolean;
  previousBilan?: Bilan;
  showComparison?: boolean;
}

export const BilanTable: React.FC<BilanTableProps> = ({
  bilan,
  loading,
  previousBilan,
  showComparison = false,
}) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-[#F5F5F5] rounded" />
        ))}
      </div>
    );
  }

  const calculateVariation = (current: number, previous?: number) => {
    if (!previous || !showComparison) return null;
    const variation = current - previous;
    const variationPercent = (variation / previous) * 100;
    return { variation, variationPercent };
  };

  const renderLine = (
    label: string,
    current: number,
    previous?: number,
    isBold = false,
    indent = 0
  ) => {
    const variation = calculateVariation(current, previous);

    return (
      <tr className={isBold ? 'font-semibold bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'}>
        <td className={`py-3 px-4 border-b border-[#d4d4d4]`} style={{ paddingLeft: `${16 + indent * 16}px` }}>
          {label}
        </td>
        <td className="py-3 px-4 text-right border-b border-[#d4d4d4]">
          {formatCurrency(current)}
        </td>
        {showComparison && previous !== undefined && (
          <>
            <td className="py-3 px-4 text-right border-b border-[#d4d4d4]">
              {formatCurrency(previous)}
            </td>
            <td className="py-3 px-4 text-right border-b border-[#d4d4d4]">
              {variation && (
                <span className={variation.variation >= 0 ? 'text-[#171717]' : 'text-[#ef4444]'}>
                  {variation.variation >= 0 ? '+' : ''}
                  {formatCurrency(variation.variation)}
                </span>
              )}
            </td>
            <td className="py-3 px-4 text-right border-b border-[#d4d4d4]">
              {variation && (
                <span className={variation.variationPercent >= 0 ? 'text-[#171717]' : 'text-[#ef4444]'}>
                  {variation.variationPercent >= 0 ? '+' : ''}
                  {variation.variationPercent.toFixed(1)}%
                </span>
              )}
            </td>
          </>
        )}
      </tr>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-[#d4d4d4] overflow-hidden">
        <div className="bg-[#171717] text-white py-3 px-4">
          <h3 className="text-lg font-semibold">ACTIF</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F5] text-sm">
              <th className="py-2 px-4 text-left">Rubrique</th>
              <th className="py-2 px-4 text-right">{bilan.exercice}</th>
              {showComparison && previousBilan && (
                <>
                  <th className="py-2 px-4 text-right">{previousBilan.exercice}</th>
                  <th className="py-2 px-4 text-right">Variation</th>
                  <th className="py-2 px-4 text-right">%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {renderLine(
              'Immobilisations Incorporelles',
              bilan.actif.immobilisationsIncorporelles,
              previousBilan?.actif.immobilisationsIncorporelles,
              false,
              1
            )}
            {renderLine(
              'Immobilisations Corporelles',
              bilan.actif.immobilisationsCorporelles,
              previousBilan?.actif.immobilisationsCorporelles,
              false,
              1
            )}
            {renderLine(
              'Immobilisations Financières',
              bilan.actif.immobilisationsFinancieres,
              previousBilan?.actif.immobilisationsFinancieres,
              false,
              1
            )}
            {renderLine(
              'ACTIF IMMOBILISÉ',
              bilan.actif.totalActifImmobilise,
              previousBilan?.actif.totalActifImmobilise,
              true,
              0
            )}
            {renderLine(
              'Stocks',
              bilan.actif.stocks,
              previousBilan?.actif.stocks,
              false,
              1
            )}
            {renderLine(
              'Créances Clients',
              bilan.actif.creancesClients,
              previousBilan?.actif.creancesClients,
              false,
              1
            )}
            {renderLine(
              'Autres Créances',
              bilan.actif.autresCreances,
              previousBilan?.actif.autresCreances,
              false,
              1
            )}
            {renderLine(
              'Trésorerie Actif',
              bilan.actif.tresorerieActif,
              previousBilan?.actif.tresorerieActif,
              false,
              1
            )}
            {renderLine(
              'ACTIF CIRCULANT',
              bilan.actif.totalActifCirculant,
              previousBilan?.actif.totalActifCirculant,
              true,
              0
            )}
            <tr className="bg-[#171717] text-white font-bold">
              <td className="py-3 px-4">TOTAL ACTIF</td>
              <td className="py-3 px-4 text-right">{formatCurrency(bilan.actif.totalActif)}</td>
              {showComparison && previousBilan && (
                <>
                  <td className="py-3 px-4 text-right">{formatCurrency(previousBilan.actif.totalActif)}</td>
                  <td className="py-3 px-4 text-right" colSpan={2}></td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-[#d4d4d4] overflow-hidden">
        <div className="bg-[#525252] text-white py-3 px-4">
          <h3 className="text-lg font-semibold">PASSIF</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F5F5] text-sm">
              <th className="py-2 px-4 text-left">Rubrique</th>
              <th className="py-2 px-4 text-right">{bilan.exercice}</th>
              {showComparison && previousBilan && (
                <>
                  <th className="py-2 px-4 text-right">{previousBilan.exercice}</th>
                  <th className="py-2 px-4 text-right">Variation</th>
                  <th className="py-2 px-4 text-right">%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {renderLine(
              'Capital Social',
              bilan.passif.capitalSocial,
              previousBilan?.passif.capitalSocial,
              false,
              1
            )}
            {renderLine(
              'Réserves',
              bilan.passif.reserves,
              previousBilan?.passif.reserves,
              false,
              1
            )}
            {renderLine(
              'Résultat de l\'Exercice',
              bilan.passif.resultatExercice,
              previousBilan?.passif.resultatExercice,
              false,
              1
            )}
            {renderLine(
              'CAPITAUX PROPRES',
              bilan.passif.capitauxPropres,
              previousBilan?.passif.capitauxPropres,
              true,
              0
            )}
            {renderLine(
              'Emprunts',
              bilan.passif.emprunts,
              previousBilan?.passif.emprunts,
              false,
              1
            )}
            {renderLine(
              'Dettes Financières',
              bilan.passif.dettesFinancieres,
              previousBilan?.passif.dettesFinancieres,
              false,
              1
            )}
            {renderLine(
              'Dettes Fournisseurs',
              bilan.passif.dettesFournisseurs,
              previousBilan?.passif.dettesFournisseurs,
              false,
              1
            )}
            {renderLine(
              'Autres Dettes',
              bilan.passif.autresDettes,
              previousBilan?.passif.autresDettes,
              false,
              1
            )}
            <tr className="bg-[#525252] text-white font-bold">
              <td className="py-3 px-4">TOTAL PASSIF</td>
              <td className="py-3 px-4 text-right">{formatCurrency(bilan.passif.totalPassif)}</td>
              {showComparison && previousBilan && (
                <>
                  <td className="py-3 px-4 text-right">{formatCurrency(previousBilan.passif.totalPassif)}</td>
                  <td className="py-3 px-4 text-right" colSpan={2}></td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};