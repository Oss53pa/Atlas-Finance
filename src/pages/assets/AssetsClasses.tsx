
import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Search, Plus, Edit2, Settings, BarChart3,
  TrendingUp, DollarSign, Activity, Info, ChevronDown,
  Building, Computer, Car, Package, FileText, Shield
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { useData } from '../../contexts/DataContext';
import { formatCompactCurrency } from '../../utils/formatters';

// SYSCOHADA class definitions (reference structure — values come from data)
// Classes SYSCOHADA OFFICIELLES (les anciens libellés étaient faux : 21≠corporelles,
// 22≠concession, 23=Bâtiments — c'est là que vit la construction PLAZA, 25≠informatique).
// Les sous-comptes affichés sont dérivés DYNAMIQUEMENT des écritures réelles.
const CLASS_DEFS = [
  { code: '20', name: 'Charges immobilisées', description: 'Frais d\'établissement et charges à répartir', icon: FileText, color: 'primary', accountDefs: [] as Array<{ code: string; name: string }> },
  { code: '21', name: 'Immobilisations incorporelles', description: 'Brevets, licences, logiciels, fonds commercial', icon: FileText, color: 'blue', accountDefs: [] },
  { code: '22', name: 'Terrains', description: 'Terrains bâtis et non bâtis', icon: Building, color: 'green', accountDefs: [] },
  { code: '23', name: 'Bâtiments, installations et agencements', description: 'Constructions, installations techniques, agencements', icon: Building, color: 'orange', accountDefs: [] },
  { code: '24', name: 'Matériel, mobilier et transport', description: 'Matériel et outillage industriel, mobilier, véhicules', icon: Car, color: 'red', accountDefs: [] },
  { code: '25', name: 'Avances et acomptes sur immobilisations', description: 'Avances et acomptes versés sur commandes d\'immobilisations', icon: Package, color: 'primary', accountDefs: [] },
  { code: '26', name: 'Titres de participation', description: 'Participations et créances rattachées', icon: Shield, color: 'blue', accountDefs: [] },
  { code: '27', name: 'Autres immobilisations financières', description: 'Prêts, dépôts et cautionnements', icon: Computer, color: 'green', accountDefs: [] },
];

const AssetsClasses: React.FC = () => {
  const { adapter } = useData();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [dbEntries, setDbEntries] = useState<any[]>([]);

  // Load data from adapter
  useEffect(() => {
    if (!adapter) return;
    Promise.all([
      adapter.getAll('assets').catch(() => []),
      adapter.getAll('journalEntries').catch(() => []),
    ]).then(([assets, entries]) => {
      setDbAssets(assets || []);
      setDbEntries(entries || []);
    });
  }, [adapter]);

  // Build classes from real data
  const assetClasses = useMemo(() => {
    // Solde RÉEL par compte de classe 2 (TOUS les sous-comptes, pas une liste
    // figée) — sinon des comptes comme 235xxx (STRUCTURE, CHARPENTE…) étaient
    // ignorés et la valeur de la classe était fortement sous-évaluée.
    const balByCode: Record<string, { balance: number; name: string }> = {};
    for (const entry of dbEntries) {
      if ((entry as any).status === 'draft') continue;
      for (const line of ((entry as any).lines || [])) {
        const code = String(line.accountCode || '');
        if (!/^2/.test(code)) continue;
        if (!balByCode[code]) balByCode[code] = { balance: 0, name: line.accountName || code };
        balByCode[code].balance += (line.debit || 0) - (line.credit || 0);
      }
    }

    return CLASS_DEFS.map(def => {
      // Détail = sous-comptes RÉELS de la classe (drill-down), triés par solde.
      const accounts = Object.entries(balByCode)
        .filter(([code]) => code.startsWith(def.code))
        .map(([code, v]) => ({ code, name: v.name, balance: v.balance }))
        .sort((a, b) => b.balance - a.balance);

      const classAssets = dbAssets.filter(a => String((a as any).accountCode || (a as any).category || '').startsWith(def.code));

      const totalValue = accounts.reduce((s, a) => s + a.balance, 0);
      // Amortissements cumulés de la classe : comptes 28X (28 + 2e chiffre de la classe),
      // ex. classe 23 -> 283x. Solde créditeur => montant positif d'amortissement.
      const amortPrefix = '28' + def.code.charAt(1);
      let cumulAmort = 0;
      for (const [code, v] of Object.entries(balByCode)) {
        if (code.startsWith(amortPrefix)) cumulAmort += -v.balance;
      }
      const netValue = totalValue - cumulAmort; // VNC = brut - amortissements
      const count = accounts.filter(a => Math.abs(a.balance) > 0.001).length;
      const avgRate = classAssets.length > 0
        ? classAssets.reduce((s, a) => s + (a.usefulLife > 0 ? 100 / a.usefulLife : 0), 0) / classAssets.length
        : 0;

      return {
        code: def.code,
        name: def.name,
        description: def.description,
        accounts,
        totalValue: totalValue || classAssets.reduce((s, a) => s + (a.acquisitionValue || 0), 0),
        cumulAmort,
        netValue: (totalValue ? netValue : classAssets.reduce((s, a) => s + ((a.acquisitionValue || 0) - (a.cumulDepreciation || 0)), 0)),
        // Comptes = comptes GL mouvementés de la classe ; Actifs = NOMBRE DE BIENS du
        // registre (la confusion des deux faisait afficher 39 "actifs" au lieu de 333).
        count,
        assetCount: classAssets.length,
        depreciationRate: avgRate > 0 ? `${avgRate.toFixed(0)}%` : '—',
        icon: def.icon,
        color: def.color,
      };
    });
  }, [dbAssets, dbEntries]);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: 'bg-[var(--color-text-secondary)]/10', text: 'text-[var(--color-text-secondary)]', border: 'border-[var(--color-text-secondary)]/20' },
      blue: { bg: 'bg-[var(--color-primary)]/10', text: 'text-[var(--color-primary)]', border: 'border-[var(--color-primary)]/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' }
    };
    return colors[color] || colors.blue;
  };

  const filteredClasses = assetClasses.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.code.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            Classes Comptables d'Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Plan comptable et classification des actifs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            Configuration
          </ModernButton>
          <ModernButton variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle classe
          </ModernButton>
        </div>
      </div>

      {/* Search and View Toggle */}
      <ModernCard>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher par code ou nom de classe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'grid'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]'
                }`}
              >
                Vue grille
              </button>
              <button
                onClick={() => setActiveView('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]'
                }`}
              >
                Vue tableau
              </button>
            </div>
          </div>
        </CardBody>
      </ModernCard>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total classes</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{assetClasses.length}</p>
              </div>
              <Layers className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Comptes actifs</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{assetClasses.reduce((s, c) => s + c.accounts.filter(a => a.balance !== 0).length, 0)}</p>
              </div>
              <Activity className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Valeur totale</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(assetClasses.reduce((s, c) => s + c.totalValue, 0))}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Actifs liés</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{assetClasses.reduce((s, c) => s + c.count, 0)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Classes Grid/Table */}
      {activeView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((assetClass) => {
            const colors = getColorClasses(assetClass.color);
            const Icon = assetClass.icon;

            return (
              <ModernCard
                key={assetClass.code}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedClass === assetClass.code ? 'ring-2 ring-blue-500/20' : ''
                }`}
                onClick={() => setSelectedClass(assetClass.code)}
              >
                <CardBody>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            Classe {assetClass.code}
                          </h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            {assetClass.name}
                          </p>
                        </div>
                      </div>
                      {/* Crayon sans fonction retiré — classes SYSCOHADA normatives. */}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {assetClass.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Valeur brute</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {formatCompactCurrency(assetClass.totalValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Actifs</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {assetClass.assetCount}
                        </p>
                      </div>
                    </div>

                    {/* Amortissements cumulés + Valeur Nette Comptable */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--color-border)]">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Amort. cumulés</p>
                        <p className="font-medium text-red-500">
                          {formatCompactCurrency(assetClass.cumulAmort)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Valeur nette (VNC)</p>
                        <p className={`font-semibold ${colors.text}`}>
                          {formatCompactCurrency(assetClass.netValue)}
                        </p>
                      </div>
                    </div>

                    {/* Depreciation Rate */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                      <span className="text-xs text-[var(--color-text-secondary)]">Taux d'amortissement</span>
                      <span className={`text-sm font-medium ${colors.text}`}>
                        {assetClass.depreciationRate}
                      </span>
                    </div>

                    {/* Accounts Preview */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>Comptes ({assetClass.accounts.length})</span>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                      {selectedClass === assetClass.code && (
                        <div className="mt-2 space-y-1">
                          {assetClass.accounts.slice(0, 3).map((account) => (
                            <div
                              key={account.code}
                              className="flex items-center justify-between p-2 bg-[var(--color-background-subtle)] rounded text-xs"
                            >
                              <span className="text-[var(--color-text-secondary)]">
                                {account.code} - {account.name}
                              </span>
                              <span className="font-medium text-[var(--color-text-primary)]">
                                {formatCompactCurrency(account.balance)}
                              </span>
                            </div>
                          ))}
                          {assetClass.accounts.length > 3 && (
                            <p className="text-xs text-center text-[var(--color-text-secondary)] pt-1">
                              +{assetClass.accounts.length - 3} autres comptes
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </ModernCard>
            );
          })}
        </div>
      ) : (
        <ModernCard>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Classe</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Description</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Comptes</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Actifs</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Valeur</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Taux amort.</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((assetClass) => {
                    const Icon = assetClass.icon;
                    const colors = getColorClasses(assetClass.color);

                    return (
                      <tr
                        key={assetClass.code}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] transition-colors cursor-pointer"
                        onClick={() => setSelectedClass(assetClass.code)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${colors.text}`} />
                            </div>
                            <span className="font-mono text-sm">{assetClass.code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{assetClass.name}</td>
                        <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                          {assetClass.description}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">{assetClass.accounts.length}</td>
                        <td className="py-3 px-4 text-sm text-center font-medium">{assetClass.assetCount}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCompactCurrency(assetClass.totalValue)}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                            {assetClass.depreciationRate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {/* Action réelle : afficher le détail des sous-comptes (le crayon
                                sans fonction a été retiré — classes SYSCOHADA normatives). */}
                            <button
                              className="p-1 hover:bg-[var(--color-background)] rounded"
                              aria-label="Voir le détail des comptes"
                              title="Voir le détail des comptes"
                              onClick={(e) => { e.stopPropagation(); setSelectedClass(selectedClass === assetClass.code ? null : assetClass.code); setActiveView('grid'); }}
                            >
                              <Info className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </ModernCard>
      )}
    </div>
  );
};

export default AssetsClasses;