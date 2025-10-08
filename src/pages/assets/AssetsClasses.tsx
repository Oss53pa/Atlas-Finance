import React, { useState } from 'react'; // Palette WiseBook appliquée
import {
  Layers, Search, Plus, Edit2, Settings, BarChart3,
  TrendingUp, DollarSign, Activity, Info, ChevronDown,
  Building, Computer, Car, Package, FileText, Shield
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';

const AssetsClasses: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');

  const assetClasses = [
    {
      code: '20',
      name: 'Immobilisations incorporelles',
      description: 'Actifs non monétaires sans substance physique',
      accounts: [
        { code: '201', name: 'Frais d\'établissement', balance: 15000 },
        { code: '203', name: 'Frais de recherche et développement', balance: 85000 },
        { code: '205', name: 'Concessions et droits similaires', balance: 45000 },
        { code: '207', name: 'Fonds commercial', balance: 120000 },
        { code: '208', name: 'Autres immobilisations incorporelles', balance: 35000 }
      ],
      totalValue: 300000,
      count: 45,
      depreciationRate: '20-33%',
      icon: FileText,
      color: 'purple'
    },
    {
      code: '21',
      name: 'Immobilisations corporelles',
      description: 'Actifs physiques détenus pour l\'usage ou la location',
      accounts: [
        { code: '211', name: 'Terrains', balance: 800000 },
        { code: '212', name: 'Agencements et aménagements de terrains', balance: 150000 },
        { code: '213', name: 'Constructions', balance: 1200000 },
        { code: '215', name: 'Installations techniques', balance: 350000 },
        { code: '218', name: 'Autres immobilisations corporelles', balance: 250000 }
      ],
      totalValue: 2750000,
      count: 280,
      depreciationRate: '2-20%',
      icon: Building,
      color: 'blue'
    },
    {
      code: '22',
      name: 'Immobilisations mises en concession',
      description: 'Actifs mis à disposition dans le cadre de concessions',
      accounts: [
        { code: '221', name: 'Terrains en concession', balance: 200000 },
        { code: '223', name: 'Constructions en concession', balance: 450000 },
        { code: '225', name: 'Installations en concession', balance: 180000 },
        { code: '228', name: 'Autres immobilisations en concession', balance: 70000 }
      ],
      totalValue: 900000,
      count: 35,
      depreciationRate: '5-10%',
      icon: Shield,
      color: 'green'
    },
    {
      code: '23',
      name: 'Immobilisations en cours',
      description: 'Actifs en cours de production ou d\'acquisition',
      accounts: [
        { code: '231', name: 'Immobilisations corporelles en cours', balance: 450000 },
        { code: '232', name: 'Immobilisations incorporelles en cours', balance: 120000 },
        { code: '237', name: 'Avances et acomptes', balance: 80000 },
        { code: '238', name: 'Autres immobilisations en cours', balance: 50000 }
      ],
      totalValue: 700000,
      count: 18,
      depreciationRate: 'N/A',
      icon: Package,
      color: 'orange'
    },
    {
      code: '24',
      name: 'Matériel de transport',
      description: 'Véhicules et moyens de transport',
      accounts: [
        { code: '241', name: 'Véhicules industriels', balance: 280000 },
        { code: '242', name: 'Véhicules de tourisme', balance: 180000 },
        { code: '244', name: 'Matériel de manutention', balance: 120000 },
        { code: '248', name: 'Autres matériels de transport', balance: 70000 }
      ],
      totalValue: 650000,
      count: 42,
      depreciationRate: '20-25%',
      icon: Car,
      color: 'red'
    },
    {
      code: '25',
      name: 'Matériel informatique',
      description: 'Équipements informatiques et technologiques',
      accounts: [
        { code: '251', name: 'Serveurs et infrastructure', balance: 320000 },
        { code: '252', name: 'Postes de travail', balance: 180000 },
        { code: '253', name: 'Périphériques', balance: 85000 },
        { code: '254', name: 'Logiciels', balance: 145000 },
        { code: '258', name: 'Autres matériels informatiques', balance: 70000 }
      ],
      totalValue: 800000,
      count: 195,
      depreciationRate: '33%',
      icon: Computer,
      color: 'indigo'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      purple: { bg: 'bg-[#B87333]/10', text: 'text-[#B87333]', border: 'border-[#B87333]/20' },
      blue: { bg: 'bg-[#6A8A82]/10', text: 'text-[#6A8A82]', border: 'border-[#6A8A82]/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
      indigo: { bg: 'bg-[#5A7A72]/10', text: 'text-[#5A7A72]', border: 'border-[#5A7A72]/20' }
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
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
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
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)]'
                }`}
              >
                Vue grille
              </button>
              <button
                onClick={() => setActiveView('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
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
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">6</p>
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
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">27</p>
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
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">€6.1M</p>
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
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">615</p>
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
                      <button className="p-1 hover:bg-[var(--color-background-subtle)] rounded" aria-label="Modifier">
                        <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {assetClass.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Valeur totale</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          €{(assetClass.totalValue / 1000000).toFixed(2)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Actifs</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {assetClass.count}
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
                                €{(account.balance / 1000).toFixed(0)}K
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
                        <td className="py-3 px-4 text-sm text-center">{assetClass.count}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          €{(assetClass.totalValue / 1000000).toFixed(2)}M
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                            {assetClass.depreciationRate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1 hover:bg-[var(--color-background)] rounded" aria-label="Information">
                              <Info className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                            <button className="p-1 hover:bg-[var(--color-background)] rounded" aria-label="Modifier">
                              <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
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