import React from 'react';
import { CompteResultat } from '../types/financialStatements.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface CompteResultatTableProps {
  compteResultat: CompteResultat;
  loading?: boolean;
  previousCR?: CompteResultat;
  showComparison?: boolean;
}

export const CompteResultatTable: React.FC<CompteResultatTableProps> = ({
  compteResultat: cr,
  loading,
  previousCR,
  showComparison = false,
}) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-[#F5F5F5] rounded" />
        ))}
      </div>
    );
  }

  const calculateVariation = (current: number, previous?: number) => {
    if (!previous || !showComparison) return null;
    const variation = current - previous;
    const variationPercent = previous !== 0 ? (variation / previous) * 100 : 0;
    return { variation, variationPercent };
  };

  const renderLine = (
    label: string,
    current: number,
    previous?: number,
    isBold = false,
    isSection = false,
    indent = 0
  ) => {
    const variation = calculateVariation(current, previous);

    return (
      <tr
        className={`${
          isSection
            ? 'bg-[#7A99AC] text-white font-semibold'
            : isBold
            ? 'font-semibold bg-[#F5F5F5]'
            : 'hover:bg-[#FAFAFA]'
        }`}
      >
        <td
          className={`py-3 px-4 ${!isSection && 'border-b border-[#D9D9D9]'}`}
          style={{ paddingLeft: `${16 + indent * 16}px` }}
        >
          {label}
        </td>
        <td className={`py-3 px-4 text-right ${!isSection && 'border-b border-[#D9D9D9]'}`}>
          {formatCurrency(current)}
        </td>
        {showComparison && previous !== undefined && (
          <>
            <td className={`py-3 px-4 text-right ${!isSection && 'border-b border-[#D9D9D9]'}`}>
              {formatCurrency(previous)}
            </td>
            <td className={`py-3 px-4 text-right ${!isSection && 'border-b border-[#D9D9D9]'}`}>
              {variation && (
                <span className={variation.variation >= 0 ? 'text-[#6A8A82]' : 'text-[#B85450]'}>
                  {variation.variation >= 0 ? '+' : ''}
                  {formatCurrency(variation.variation)}
                </span>
              )}
            </td>
            <td className={`py-3 px-4 text-right ${!isSection && 'border-b border-[#D9D9D9]'}`}>
              {variation && (
                <span className={variation.variationPercent >= 0 ? 'text-[#6A8A82]' : 'text-[#B85450]'}>
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
    <div className="bg-white rounded-lg border border-[#D9D9D9] overflow-hidden">
      <div className="bg-[#6A8A82] text-white py-3 px-4">
        <h3 className="text-lg font-semibold">COMPTE DE RÉSULTAT</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F5F5F5] text-sm">
            <th className="py-2 px-4 text-left">Rubrique</th>
            <th className="py-2 px-4 text-right">{cr.exercice}</th>
            {showComparison && previousCR && (
              <>
                <th className="py-2 px-4 text-right">{previousCR.exercice}</th>
                <th className="py-2 px-4 text-right">Variation</th>
                <th className="py-2 px-4 text-right">%</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="text-sm">
          {renderLine('PRODUITS D\'EXPLOITATION', cr.totalProduitsExploitation, previousCR?.totalProduitsExploitation, false, true, 0)}
          {renderLine('Chiffre d\'Affaires', cr.chiffreAffaires, previousCR?.chiffreAffaires, false, false, 1)}
          {renderLine('Production Vendue', cr.productionVendue, previousCR?.productionVendue, false, false, 1)}
          {renderLine('Production Stockée', cr.productionStockee, previousCR?.productionStockee, false, false, 1)}
          {renderLine('Subventions d\'Exploitation', cr.subventionsExploitation, previousCR?.subventionsExploitation, false, false, 1)}
          {renderLine('Autres Produits', cr.autresProduitsExploitation, previousCR?.autresProduitsExploitation, false, false, 1)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('CHARGES D\'EXPLOITATION', cr.totalChargesExploitation, previousCR?.totalChargesExploitation, false, true, 0)}
          {renderLine('Achats Consommés', cr.achatsConsommes, previousCR?.achatsConsommes, false, false, 1)}
          {renderLine('Services Extérieurs', cr.servicesExterieurs, previousCR?.servicesExterieurs, false, false, 1)}
          {renderLine('Charges de Personnel', cr.chargesPersonnel, previousCR?.chargesPersonnel, false, false, 1)}
          {renderLine('Dotations aux Amortissements', cr.dotationsAmortissements, previousCR?.dotationsAmortissements, false, false, 1)}
          {renderLine('Autres Charges', cr.autresChargesExploitation, previousCR?.autresChargesExploitation, false, false, 1)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('RÉSULTAT D\'EXPLOITATION', cr.resultatExploitation, previousCR?.resultatExploitation, true, false, 0)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('Produits Financiers', cr.produitsFinanciers, previousCR?.produitsFinanciers, false, false, 1)}
          {renderLine('Charges Financières', cr.chargesFinancieres, previousCR?.chargesFinancieres, false, false, 1)}
          {renderLine('RÉSULTAT FINANCIER', cr.resultatFinancier, previousCR?.resultatFinancier, true, false, 0)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('RÉSULTAT COURANT', cr.resultatCourant, previousCR?.resultatCourant, true, false, 0)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('Produits Exceptionnels', cr.produitsExceptionnels, previousCR?.produitsExceptionnels, false, false, 1)}
          {renderLine('Charges Exceptionnelles', cr.chargesExceptionnelles, previousCR?.chargesExceptionnelles, false, false, 1)}
          {renderLine('RÉSULTAT EXCEPTIONNEL', cr.resultatExceptionnel, previousCR?.resultatExceptionnel, true, false, 0)}

          <tr className="h-4"><td colSpan={showComparison ? 5 : 2}></td></tr>

          {renderLine('Impôts sur les Sociétés', cr.impotsSocietes, previousCR?.impotsSocietes, false, false, 1)}

          <tr className="bg-[#6A8A82] text-white font-bold">
            <td className="py-3 px-4">RÉSULTAT NET</td>
            <td className="py-3 px-4 text-right">{formatCurrency(cr.resultatNet)}</td>
            {showComparison && previousCR && (
              <>
                <td className="py-3 px-4 text-right">{formatCurrency(previousCR.resultatNet)}</td>
                <td className="py-3 px-4 text-right" colSpan={2}></td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};